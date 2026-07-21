import 'server-only';

import { and, asc, count, desc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { aiUsageEvents, users } from '@/db/schema';

export interface UsageDay {
  date: string;
  calls: number;
  failures: number;
  tokens: number;
  costUsdMicros: number;
  costInrPaise: number;
}
export interface UsageUser {
  userId: string;
  name: string;
  email: string;
  calls: number;
  failures: number;
  tokens: number;
  costInrPaise: number;
  anomaly: boolean;
}

export interface AdminUsageOverview {
  days: number;
  summary: {
    calls: number;
    successfulCalls: number;
    failedCalls: number;
    tokens: number;
    averageLatencyMs: number;
    costUsdMicros: number;
    costInrPaise: number;
    last7DayCalls: number;
    previous7DayCalls: number;
  };
  daily: UsageDay[];
  users: UsageUser[];
  models: Array<{ model: string; calls: number; tokens: number; costInrPaise: number }>;
  pricing: {
    basis: 'per-call snapshot';
    exchangeRate: number | null;
  };
}

function number(value: unknown): number {
  return Number(value ?? 0);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 === 0
    ? (ordered[middle - 1] + ordered[middle]) / 2
    : ordered[middle];
}

export async function getAdminUsageOverview(days: number): Promise<AdminUsageOverview> {
  const since = new Date(Date.now() - days * 86_400_000);
  const last7Since = new Date(Date.now() - 7 * 86_400_000);
  const day = sql<string>`to_char(date_trunc('day', ${aiUsageEvents.createdAt} AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD')`;

  const [summaryRows, dailyRows, userRows, modelRows, exchangeRows] = await Promise.all([
    db
      .select({
        calls: count(),
        successfulCalls: sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'success')`,
        failedCalls: sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'error')`,
        tokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
        averageLatencyMs: sql<number>`coalesce(avg(${aiUsageEvents.latencyMs}), 0)`,
        costUsdMicros: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostUsdMicros}), 0)`,
        costInrPaise: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostInrPaise}), 0)`,
      })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, since)),
    db
      .select({
        date: day,
        calls: count(),
        failures: sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'error')`,
        tokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
        costUsdMicros: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostUsdMicros}), 0)`,
        costInrPaise: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostInrPaise}), 0)`,
      })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, since))
      .groupBy(day)
      .orderBy(asc(day)),
    db
      .select({
        userId: aiUsageEvents.userId,
        name: users.name,
        email: users.email,
        calls: count(),
        failures: sql<number>`count(*) filter (where ${aiUsageEvents.status} = 'error')`,
        tokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
        costInrPaise: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostInrPaise}), 0)`,
      })
      .from(aiUsageEvents)
      .innerJoin(users, eq(aiUsageEvents.userId, users.id))
      .where(and(gte(aiUsageEvents.createdAt, last7Since), eq(users.accountStatus, 'active')))
      .groupBy(aiUsageEvents.userId, users.name, users.email)
      .orderBy(desc(count())),
    db
      .select({
        model: aiUsageEvents.model,
        calls: count(),
        tokens: sql<number>`coalesce(sum(${aiUsageEvents.totalTokens}), 0)`,
        costInrPaise: sql<number>`coalesce(sum(${aiUsageEvents.estimatedCostInrPaise}), 0)`,
      })
      .from(aiUsageEvents)
      .where(gte(aiUsageEvents.createdAt, since))
      .groupBy(aiUsageEvents.model)
      .orderBy(desc(count())),
    db
      .select({ rate: aiUsageEvents.usdToInrMicros })
      .from(aiUsageEvents)
      .orderBy(desc(aiUsageEvents.createdAt))
      .limit(1),
  ]);

  const daily = dailyRows.map((row) => ({
    date: row.date,
    calls: number(row.calls),
    failures: number(row.failures),
    tokens: number(row.tokens),
    costUsdMicros: number(row.costUsdMicros),
    costInrPaise: number(row.costInrPaise),
  }));
  const sevenDayCutoff = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const fourteenDayCutoff = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
  const last7DayCalls = daily
    .filter((row) => row.date >= sevenDayCutoff)
    .reduce((sum, row) => sum + row.calls, 0);
  const previous7DayCalls = daily
    .filter((row) => row.date >= fourteenDayCutoff && row.date < sevenDayCutoff)
    .reduce((sum, row) => sum + row.calls, 0);

  const userCallMedian = median(userRows.map((row) => number(row.calls)).filter(Boolean));
  const anomalyThreshold = Math.max(20, userCallMedian * 3);
  const usageUsers = userRows.map((row) => ({
    userId: row.userId ?? 'deleted-user',
    name: row.name,
    email: row.email,
    calls: number(row.calls),
    failures: number(row.failures),
    tokens: number(row.tokens),
    costInrPaise: number(row.costInrPaise),
    anomaly: number(row.calls) >= anomalyThreshold,
  }));

  const summary = summaryRows[0];
  return {
    days,
    summary: {
      calls: number(summary?.calls),
      successfulCalls: number(summary?.successfulCalls),
      failedCalls: number(summary?.failedCalls),
      tokens: number(summary?.tokens),
      averageLatencyMs: Math.round(number(summary?.averageLatencyMs)),
      costUsdMicros: number(summary?.costUsdMicros),
      costInrPaise: number(summary?.costInrPaise),
      last7DayCalls,
      previous7DayCalls,
    },
    daily,
    users: usageUsers,
    models: modelRows.map((row) => ({
      model: row.model,
      calls: number(row.calls),
      tokens: number(row.tokens),
      costInrPaise: number(row.costInrPaise),
    })),
    pricing: {
      basis: 'per-call snapshot',
      exchangeRate: exchangeRows[0] ? exchangeRows[0].rate / 1_000_000 : null,
    },
  };
}
