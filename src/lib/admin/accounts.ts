import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import {
  adminAuditEvents,
  assignments,
  classrooms,
  grades,
  students,
  submissions,
  users,
  type AdminAuditState,
  type NewUser,
} from '@/db/schema';
import type { AdminPrincipal } from '@/lib/admin/auth';
import type { AdminAccountAction, AdminAccountQuery } from '@/lib/validations';
import { captureOperationalError, recordSystemEvent } from '@/lib/operations/system-events';
import { stripHtml } from '@/lib/utils';

export class AdminAccountError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

const accountSelection = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  accountPlan: users.accountPlan,
  accountStatus: users.accountStatus,
  submissionCredits: users.submissionCredits,
  monthlySubmissionQuota: users.monthlySubmissionQuota,
  suspendedAt: users.suspendedAt,
  suspendedReason: users.suspendedReason,
  createdAt: users.createdAt,
};

export async function getAdminAccounts(query: AdminAccountQuery) {
  const filters: SQL[] = [];
  if (query.q) {
    const search = `%${query.q.replace(/[%_]/g, '\\$&')}%`;
    const searchFilter = or(ilike(users.name, search), ilike(users.email, search));
    if (searchFilter) filters.push(searchFilter);
  }
  if (query.status !== 'all') filters.push(eq(users.accountStatus, query.status));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select(accountSelection)
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    db.select({ value: count() }).from(users).where(where),
  ]);

  const totalItems = Number(totalRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.limit));
  return {
    users: rows.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      suspendedAt: user.suspendedAt?.toISOString() ?? null,
    })),
    pagination: {
      page: Math.min(query.page, totalPages),
      limit: query.limit,
      totalItems,
      totalPages,
    },
    filters: query,
  };
}

export async function getAdminAccountDetails(userId: string) {
  const account = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!account) throw new AdminAccountError('User not found', 404, 'NOT_FOUND');

  const [classroomRows, assignmentRows, auditRows, clerkUser] = await Promise.all([
    db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        subject: classrooms.subject,
        grade: classrooms.grade,
        students: sql<number>`count(distinct ${students.id})`,
        assignments: sql<number>`count(distinct ${assignments.id})`,
        createdAt: classrooms.createdAt,
      })
      .from(classrooms)
      .leftJoin(students, eq(students.classroomId, classrooms.id))
      .leftJoin(assignments, eq(assignments.classroomId, classrooms.id))
      .where(eq(classrooms.teacherId, userId))
      .groupBy(classrooms.id)
      .orderBy(desc(classrooms.createdAt)),
    db
      .select({
        id: assignments.id,
        title: assignments.title,
        subject: assignments.subject,
        status: assignments.status,
        maxScore: assignments.maxScore,
        classroomName: classrooms.name,
        submissions: count(submissions.id),
        graded: sql<number>`count(*) filter (where ${grades.id} is not null)`,
        createdAt: assignments.createdAt,
      })
      .from(assignments)
      .innerJoin(classrooms, eq(assignments.classroomId, classrooms.id))
      .leftJoin(submissions, eq(submissions.assignmentId, assignments.id))
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .where(eq(assignments.teacherId, userId))
      .groupBy(assignments.id, classrooms.name)
      .orderBy(desc(assignments.createdAt))
      .limit(100),
    db
      .select()
      .from(adminAuditEvents)
      .where(and(eq(adminAuditEvents.targetType, 'user'), eq(adminAuditEvents.targetId, userId)))
      .orderBy(desc(adminAuditEvents.createdAt))
      .limit(100),
    (async () => {
      try {
        const client = await clerkClient();
        return await client.users.getUser(userId);
      } catch {
        return null;
      }
    })(),
  ]);

  return {
    user: {
      ...account,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      suspendedAt: account.suspendedAt?.toISOString() ?? null,
      clerkBanned: clerkUser?.banned ?? null,
      clerkLocked: clerkUser?.locked ?? null,
    },
    classrooms: classroomRows.map((row) => ({
      ...row,
      students: Number(row.students),
      assignments: Number(row.assignments),
      createdAt: row.createdAt.toISOString(),
    })),
    assignments: assignmentRows.map((row) => ({
      ...row,
      submissions: Number(row.submissions),
      graded: Number(row.graded),
      createdAt: row.createdAt.toISOString(),
    })),
    auditLog: auditRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

function accountAuditState(user: typeof users.$inferSelect): AdminAuditState {
  return {
    accountPlan: user.accountPlan,
    accountStatus: user.accountStatus,
    submissionCredits: user.submissionCredits,
    monthlySubmissionQuota: user.monthlySubmissionQuota,
    suspended: user.suspendedAt !== null,
  };
}

export async function performAdminAccountAction(
  admin: AdminPrincipal,
  targetUserId: string,
  action: AdminAccountAction
) {
  const target = await db.query.users.findFirst({ where: eq(users.id, targetUserId) });
  if (!target) throw new AdminAccountError('User not found', 404, 'NOT_FOUND');
  if (targetUserId === admin.userId && action.action === 'suspend') {
    throw new AdminAccountError('You cannot suspend your own administrator account', 400, 'SELF_SUSPEND');
  }

  const reason = stripHtml(action.reason);
  const beforeState = accountAuditState(target);
  const update: Partial<NewUser> = { updatedAt: new Date() };
  let clerkAction: 'ban' | 'unban' | null = null;

  switch (action.action) {
    case 'suspend':
      if (target.accountStatus === 'suspended') {
        throw new AdminAccountError('Account is already suspended', 409, 'ALREADY_SUSPENDED');
      }
      update.accountStatus = 'suspended';
      update.suspendedAt = new Date();
      update.suspendedReason = reason;
      clerkAction = 'ban';
      break;
    case 'reinstate':
      if (target.accountStatus === 'active') {
        throw new AdminAccountError('Account is already active', 409, 'ALREADY_ACTIVE');
      }
      update.accountStatus = 'active';
      update.suspendedAt = null;
      update.suspendedReason = null;
      clerkAction = 'unban';
      break;
    case 'adjust_credits': {
      const nextCredits = target.submissionCredits + action.delta;
      if (nextCredits < 0) {
        throw new AdminAccountError('Credit adjustment cannot produce a negative balance', 400, 'NEGATIVE_CREDITS');
      }
      update.submissionCredits = nextCredits;
      break;
    }
    case 'set_quota':
      update.monthlySubmissionQuota = action.monthlyQuota;
      break;
    case 'set_plan':
      update.accountPlan = action.plan;
      break;
  }

  const nextState: AdminAuditState = {
    ...beforeState,
    accountPlan: update.accountPlan ?? target.accountPlan,
    accountStatus: update.accountStatus ?? target.accountStatus,
    submissionCredits: update.submissionCredits ?? target.submissionCredits,
    monthlySubmissionQuota:
      update.monthlySubmissionQuota === undefined
        ? target.monthlySubmissionQuota
        : update.monthlySubmissionQuota,
    suspended:
      update.suspendedAt === undefined ? target.suspendedAt !== null : update.suspendedAt !== null,
  };

  let clerkChanged = false;
  try {
    if (clerkAction) {
      const client = await clerkClient();
      if (clerkAction === 'ban') await client.users.banUser(targetUserId);
      else await client.users.unbanUser(targetUserId);
      clerkChanged = true;
    }

    const [updatedRows] = await db.batch([
      db.update(users).set(update).where(eq(users.id, targetUserId)).returning(accountSelection),
      db.insert(adminAuditEvents).values({
        actorUserId: admin.userId,
        action: action.action,
        targetType: 'user',
        targetId: targetUserId,
        reason,
        beforeState,
        afterState: nextState,
      }),
    ]);

    return updatedRows[0];
  } catch (error) {
    if (clerkChanged && clerkAction) {
      try {
        const client = await clerkClient();
        if (clerkAction === 'ban') await client.users.unbanUser(targetUserId);
        else await client.users.banUser(targetUserId);
      } catch (compensationError) {
        captureOperationalError(compensationError, {
          category: 'auth',
          code: 'CLERK_COMPENSATION_FAILED',
          entityType: 'user',
          entityId: targetUserId,
        });
      }
    }

    await recordSystemEvent({
      category: 'auth',
      severity: 'error',
      code: 'ADMIN_ACCOUNT_ACTION_FAILED',
      message: 'An owner account action failed before completion.',
      userId: admin.userId,
      entityType: 'user',
      entityId: targetUserId,
      metadata: { action: action.action },
    });
    throw error;
  }
}
