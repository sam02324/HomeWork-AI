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

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';
  const teacherId = 'user_3EJvUo6mdIKbzwnudQJGvHZVs8S';

  // Step 1: Delete both broken submissions
  console.log('Deleting broken submissions...');
  await db.delete(submissions).where(eq(submissions.assignmentId, assignmentId));
  console.log('Deleted.');

  // Step 2: Download the file from Google Drive
  const driveFileId = '1QhD2PHOucqcZdC4o2NfOj8V3clOFYgY1';
  console.log(`Downloading file ${driveFileId} from Drive...`);
  
  try {
    const driveFile = await downloadDriveFile(driveFileId, teacherId);
    console.log(`Downloaded: ${driveFile.name} (${driveFile.mimeType}, ${driveFile.buffer.length} bytes)`);

    // Step 3: Upload to R2
    const ext = driveFile.name.split('.').pop() || 'bin';
    const filename = `submissions/${teacherId}/${randomUUID()}.${ext}`;
    const s3 = getR2Client();
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: filename,
      Body: driveFile.buffer,
      ContentType: driveFile.mimeType,
    }));
    const fileUrl = `${process.env.R2_PUBLIC_URL}/${filename}`;
    console.log(`Uploaded to R2: ${fileUrl}`);

    // Step 4: Create the submission properly
    const [sub] = await db.insert(submissions).values({
      assignmentId,
      studentId: '0cb2b7b0-5162-4177-802c-b89bc1958005',
      fileUrl,
      fileType: driveFile.mimeType,
      status: 'pending',
      googleFormResponseId: 'gf_53s29j_02062026201845',
      googleDriveFileId: driveFileId,
      submittedAt: new Date('2026-06-02T20:18:45'),
    }).returning();

    console.log(`Created submission: ${sub.id}`);
    console.log(`File URL: ${fileUrl}`);
    console.log('SUCCESS!');
  } catch (err: any) {
    console.error('DOWNLOAD FAILED:', err.message);
    console.error('Full error:', err);
    
    // Still create the submission without file, but log why
    console.log('\nCreating submission without file...');
    const [sub] = await db.insert(submissions).values({
      assignmentId,
      studentId: '0cb2b7b0-5162-4177-802c-b89bc1958005',
      fileUrl: `https://drive.google.com/open?id=${driveFileId}`,
      fileType: 'application/pdf',
      status: 'pending',
      googleFormResponseId: 'gf_53s29j_02062026201845',
      googleDriveFileId: driveFileId,
      submittedAt: new Date('2026-06-02T20:18:45'),
    }).returning();
    console.log(`Created submission with direct Drive link: ${sub.id}`);
  }

  process.exit(0);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
