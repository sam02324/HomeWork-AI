import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('POST /api/webhooks/google-form', () => {
  it('fails closed and directs teachers to the authenticated OAuth flow', async () => {
    const response = await POST();

    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: 'This legacy webhook is retired. Connect Google from GradeAI and sync the assignment.',
      code: 'LEGACY_WEBHOOK_RETIRED',
    });
  });
});
