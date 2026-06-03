import { db } from './src/db';
import { submissions } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { downloadDriveFile } from './src/lib/google-sheets';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
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

async function uploadToR2(buffer: Buffer, mimeType: string, originalName: string, teacherId: string): Promise<string> {
  const ext = originalName.split('.').pop() || 'bin';
  const filename = `submissions/${teacherId}/${randomUUID()}.${ext}`;
  const s3 = getR2Client();
  await s3.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: filename,
    Body: buffer,
    ContentType: mimeType,
  }));
  return `${process.env.R2_PUBLIC_URL}/${filename}`;
}

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';
  const teacherId = 'user_3EJvUo6mdIKbzwnudQJGvHZVs8S';

  const subs = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId)
  });

  for (const sub of subs) {
    if (!sub.fileUrl && sub.googleDriveFileId) {
      console.log(`Fixing submission ${sub.id} (Drive ID: ${sub.googleDriveFileId})`);
      try {
        console.log('Downloading from Drive...');
        const driveFile = await downloadDriveFile(sub.googleDriveFileId, teacherId);
        console.log(`Downloaded ${driveFile.name} (${driveFile.buffer.length} bytes)`);
        
        console.log('Uploading to R2...');
        const fileUrl = await uploadToR2(driveFile.buffer, driveFile.mimeType, driveFile.name, teacherId);
        
        console.log('Updating DB...');
        await db.update(submissions)
          .set({ fileUrl, fileType: driveFile.mimeType })
          .where(eq(submissions.id, sub.id));
        console.log(`Fixed! URL: ${fileUrl}\n`);
      } catch (err: any) {
        console.error(`FAILED to fix submission ${sub.id}:`, err.message);
      }
    } else {
      console.log(`Submission ${sub.id} already has a fileUrl or no Drive ID.`);
    }
  }

  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
