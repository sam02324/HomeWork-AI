import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSubmissionObjectKey, getR2Config } from './r2';

function configureR2() {
  vi.stubEnv('R2_ACCOUNT_ID', 'account-id');
  vi.stubEnv('R2_ACCESS_KEY_ID', 'access-key');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret-key');
  vi.stubEnv('R2_BUCKET_NAME', 'gradeai-uploads');
  vi.stubEnv('R2_PUBLIC_URL', 'https://uploads.example.com/');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('R2 configuration', () => {
  it('fails closed when a required value is missing', () => {
    configureR2();
    vi.stubEnv('R2_PUBLIC_URL', '');

    expect(() => getR2Config()).toThrow('R2_PUBLIC_URL is missing');
  });

  it('requires HTTPS and normalizes the public base URL', () => {
    configureR2();
    expect(getR2Config().publicUrl).toBe('https://uploads.example.com');

    vi.stubEnv('R2_PUBLIC_URL', 'http://uploads.example.com');
    expect(() => getR2Config()).toThrow('must use HTTPS');
  });

  it('sanitizes object-key owners and extensions', () => {
    const key = createSubmissionObjectKey('../user/teacher', 'answer.PD$F');

    expect(key).toMatch(/^submissions\/user_teacher\/[0-9a-f-]+\.pdf$/);
    expect(key).not.toContain('..');
  });
});
