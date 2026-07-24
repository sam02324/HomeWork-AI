import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteSubmissionObject: vi.fn(),
}));

vi.mock('./r2', () => ({
  deleteSubmissionObject: mocks.deleteSubmissionObject,
}));

import {
  assertAllowedLegacySubmissionUrl,
  assertOwnedLegacySubmissionUrl,
  deleteManagedSubmissionReferences,
  getSubmissionFileAccessPath,
} from './submission-files';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('submission file access', () => {
  it('exposes only the authenticated application route', () => {
    expect(getSubmissionFileAccessPath({
      submissionId: 'submission-id',
      fileReference: 'r2:submissions/teacher/object.pdf',
    })).toBe('/api/submissions/submission-id/file');

    expect(getSubmissionFileAccessPath({
      submissionId: 'submission-id',
      googleDriveFileId: 'drive-file-id',
    })).toBe('/api/submissions/submission-id/file');

    expect(getSubmissionFileAccessPath({
      submissionId: 'submission-id',
    })).toBeNull();
  });

  it('allows only configured legacy storage and Google file hosts', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://legacy-files.example.com');

    expect(() => assertAllowedLegacySubmissionUrl(
      'https://legacy-files.example.com/submissions/teacher/file.pdf'
    )).not.toThrow();
    expect(() => assertAllowedLegacySubmissionUrl(
      'https://drive.google.com/file/d/file-id/view'
    )).not.toThrow();
    expect(() => assertAllowedLegacySubmissionUrl(
      'https://attacker.example.com/student-file.pdf'
    )).toThrow('approved storage host');
  });

  it('rejects insecure and internal legacy URLs', () => {
    expect(() => assertAllowedLegacySubmissionUrl(
      'http://drive.google.com/file/d/file-id/view'
    )).toThrow('Only HTTPS URLs are allowed');
    expect(() => assertAllowedLegacySubmissionUrl(
      'https://localhost/student-file.pdf'
    )).toThrow('Local or internal URLs are not allowed');
  });

  it('allows only the authenticated owner legacy prefix', () => {
    vi.stubEnv('R2_PUBLIC_URL', 'https://legacy-files.example.com');

    expect(() => assertOwnedLegacySubmissionUrl(
      'https://legacy-files.example.com/submissions/user_teacher/answer.pdf',
      'user_teacher'
    )).not.toThrow();
    expect(() => assertOwnedLegacySubmissionUrl(
      'https://legacy-files.example.com/submissions/another_teacher/answer.pdf',
      'user_teacher'
    )).toThrow('does not belong to this owner');
    expect(() => assertOwnedLegacySubmissionUrl(
      'https://legacy-files.example.com/submissions/user_teacher/../another_teacher/answer.pdf',
      'user_teacher'
    )).toThrow();
  });

  it('deduplicates cleanup while preserving recognized legacy references', async () => {
    mocks.deleteSubmissionObject.mockResolvedValue(true);

    await deleteManagedSubmissionReferences([
      'r2:submissions/scope/object',
      'r2:submissions/scope/object',
      'https://legacy-files.example.com/submissions/user_teacher/object.pdf',
      null,
    ]);

    expect(mocks.deleteSubmissionObject).toHaveBeenCalledTimes(2);
    expect(mocks.deleteSubmissionObject).toHaveBeenCalledWith(
      'https://legacy-files.example.com/submissions/user_teacher/object.pdf'
    );
  });
});
