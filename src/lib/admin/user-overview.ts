import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { count, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, classrooms, students, users } from '@/db/schema';
import { normalizeAppRole, type AppRole } from '@/lib/auth/roles';
import type { AdminUserQuery } from '@/lib/validations';

export type AccountPlan = 'unassigned' | 'subscription' | 'pay_per_submission';

export interface AdminUserOverview {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  plan: AccountPlan;
  createdAt: string;
  lastActiveAt: string | null;
  counts: {
    classrooms: number;
    students: number;
    assignments: number;
  };
}

export interface AdminUserOverviewResult {
  users: AdminUserOverview[];
  summary: {
    totalUsers: number;
    activeLast30Days: number;
    subscriptionUsers: number;
    payPerSubmissionUsers: number;
    unassignedUsers: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  };
  filters: AdminUserQuery;
}

const CLERK_BATCH_SIZE = 100;
const MAX_CLERK_USERS = 10_000;

async function listAllClerkUsers() {
  const client = await clerkClient();
  const result = [];
  let offset = 0;
  let totalCount = 0;

  do {
    const page = await client.users.getUserList({
      limit: CLERK_BATCH_SIZE,
      offset,
      orderBy: '-created_at',
    });

    result.push(...page.data);
    totalCount = page.totalCount;
    offset += page.data.length;

    if (page.data.length === 0) break;
  } while (offset < totalCount && offset < MAX_CLERK_USERS);

  if (totalCount > MAX_CLERK_USERS) {
    throw new Error(`Clerk user count exceeds the ${MAX_CLERK_USERS} user admin limit`);
  }

  return result;
}

function toCountMap(rows: Array<{ userId: string; value: number }>) {
  return new Map(rows.map((row) => [row.userId, Number(row.value)]));
}

export async function getAdminUserOverview(
  query: AdminUserQuery
): Promise<AdminUserOverviewResult> {
  // At MVP scale, one batched Clerk scan preserves complete identity/activity data
  // while Neon remains authoritative for GradeAI plan and aggregate usage fields.
  const clerkUsers = await listAllClerkUsers();
  const userIds = clerkUsers.map((user) => user.id);

  const [localUsers, classroomRows, studentRows, assignmentRows] = userIds.length
    ? await Promise.all([
        db
          .select({ id: users.id, accountPlan: users.accountPlan })
          .from(users)
          .where(inArray(users.id, userIds)),
        db
          .select({ userId: classrooms.teacherId, value: count() })
          .from(classrooms)
          .where(inArray(classrooms.teacherId, userIds))
          .groupBy(classrooms.teacherId),
        db
          .select({ userId: classrooms.teacherId, value: count(students.id) })
          .from(students)
          .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
          .where(inArray(classrooms.teacherId, userIds))
          .groupBy(classrooms.teacherId),
        db
          .select({ userId: assignments.teacherId, value: count() })
          .from(assignments)
          .where(inArray(assignments.teacherId, userIds))
          .groupBy(assignments.teacherId),
      ])
    : [[], [], [], []];

  const localUserMap = new Map(localUsers.map((user) => [user.id, user]));
  const classroomCountMap = toCountMap(classroomRows);
  const studentCountMap = toCountMap(studentRows);
  const assignmentCountMap = toCountMap(assignmentRows);

  const allUsers: AdminUserOverview[] = clerkUsers.map((user) => {
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId
    )?.emailAddress;
    const email = primaryEmail ?? user.emailAddresses[0]?.emailAddress ?? '';
    const name =
      [user.firstName, user.lastName].filter(Boolean).join(' ') ||
      user.username ||
      email.split('@')[0] ||
      'Unnamed user';

    return {
      id: user.id,
      name,
      email,
      role: normalizeAppRole(user.publicMetadata.role),
      plan: localUserMap.get(user.id)?.accountPlan ?? 'unassigned',
      createdAt: new Date(user.createdAt).toISOString(),
      lastActiveAt: user.lastActiveAt ? new Date(user.lastActiveAt).toISOString() : null,
      counts: {
        classrooms: classroomCountMap.get(user.id) ?? 0,
        students: studentCountMap.get(user.id) ?? 0,
        assignments: assignmentCountMap.get(user.id) ?? 0,
      },
    };
  });

  const activeCutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const summary = {
    totalUsers: allUsers.length,
    activeLast30Days: allUsers.filter(
      (user) => user.lastActiveAt && new Date(user.lastActiveAt).getTime() >= activeCutoff
    ).length,
    subscriptionUsers: allUsers.filter((user) => user.plan === 'subscription').length,
    payPerSubmissionUsers: allUsers.filter((user) => user.plan === 'pay_per_submission').length,
    unassignedUsers: allUsers.filter((user) => user.plan === 'unassigned').length,
  };

  const search = query.q.toLocaleLowerCase('en-IN');
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch =
      search.length === 0 ||
      user.name.toLocaleLowerCase('en-IN').includes(search) ||
      user.email.toLocaleLowerCase('en-IN').includes(search);
    const matchesPlan = query.plan === 'all' || user.plan === query.plan;
    const matchesRole = query.role === 'all' || user.role === query.role;
    return matchesSearch && matchesPlan && matchesRole;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / query.limit));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.limit;

  return {
    users: filteredUsers.slice(start, start + query.limit),
    summary,
    pagination: {
      page,
      limit: query.limit,
      totalItems: filteredUsers.length,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
    },
    filters: { ...query, page },
  };
}
