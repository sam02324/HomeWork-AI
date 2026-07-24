import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  limit: vi.fn(),
  select: vi.fn(),
  createSignedUrl: vi.fn(),
  isManaged: vi.fn(),
  assertOwned: vi.fn(),
  assertOwnedLegacy: vi.fn(),
  downloadDriveFile: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: mocks.select,
  },
}));

vi.mock('@/db/schema', () => ({
  assignments: { id: 'assignments.id', teacherId: 'assignments.teacherId' },
  submissions: {
    id: 'submissions.id',
    assignmentId: 'submissions.assignmentId',
    fileUrl: 'submissions.fileUrl',
    googleDriveFileId: 'submissions.googleDriveFileId',
    removedAt: 'submissions.removedAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  and: vi.fn(() => 'owned-submission-filter'),
  eq: vi.fn(() => 'equality-filter'),
  isNull: vi.fn(() => 'not-removed-filter'),
}));

vi.mock('@/lib/utils', () => ({
  getAuthUserId: mocks.getAuthUserId,
  errorResponse: (message: string, status: number, code = 'ERROR') =>
    Response.json({ success: false, error: message, code }, { status }),
  handleApiError: () =>
    Response.json({ success: false, error: 'Failed to access submission file', code: 'INTERNAL_ERROR' }, { status: 500 }),
}));

vi.mock('@/lib/storage/r2', () => ({
  createSignedSubmissionDownloadUrl: mocks.createSignedUrl,
  isManagedSubmissionReference: mocks.isManaged,
  assertOwnedSubmissionReference: mocks.assertOwned,
  MAX_SUBMISSION_FILE_BYTES: 10 * 1024 * 1024,
}));

vi.mock('@/lib/storage/submission-files', () => ({
  assertOwnedLegacySubmissionUrl: mocks.assertOwnedLegacy,
}));

vi.mock('@/lib/google-sheets', () => ({
  downloadDriveFile: mocks.downloadDriveFile,
}));

import { GET } from './route';

function configureOwnedSubmission(result: unknown[]) {
  mocks.limit.mockResolvedValue(result);
  mocks.select.mockReturnValue({
    from: () => ({
      innerJoin: () => ({
        where: () => ({ limit: mocks.limit }),
      }),
    }),
  });
}

beforeEach(() => {
  mocks.getAuthUserId.mockResolvedValue('user_teacher');
  mocks.isManaged.mockReturnValue(true);
  mocks.createSignedUrl.mockResolvedValue('https://signed-storage.example.com/object?signature=short-lived');
  mocks.downloadDriveFile.mockResolvedValue({
    buffer: Buffer.from('drive file'),
    mimeType: 'application/pdf',
    name: 'answer.pdf',
  });
  configureOwnedSubmission([]);
});

describe('GET /api/submissions/[id]/file', () => {
  it('returns the authentication response before querying storage metadata', async () => {
    mocks.getAuthUserId.mockResolvedValue(
      NextResponse.json({ success: false, error: 'Unauthenticated' }, { status: 401 })
    );

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(401);
    expect(mocks.select).not.toHaveBeenCalled();
  });

  it('hides missing and cross-account submissions behind a 404', async () => {
    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ code: 'NOT_FOUND' });
    expect(mocks.createSignedUrl).not.toHaveBeenCalled();
  });

  it('redirects an owned R2 object through a short-lived signed URL', async () => {
    configureOwnedSubmission([{
      id: 'submission-id',
      fileReference: 'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
      googleDriveFileId: null,
    }]);

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('signed-storage.example.com');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
      60
    );
    expect(mocks.assertOwned).toHaveBeenCalledWith(
      'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
      'user_teacher'
    );
  });

  it('streams an owned Google submission through the teacher OAuth connection', async () => {
    mocks.isManaged.mockReturnValue(false);
    configureOwnedSubmission([{
      id: 'submission-id',
      fileReference: null,
      googleDriveFileId: 'drive-file-id',
    }]);

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(await response.text()).toBe('drive file');
    expect(mocks.downloadDriveFile).toHaveBeenCalledWith('drive-file-id', 'user_teacher');
  });

  it('rejects an oversized Google file after authenticated download', async () => {
    mocks.isManaged.mockReturnValue(false);
    mocks.downloadDriveFile.mockResolvedValue({
      buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
      mimeType: 'application/pdf',
      name: 'oversized.pdf',
    });
    configureOwnedSubmission([{
      id: 'submission-id',
      fileReference: null,
      googleDriveFileId: 'drive-file-id',
    }]);

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ code: 'FILE_TOO_LARGE' });
  });

  it('forces active Google file types to download without browser sniffing', async () => {
    mocks.isManaged.mockReturnValue(false);
    mocks.downloadDriveFile.mockResolvedValue({
      buffer: Buffer.from('<script>alert(1)</script>'),
      mimeType: 'text/html',
      name: 'answer.html',
    });
    configureOwnedSubmission([{
      id: 'submission-id',
      fileReference: null,
      googleDriveFileId: 'drive-file-id',
    }]);

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/octet-stream');
    expect(response.headers.get('content-disposition')).toContain('attachment');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('re-signs a recognized owner-scoped legacy R2 URL', async () => {
    mocks.isManaged.mockReturnValue(false);
    configureOwnedSubmission([{
      id: 'submission-id',
      fileReference: 'https://legacy-files.example.com/submissions/user_teacher/answer.pdf',
      googleDriveFileId: null,
    }]);

    const response = await GET(new Request('https://gradeai.test/api/submissions/id/file'), {
      params: Promise.resolve({ id: 'submission-id' }),
    });

    expect(response.status).toBe(307);
    expect(mocks.assertOwnedLegacy).toHaveBeenCalledWith(
      'https://legacy-files.example.com/submissions/user_teacher/answer.pdf',
      'user_teacher'
    );
    expect(mocks.createSignedUrl).toHaveBeenCalledWith(
      'https://legacy-files.example.com/submissions/user_teacher/answer.pdf',
      60
    );
  });
});
