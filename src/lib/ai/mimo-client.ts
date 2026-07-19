type MimoTextPart = {
  type: 'text';
  text: string;
};

type MimoImagePart = {
  type: 'image_url';
  image_url: { url: string };
};

export type MimoMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<MimoTextPart | MimoImagePart>;
};

interface MimoCompletionResponse {
  model?: string;
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface MimoCompletion {
  text: string;
  model: string;
  tokensUsed: number;
}

const DEFAULT_MIMO_BASE_URL = 'https://api.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5';
const DEFAULT_MIMO_THINKING = 'disabled';

export function getAiProvider(): 'anthropic' | 'mimo' {
  return process.env.AI_PROVIDER?.toLowerCase() === 'mimo' ? 'mimo' : 'anthropic';
}

export function getAiModel(): string {
  if (getAiProvider() === 'mimo') {
    return process.env.MIMO_MODEL || process.env.AI_MODEL || DEFAULT_MIMO_MODEL;
  }

  return process.env.ANTHROPIC_MODEL || process.env.AI_MODEL || 'claude-sonnet-4-6';
}

function getMimoConfig() {
  const apiKey = process.env.MIMO_API_KEY;
  if (!apiKey) {
    throw new Error('MIMO_API_KEY is not configured');
  }

  return {
    apiKey,
    baseUrl: (process.env.MIMO_BASE_URL || DEFAULT_MIMO_BASE_URL).replace(/\/$/, ''),
    model: getAiModel(),
    thinking: process.env.MIMO_THINKING === 'enabled' ? 'enabled' : DEFAULT_MIMO_THINKING,
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } | string };
    if (typeof body.error === 'string') return body.error;
    if (body.error?.message) return body.error.message;
  } catch {
    // Keep provider details out of the client response.
  }
  return `MiMo request failed with status ${response.status}`;
}

export async function createMimoCompletion(
  messages: MimoMessage[],
  maxCompletionTokens = 4000
): Promise<MimoCompletion> {
  const config = getMimoConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_completion_tokens: maxCompletionTokens,
      stream: false,
      thinking: { type: config.thinking },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const providerError = await readError(response);
    throw new Error(`MiMo API error (${response.status}): ${providerError}`);
  }

  const payload = (await response.json()) as MimoCompletionResponse;
  const text = payload.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('MiMo returned an empty response');

  return {
    text,
    model: payload.model || config.model,
    tokensUsed: payload.usage?.total_tokens ||
      (payload.usage?.prompt_tokens || 0) + (payload.usage?.completion_tokens || 0),
  };
}

export async function streamMimoCompletion(
  messages: MimoMessage[],
  onComplete: (text: string) => Promise<void>
): Promise<Response> {
  const config = getMimoConfig();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_completion_tokens: 4000,
      stream: true,
      thinking: { type: config.thinking },
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const providerError = await readError(response);
    throw new Error(`MiMo API error (${response.status}): ${providerError}`);
  }
  if (!response.body) throw new Error('MiMo returned no response stream');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  let fullText = '';

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      void (async () => {
        try {
          let done = false;
          while (!done) {
            const chunk = await reader.read();
            done = chunk.done;
            if (chunk.value) buffer += decoder.decode(chunk.value, { stream: !done });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;

              try {
                const event = JSON.parse(data) as {
                  choices?: Array<{ delta?: { content?: string | null } }>;
                };
                const text = event.choices?.[0]?.delta?.content || '';
                if (text) {
                  fullText += text;
                  controller.enqueue(encoder.encode(text));
                }
              } catch {
                // Ignore incomplete or provider-specific SSE events.
              }
            }
          }

          if (fullText) await onComplete(fullText);
          controller.close();
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      })();
    },
    cancel() {
      void reader.cancel();
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
