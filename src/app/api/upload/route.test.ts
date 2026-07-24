import { NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getAuthUserId: vi.fn(),
  rateLimitGuard: vi.fn(),
  uploadSubmissionBuffer: vi.fn(),
}));

vi.mock('@/lib/utils', async () => {
  const { NextResponse: ResponseClass } = await import('next/server');

  function codeForStatus(status: number) {
    if (status === 400) return 'BAD_REQUEST';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 429) return 'RATE_LIMITED';
    return status >= 500 ? 'INTERNAL' : 'ERROR';
  }

  return {
    getAuthUserId: mocks.getAuthUserId,
    rateLimitGuard: mocks.rateLimitGuard,
    errorResponse: (message: string, status = 400, code?: string) =>
      ResponseClass.json(
        { success: false, error: message, code: code ?? codeForStatus(status) },
        { status }
      ),
    successResponse: <T>(data: T, status = 200) =>
      ResponseClass.json({ success: true, data }, { status }),
    handleApiError: () =>
      ResponseClass.json(
        { success: false, error: 'Internal server error', code: 'INTERNAL' },
        { status: 500 }
      ),
  };
});

vi.mock('@/lib/storage/r2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage/r2')>();
  return {
    ...actual,
    uploadSubmissionBuffer: mocks.uploadSubmissionBuffer,
  };
});

import { POST } from './route';

function uploadRequest(contents: string, type: string, name: string) {
  const body = new FormData();
  body.set('file', new File([contents], name, { type }));
  return new Request('http://localhost/api/upload', { method: 'POST', body });
}

beforeEach(() => {
  mocks.getAuthUserId.mockResolvedValue('user_teacher_123');
  mocks.rateLimitGuard.mockReturnValue(null);
  mocks.uploadSubmissionBuffer.mockResolvedValue(
    'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000'
  );
});

describe('POST /api/upload', () => {
  it('returns the auth response before reading a file', async () => {
    mocks.getAuthUserId.mockResolvedValue(
      NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    );

    const response = await POST(new Request('http://localhost/api/upload', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(mocks.uploadSubmissionBuffer).not.toHaveBeenCalled();
  });

  it('stores a valid file and returns a managed reference in the standard envelope', async () => {
    const response = await POST(
      uploadRequest('%PDF-1.7\n', 'application/pdf', 'answer.pdf')
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      success: true,
      data: {
        fileReference:
          'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
        url: 'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
        filename: 'answer.pdf',
        size: 9,
        type: 'application/pdf',
      },
    });
    expect(mocks.uploadSubmissionBuffer).toHaveBeenCalledWith(
      expect.objectContaining({
        mimeType: 'application/pdf',
        originalName: 'answer.pdf',
        ownerId: 'user_teacher_123',
      })
    );
  });

  it('rejects unsupported formats before storage', async () => {
    const response = await POST(
      uploadRequest('plain text', 'text/plain', 'answer.txt')
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: 'Unsupported submission file type. Use PDF, PNG, or JPEG.',
      code: 'BAD_REQUEST',
    });
    expect(mocks.uploadSubmissionBuffer).not.toHaveBeenCalled();
  });

  it('rejects a declared MIME type that does not match the magic bytes', async () => {
    const response = await POST(
      uploadRequest('%PDF-1.7\n', 'image/png', 'answer.png')
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      success: false,
      error: 'File content does not match its declared type',
      code: 'BAD_REQUEST',
    });
    expect(mocks.uploadSubmissionBuffer).not.toHaveBeenCalled();
  });
});
