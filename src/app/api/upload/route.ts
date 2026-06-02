import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getAuthUserId, errorResponse, successResponse } from '@/lib/utils';
import { randomUUID } from 'crypto';

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

/** POST /api/upload — Upload file to Cloudflare R2 */
export async function POST(request: Request) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return errorResponse('File too large. Maximum 10MB.', 400);
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'text/plain',
    ];
    if (!allowedTypes.includes(file.type)) {
      return errorResponse(`File type ${file.type} not allowed`, 400);
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `submissions/${userId}/${randomUUID()}.${ext}`;

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to R2
    const s3 = getR2Client();
    const bucketName = process.env.R2_BUCKET_NAME || 'gradeai-uploads';
    const publicUrl = process.env.R2_PUBLIC_URL || 'https://pub-e8ac62539691450290f9818cb9c462ff.r2.dev';

    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
    }));

    const fileUrl = `${publicUrl}/${filename}`;

    return successResponse({
      url: fileUrl,
      filename: file.name,
      size: file.size,
      type: file.type,
    }, 201);
  } catch (error) {
    console.error('POST /api/upload error:', error);
    return errorResponse('Upload failed', 500);
  }
}
