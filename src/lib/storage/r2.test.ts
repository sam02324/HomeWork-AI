import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SUBMISSION_FILE_BYTES,
  assertOwnedSubmissionReference,
  createPresignedSubmissionUploadUrl,
  createSignedSubmissionDownloadUrl,
  createSubmissionObjectKey,
  deleteSubmissionObject,
  downloadSubmissionObject,
  getR2Config,
  isManagedSubmissionReference,
  normalizeSubmissionReference,
  uploadSubmissionBuffer,
  validateSubmissionUpload,
} from './r2';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}));

const OWNER_ID = 'user_teacher_123';
const OTHER_OWNER_ID = 'user_teacher_456';

function configureR2() {
  vi.stubEnv('R2_ACCOUNT_ID', 'account-id');
  vi.stubEnv('R2_ACCESS_KEY_ID', 'access-key');
  vi.stubEnv('R2_SECRET_ACCESS_KEY', 'secret-key');
  vi.stubEnv('R2_BUCKET_NAME', 'gradeai-uploads');
  vi.stubEnv('R2_PUBLIC_URL', 'https://uploads.example.com/');
}

beforeEach(() => {
  configureR2();
  vi.mocked(getSignedUrl).mockResolvedValue('https://signed.example.com/object');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('R2 configuration', () => {
  it('fails closed when a required private-storage value is missing', () => {
    vi.stubEnv('R2_BUCKET_NAME', '');

    expect(() => getR2Config()).toThrow('R2_BUCKET_NAME is missing');
  });

  it('does not require the legacy public URL', () => {
    vi.stubEnv('R2_PUBLIC_URL', '');

    expect(getR2Config()).toMatchObject({
      accountId: 'account-id',
      bucketName: 'gradeai-uploads',
      legacyPublicUrl: undefined,
    });
  });

  it('accepts only an HTTPS legacy public URL', () => {
    expect(getR2Config().legacyPublicUrl).toBe('https://uploads.example.com');

    vi.stubEnv('R2_PUBLIC_URL', 'http://uploads.example.com');
    expect(() => getR2Config()).toThrow('R2_PUBLIC_URL must use HTTPS');
  });
});

describe('submission references', () => {
  it('creates opaque, tenant-scoped references without filenames or owner IDs', () => {
    const key = createSubmissionObjectKey(OWNER_ID, 'Rishabh-answer.PDF');
    const reference = `r2:${key}`;

    expect(key).toMatch(
      /^submissions\/[0-9a-f]{32}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(reference).not.toContain(OWNER_ID);
    expect(reference).not.toContain('Rishabh');
    expect(isManagedSubmissionReference(reference)).toBe(true);
    expect(isManagedSubmissionReference('https://uploads.example.com/submissions/old/file.pdf')).toBe(false);
  });

  it('accepts only references belonging to the expected owner scope', () => {
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.pdf')}`;

    expect(assertOwnedSubmissionReference(reference, OWNER_ID)).toMatch(/^submissions\//);
    expect(() => assertOwnedSubmissionReference(reference, OTHER_OWNER_ID)).toThrow(
      'Submission reference does not belong to this owner'
    );
    expect(() => assertOwnedSubmissionReference('https://uploads.example.com/file.pdf', OWNER_ID)).toThrow(
      'Managed submission reference required'
    );
  });

  it('normalizes only configured legacy R2 URLs and preserves ownership checks', () => {
    const legacyUrl =
      'https://uploads.example.com/submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf';
    const normalized = normalizeSubmissionReference(legacyUrl);

    expect(normalized).toBe(
      'r2:submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf'
    );
    expect(normalized && isManagedSubmissionReference(normalized)).toBe(true);
    expect(normalized && assertOwnedSubmissionReference(normalized, OWNER_ID)).toBe(
      'submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf'
    );
    expect(normalizeSubmissionReference('https://example.net/submissions/file.pdf')).toBeNull();
  });
});

describe('submission upload validation', () => {
  it.each(['application/pdf', 'image/png', 'image/jpeg'])(
    'accepts %s within the 10 MB limit',
    (mimeType) => {
      expect(() => validateSubmissionUpload({ mimeType, size: MAX_SUBMISSION_FILE_BYTES })).not.toThrow();
    }
  );

  it.each(['text/plain', 'image/webp', 'image/heic', 'application/octet-stream'])(
    'rejects unsupported MIME type %s',
    (mimeType) => {
      expect(() => validateSubmissionUpload({ mimeType, size: 100 })).toThrow(
        'Unsupported submission file type'
      );
    }
  );

  it('rejects empty and oversized uploads', () => {
    expect(() => validateSubmissionUpload({ mimeType: 'application/pdf', size: 0 })).toThrow(
      'File must not be empty'
    );
    expect(() =>
      validateSubmissionUpload({
        mimeType: 'application/pdf',
        size: MAX_SUBMISSION_FILE_BYTES + 1,
      })
    ).toThrow('File too large');
  });
});

describe('signed submission URLs', () => {
  it('creates a five-minute-or-shorter upload URL and returns only the managed reference', async () => {
    const result = await createPresignedSubmissionUploadUrl({
      ownerId: OWNER_ID,
      originalName: 'answer.pdf',
      mimeType: 'application/pdf',
      size: 1_024,
      expiresInSeconds: 120,
    });

    expect(result).toMatchObject({
      reference: expect.stringMatching(/^r2:submissions\//),
      uploadUrl: 'https://signed.example.com/object',
      expiresInSeconds: 120,
    });
    expect(result).not.toHaveProperty('publicUrl');

    const command = vi.mocked(getSignedUrl).mock.calls[0][1];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: 'gradeai-uploads',
      ContentLength: 1_024,
      ContentType: 'application/pdf',
    });
    expect(vi.mocked(getSignedUrl).mock.calls[0][2]).toEqual({ expiresIn: 120 });
  });

  it('rejects signed URL expiries outside 1-300 seconds', async () => {
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.pdf')}`;

    await expect(createSignedSubmissionDownloadUrl(reference, 0)).rejects.toThrow(
      'Signed URL expiry must be between 1 and 300 seconds'
    );
    await expect(createSignedSubmissionDownloadUrl(reference, 301)).rejects.toThrow(
      'Signed URL expiry must be between 1 and 300 seconds'
    );
  });

  it('signs managed downloads and recognized legacy R2 URLs', async () => {
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.pdf')}`;

    await expect(createSignedSubmissionDownloadUrl(reference, 90)).resolves.toBe(
      'https://signed.example.com/object'
    );
    let command = vi.mocked(getSignedUrl).mock.calls[0][1];
    expect(command).toBeInstanceOf(GetObjectCommand);

    vi.mocked(getSignedUrl).mockClear();
    await expect(
      createSignedSubmissionDownloadUrl(
        'https://uploads.example.com/submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf',
        90
      )
    ).resolves.toBe('https://signed.example.com/object');
    command = vi.mocked(getSignedUrl).mock.calls[0][1];
    expect((command as GetObjectCommand).input.Key).toBe(
      'submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf'
    );
  });

  it('does not sign an unrecognized external URL', async () => {
    await expect(
      createSignedSubmissionDownloadUrl('https://example.net/student-work.pdf', 90)
    ).rejects.toThrow('Unsupported legacy submission URL');
  });
});

describe('object operations', () => {
  it('uploads validated buffers privately and returns a managed reference', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    const buffer = Buffer.from('%PDF-1.7\n');

    const reference = await uploadSubmissionBuffer({
      buffer,
      mimeType: 'application/pdf',
      originalName: 'student-answer.pdf',
      ownerId: OWNER_ID,
    });

    expect(reference).toMatch(/^r2:submissions\//);
    const command = send.mock.calls[0][0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: 'gradeai-uploads',
      Body: buffer,
      ContentType: 'application/pdf',
    });
    expect((command as PutObjectCommand).input).not.toHaveProperty('ACL');
  });

  it('downloads managed and recognized legacy R2 objects through the SDK', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
      Body: {
        transformToByteArray: async () => Uint8Array.from([1, 2, 3]),
      },
      ContentType: 'image/png',
    } as never);
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.png')}`;

    await expect(downloadSubmissionObject(reference)).resolves.toEqual({
      buffer: Buffer.from([1, 2, 3]),
      contentType: 'image/png',
    });
    expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
  });

  it('rejects oversized objects before returning student content', async () => {
    vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({
      Body: {
        transformToByteArray: async () => Uint8Array.from([1, 2, 3]),
      },
      ContentLength: MAX_SUBMISSION_FILE_BYTES + 1,
      ContentType: 'application/pdf',
    } as never);
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.pdf')}`;

    await expect(downloadSubmissionObject(reference)).rejects.toThrow(
      'Submission object exceeds the size limit'
    );
  });

  it('deletes managed and recognized legacy R2 objects', async () => {
    const send = vi.spyOn(S3Client.prototype, 'send').mockResolvedValue({} as never);
    const reference = `r2:${createSubmissionObjectKey(OWNER_ID, 'answer.pdf')}`;

    await expect(deleteSubmissionObject(reference)).resolves.toBe(true);
    expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand);

    send.mockClear();
    await expect(
      deleteSubmissionObject(
        'https://uploads.example.com/submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf'
      )
    ).resolves.toBe(true);
    expect((send.mock.calls[0][0] as DeleteObjectCommand).input.Key).toBe(
      'submissions/user_teacher_123/123e4567-e89b-42d3-a456-426614174000.pdf'
    );

    send.mockClear();
    await expect(
      deleteSubmissionObject('https://unknown.example.com/submissions/legacy.pdf')
    ).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });
});
