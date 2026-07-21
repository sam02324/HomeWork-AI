import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { adminAuditEvents, systemEvents } from '@/db/schema';
import type { AdminPrincipal } from '@/lib/admin/auth';
import { stripHtml } from '@/lib/utils';

export class AdminMonitoringError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
  }
}
function safeDashboardUrl(): string | null {
  const configured = process.env.SENTRY_DASHBOARD_URL;
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'https:' && (url.hostname === 'sentry.io' || url.hostname.endsWith('.sentry.io'))) {
        return url.toString();
      }
    } catch {
      return null;
    }
  }

  const org = process.env.SENTRY_ORG;
  return org && /^[a-zA-Z0-9_-]+$/.test(org)
    ? `https://sentry.io/organizations/${org}/issues/`
    : null;
}

export async function getAdminMonitoringOverview() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [summaryRows, eventRows] = await Promise.all([
    db
      .select({
        errors: sql<number>`count(*) filter (where ${systemEvents.severity} = 'error')`,
        warnings: sql<number>`count(*) filter (where ${systemEvents.severity} = 'warning')`,
        total: count(),
      })
      .from(systemEvents)
      .where(gte(systemEvents.createdAt, since)),
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
      .where(eq(systemEvents.severity, 'error'))
      .orderBy(desc(systemEvents.createdAt))
      .limit(25),
  ]);

  const summary = summaryRows[0];
  const dsnConfigured = Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN);
  return {
    configuration: {
      dsnConfigured,
      sourceMapsConfigured: Boolean(
        process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
      ),
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'unknown',
      release: process.env.SENTRY_RELEASE || process.env.RAILWAY_GIT_COMMIT_SHA || null,
      dashboardUrl: safeDashboardUrl(),
      privacyMode: 'PII, request bodies, cookies, replay and application logs disabled',
    },
    last24Hours: {
      errors: Number(summary?.errors ?? 0),
      warnings: Number(summary?.warnings ?? 0),
      totalEvents: Number(summary?.total ?? 0),
    },
    recentErrors: eventRows.map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function sendAdminSentryDiagnostic(admin: AdminPrincipal, note: string) {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) {
    throw new AdminMonitoringError('Sentry DSN is not configured', 503, 'SENTRY_NOT_CONFIGURED');
  }

  const cleanNote = stripHtml(note).slice(0, 100) || 'Owner console diagnostic';
  const eventId = Sentry.captureMessage(cleanNote, {
    level: 'info',
    tags: {
      source: 'gradeai_owner_console',
      diagnostic: 'true',
    },
  });

  await Promise.all([
    Sentry.flush(2_000),
    db.batch([
      db.insert(adminAuditEvents).values({
        actorUserId: admin.userId,
        action: 'send_sentry_diagnostic',
        targetType: 'system',
        targetId: eventId,
        reason: cleanNote,
        afterState: { sent: true },
      }),
      db.insert(systemEvents).values({
        category: 'system',
        severity: 'info',
        code: 'SENTRY_DIAGNOSTIC_SENT',
        message: 'The owner sent a Sentry diagnostic event.',
        userId: admin.userId,
        entityType: 'sentry_event',
        entityId: eventId,
      }),
    ]),
  ]);

  return { eventId, flushed: true };
}
