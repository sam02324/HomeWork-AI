import 'server-only';

import { count, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  adminAuditEvents,
  assignments,
  contentReports,
  students,
  submissions,
  systemEvents,
  users,
  type AdminAuditState,
} from '@/db/schema';
import type { AdminPrincipal } from '@/lib/admin/auth';
import type { AdminModerationAction, AdminModerationQuery } from '@/lib/validations';
import { createSystemEventValue } from '@/lib/operations/system-events';
import { stripHtml } from '@/lib/utils';

export class AdminModerationError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}

export async function getAdminModerationOverview(query: AdminModerationQuery) {
  const where = query.status === 'all' ? undefined : eq(contentReports.status, query.status);
  const [rows, summaryRows] = await Promise.all([
    db
      .select({
        id: contentReports.id,
        category: contentReports.category,
        reason: contentReports.reason,
        status: contentReports.status,
        resolutionNote: contentReports.resolutionNote,
        createdAt: contentReports.createdAt,
        reviewedAt: contentReports.reviewedAt,
        reporterId: contentReports.reporterId,
        reporterName: users.name,
        reporterEmail: users.email,
        submissionId: contentReports.submissionId,
        fileType: submissions.fileType,
        textContent: submissions.textContent,
        removedAt: submissions.removedAt,
        removalReason: submissions.removalReason,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        studentName: students.name,
      })
      .from(contentReports)
      .leftJoin(users, eq(contentReports.reporterId, users.id))
      .leftJoin(submissions, eq(contentReports.submissionId, submissions.id))
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(students, eq(submissions.studentId, students.id))
      .where(where)
      .orderBy(desc(contentReports.createdAt))
      .limit(100),
    db
      .select({
        open: sql<number>`count(*) filter (where ${contentReports.status} = 'open')`,
        resolved: sql<number>`count(*) filter (where ${contentReports.status} = 'resolved')`,
        dismissed: sql<number>`count(*) filter (where ${contentReports.status} = 'dismissed')`,
        total: count(),
      })
      .from(contentReports),
  ]);

  const summary = summaryRows[0];
  return {
    reports: rows.map((row) => ({
      ...row,
      textPreview: row.textContent ? stripHtml(row.textContent).slice(0, 800) : null,
      textContent: undefined,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      removedAt: row.removedAt?.toISOString() ?? null,
    })),
    summary: {
      open: Number(summary?.open ?? 0),
      resolved: Number(summary?.resolved ?? 0),
      dismissed: Number(summary?.dismissed ?? 0),
      total: Number(summary?.total ?? 0),
    },
    filters: query,
  };
}

export async function performAdminModerationAction(
  admin: AdminPrincipal,
  reportId: string,
  action: AdminModerationAction
) {
  const report = await db.query.contentReports.findFirst({
    where: eq(contentReports.id, reportId),
    with: { submission: true },
  });
  if (!report) throw new AdminModerationError('Report not found', 404, 'NOT_FOUND');

  const reason = stripHtml(action.reason);
  const beforeState: AdminAuditState = {
    reportStatus: report.status,
    submissionRemoved: Boolean(report.submission?.removedAt),
  };
  const reportStatus = action.action === 'dismiss' ? 'dismissed' : 'resolved';
  const afterState: AdminAuditState = {
    reportStatus,
    submissionRemoved:
      action.action === 'remove'
        ? true
        : action.action === 'restore'
          ? false
          : beforeState.submissionRemoved,
  };
  const updateReport = db.update(contentReports)
    .set({
      status: reportStatus,
      reviewedBy: admin.userId,
      reviewedAt: new Date(),
      resolutionNote: reason,
    })
    .where(eq(contentReports.id, reportId))
    .returning();
  const audit = db.insert(adminAuditEvents).values({
    actorUserId: admin.userId,
    action: action.action,
    targetType: 'report',
    targetId: reportId,
    reason,
    beforeState,
    afterState,
  });
  const event = db.insert(systemEvents).values(createSystemEventValue({
    category: 'moderation',
    severity: 'info',
    code: `CONTENT_${action.action.toUpperCase()}`,
    message: `A content report was ${reportStatus}.`,
    userId: admin.userId,
    entityType: 'report',
    entityId: reportId,
    metadata: { action: action.action },
  }));

  if (action.action === 'remove' || action.action === 'restore') {
    if (!report.submissionId || !report.submission) {
      throw new AdminModerationError('The reported submission no longer exists', 409, 'SUBMISSION_MISSING');
    }
    if (action.action === 'remove' && report.submission.removedAt) {
      throw new AdminModerationError('Submission is already removed', 409, 'ALREADY_REMOVED');
    }
    if (action.action === 'restore' && !report.submission.removedAt) {
      throw new AdminModerationError('Submission is not removed', 409, 'NOT_REMOVED');
    }

    const submissionUpdate = action.action === 'remove'
      ? {
          removedAt: new Date(),
          removedBy: admin.userId,
          removalReason: reason,
        }
      : {
          removedAt: null,
          removedBy: null,
          removalReason: null,
        };

    const [reportRows] = await db.batch([
      updateReport,
      db.update(submissions)
        .set(submissionUpdate)
        .where(eq(submissions.id, report.submissionId)),
      audit,
      event,
    ]);
    return reportRows[0];
  }

  const [reportRows] = await db.batch([updateReport, audit, event]);
  return reportRows[0];
}
