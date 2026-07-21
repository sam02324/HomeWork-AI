import 'server-only';

import * as Sentry from '@sentry/nextjs';
import { db } from '@/db';
import { systemEvents, type NewSystemEvent, type SystemEventMetadata } from '@/db/schema';
import { stripHtml } from '@/lib/utils';

export interface SystemEventInput {
  category: NewSystemEvent['category'];
  severity: NewSystemEvent['severity'];
  code: string;
  message: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): SystemEventMetadata | undefined {
  if (!metadata) return undefined;
  const safe: SystemEventMetadata = {};

  for (const [key, value] of Object.entries(metadata).slice(0, 20)) {
    if (!/^[a-zA-Z0-9_.-]{1,50}$/.test(key)) continue;
    if (value === null || typeof value === 'boolean' || typeof value === 'number') {
      safe[key] = value;
    } else if (typeof value === 'string') {
      safe[key] = stripHtml(value).slice(0, 160);
    }
  }

  return safe;
}

export function createSystemEventValue(input: SystemEventInput): NewSystemEvent {
  return {
    category: input.category,
    severity: input.severity,
    code: input.code.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80),
    message: stripHtml(input.message).slice(0, 300),
    userId: input.userId,
    entityType: input.entityType?.slice(0, 50),
    entityId: input.entityId?.slice(0, 100),
    metadata: sanitizeMetadata(input.metadata),
  };
}

/** Best-effort recording must never turn a handled failure into a second outage. */
export async function recordSystemEvent(input: SystemEventInput): Promise<void> {
  try {
    await db.insert(systemEvents).values(createSystemEventValue(input));
  } catch (error) {
    console.error('Failed to record sanitized system event:', error);
  }
}

export function captureOperationalError(
  error: unknown,
  context: Pick<SystemEventInput, 'category' | 'code' | 'entityType' | 'entityId'>
): string {
  return Sentry.captureException(error, {
    tags: {
      category: context.category,
      code: context.code,
      entity_type: context.entityType ?? 'none',
    },
    extra: {
      entityId: context.entityId,
    },
  });
}

export function getOperationalErrorCode(error: unknown): string {
  if (error && typeof error === 'object') {
    const candidate = error as { status?: unknown; code?: unknown; name?: unknown };
    if (typeof candidate.status === 'number') return `HTTP_${candidate.status}`;
    if (typeof candidate.code === 'string') return candidate.code.slice(0, 80);
    if (typeof candidate.name === 'string') return candidate.name.slice(0, 80);
  }
  return 'UNKNOWN_ERROR';
}
