import 'server-only';

import type { NewAiUsageEvent } from '@/db/schema';

const USD_TO_INR_FALLBACK = 96.512;

interface ModelPrice {
  inputUsdPerMillion: number;
  outputUsdPerMillion: number;
}
const MODEL_PRICES: Array<[RegExp, ModelPrice]> = [
  [/claude-sonnet-5/i, { inputUsdPerMillion: 2, outputUsdPerMillion: 10 }],
  [/claude-sonnet-4/i, { inputUsdPerMillion: 3, outputUsdPerMillion: 15 }],
  [/claude-opus-4/i, { inputUsdPerMillion: 5, outputUsdPerMillion: 25 }],
  [/claude-haiku-4/i, { inputUsdPerMillion: 1, outputUsdPerMillion: 5 }],
];

function positiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getModelPrice(model: string): ModelPrice {
  const overrideInput = positiveNumber(process.env.AI_INPUT_PRICE_USD_PER_MILLION);
  const overrideOutput = positiveNumber(process.env.AI_OUTPUT_PRICE_USD_PER_MILLION);
  if (overrideInput && overrideOutput) {
    return { inputUsdPerMillion: overrideInput, outputUsdPerMillion: overrideOutput };
  }

  return MODEL_PRICES.find(([pattern]) => pattern.test(model))?.[1] ?? {
    inputUsdPerMillion: 3,
    outputUsdPerMillion: 15,
  };
}

export interface AiUsageInput {
  userId: string;
  assignmentId: string;
  submissionId: string;
  model: string;
  status: 'success' | 'error';
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  errorCode?: string;
}

/** Build the immutable price snapshot stored beside each AI call. */
export function createAiUsageEventValue(input: AiUsageInput): NewAiUsageEvent {
  const price = getModelPrice(input.model);
  const exchangeRate = positiveNumber(process.env.AI_USD_TO_INR_RATE) ?? USD_TO_INR_FALLBACK;
  const inputPriceMicros = Math.round(price.inputUsdPerMillion * 1_000_000);
  const outputPriceMicros = Math.round(price.outputUsdPerMillion * 1_000_000);
  const inputTokens = Math.max(0, Math.round(input.inputTokens));
  const outputTokens = Math.max(0, Math.round(input.outputTokens));
  const estimatedCostUsdMicros = Math.ceil(
    (inputTokens * inputPriceMicros + outputTokens * outputPriceMicros) / 1_000_000
  );
  const usdToInrMicros = Math.round(exchangeRate * 1_000_000);
  const estimatedCostInrPaise = Math.ceil(
    (estimatedCostUsdMicros * usdToInrMicros) / 10_000_000_000
  );

  return {
    userId: input.userId,
    assignmentId: input.assignmentId,
    submissionId: input.submissionId,
    provider: 'anthropic',
    model: input.model.slice(0, 100),
    operation: 'grade_submission',
    status: input.status,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputPriceUsdMicrosPerMillion: inputPriceMicros,
    outputPriceUsdMicrosPerMillion: outputPriceMicros,
    estimatedCostUsdMicros,
    usdToInrMicros,
    estimatedCostInrPaise,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    errorCode: input.errorCode?.slice(0, 80),
  };
}
