import 'server-only';

import { clerkClient } from '@clerk/nextjs/server';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assignments, students, submissions, systemEvents } from '@/db/schema';

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number | null;
  detail: string;
}

export interface AdminHealthOverview {
  status: 'healthy' | 'degraded' | 'down';
  checkedAt: string;
  services: ServiceHealth[];
  backlog: {
    queueMode: 'in-request';
    pending: number;
    grading: number;
    failed: number;
    assignmentsGrading: number;
  };
  recentEvents: Array<{
    id: string;
    category: string;
    severity: string;
    code: string;
    message: string;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
  failedSubmissions: Array<{
    id: string;
    teacherId: string;
    assignmentId: string;
    assignmentTitle: string;
    studentName: string;
    submittedAt: string;
  }>;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Health check timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function checkService(
  name: string,
  check: () => Promise<void>,
  healthyDetail: string
): Promise<ServiceHealth> {
  const startedAt = Date.now();
  try {
    await withTimeout(check(), 5_000);
    return {
      name,
      status: 'healthy',
      latencyMs: Date.now() - startedAt,
      detail: healthyDetail,
    };
  } catch {
    return {
      name,
      status: 'down',
      latencyMs: Date.now() - startedAt,
      detail: `${name} probe failed. Check deployment configuration and provider status.`,
    };
  }
}

export async function getAdminHealthOverview(): Promise<AdminHealthOverview> {
  const [database, clerk] = await Promise.all([
    checkService('Neon database', async () => {
      await db.execute(sql`select 1 as ok`);
    }, 'Connection and query probe passed.'),
    checkService('Clerk authentication', async () => {
      const client = await clerkClient();
      await client.users.getUserList({ limit: 1 });
    }, 'Backend API and active instance credentials responded.'),
  ]);

  const anthropic: ServiceHealth = process.env.ANTHROPIC_API_KEY
    ? {
        name: 'Anthropic grading',
        status: 'healthy',
        latencyMs: null,
        detail: `Credentials present; model ${process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'}.`,
      }
    : {
        name: 'Anthropic grading',
        status: 'down',
        latencyMs: null,
        detail: 'ANTHROPIC_API_KEY is missing.',
      };

  const googleConfigured = Boolean(
    process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET
  );
  const google: ServiceHealth = {
    name: 'Google integration',
    status: googleConfigured ? 'healthy' : 'degraded',
    latencyMs: null,
    detail: googleConfigured
      ? 'OAuth client credentials are present; user token health is checked during sync.'
      : 'Google OAuth credentials are incomplete.',
  };

  let backlog = {
    queueMode: 'in-request' as const,
    pending: 0,
    grading: 0,
    failed: 0,
    assignmentsGrading: 0,
  };
  let recentEvents: AdminHealthOverview['recentEvents'] = [];
  let failedSubmissions: AdminHealthOverview['failedSubmissions'] = [];

  if (database.status === 'healthy') {
    const [backlogRows, eventRows, failedRows] = await Promise.all([
      db
        .select({
          pending: sql<number>`count(*) filter (where ${submissions.status} = 'pending')`,
          grading: sql<number>`count(*) filter (where ${submissions.status} = 'grading')`,
          failed: sql<number>`count(*) filter (where ${submissions.status} = 'error')`,
          assignmentsGrading: sql<number>`(
            select count(*) from ${assignments} where ${assignments.status} = 'grading'
          )`,
        })
        .from(submissions)
        .where(isNull(submissions.removedAt)),
      db
        .select({
          id: systemEvents.id,
          category: systemEvents.category,
          severity: systemEvents.severity,
          code: systemEvents.code,
          message: systemEvents.message,
          entityType: systemEvents.entityType,
          entityId: systemEvents.entityId,
          createdAt: systemEvents.createdAt,
        })
        .from(systemEvents)
        .where(sql`${systemEvents.severity} in ('warning', 'error')`)
        .orderBy(desc(systemEvents.createdAt))
        .limit(50),
      db
        .select({
          id: submissions.id,
          teacherId: assignments.teacherId,
          assignmentId: assignments.id,
          assignmentTitle: assignments.title,
          studentName: students.name,
          submittedAt: submissions.submittedAt,
        })
        .from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .innerJoin(students, eq(submissions.studentId, students.id))
        .where(and(eq(submissions.status, 'error'), isNull(submissions.removedAt)))
        .orderBy(desc(submissions.submittedAt))
        .limit(25),
    ]);

    const counts = backlogRows[0];
    backlog = {
      queueMode: 'in-request',
      pending: Number(counts?.pending ?? 0),
      grading: Number(counts?.grading ?? 0),
      failed: Number(counts?.failed ?? 0),
      assignmentsGrading: Number(counts?.assignmentsGrading ?? 0),
    };
    recentEvents = eventRows.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    }));
    failedSubmissions = failedRows.map((submission) => ({
      ...submission,
      submittedAt: submission.submittedAt.toISOString(),
    }));
  }

  const services = [database, clerk, anthropic, google];
  const status = services.some((service) => service.status === 'down')
    ? 'down'
    : services.some((service) => service.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  return {
    status,
    checkedAt: new Date().toISOString(),
    services,
    backlog,
    recentEvents,
    failedSubmissions,
  };
}
