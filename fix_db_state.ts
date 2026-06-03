import { db } from './src/db';
import { submissions, students } from './src/db/schema';
import { eq } from 'drizzle-orm';
import { PDFParse } from 'pdf-parse';

async function run() {
  const assignmentId = 'ed074027-480e-4ac8-b38a-479cb2ae511b';

  // 1. Fix Rohan's roll number
  const rohan = await db.query.students.findFirst({
    where: eq(students.id, '0cb2b7b0-5162-4177-802c-b89bc1958005')
  });

  if (rohan) {
    console.log('Fixing Rohan roll number to 2511010101');
    await db.update(students).set({ rollNumber: '2511010101' }).where(eq(students.id, rohan.id));
  }

  // 2. Create Soham
  let sohamId = '';
  const existingSoham = await db.query.students.findFirst({
    where: eq(students.rollNumber, '2228484843')
  });

  if (existingSoham && existingSoham.id !== rohan?.id) {
    sohamId = existingSoham.id;
  } else {
    console.log('Creating Soham student...');
    const [soham] = await db.insert(students).values({
      classroomId: 'a9aa3e33-dfeb-4918-a886-397e57cedae9',
      name: 'Soham',
      rollNumber: '2228484843',
      email: 'soham@testing.com'
    }).returning();
    sohamId = soham.id;
  }

  // 3. Re-assign second submission to Soham
  const sub2 = await db.query.submissions.findFirst({
    where: eq(submissions.googleFormResponseId, 'gf_i1w2bl_02062026215716')
  });

  if (sub2) {
    console.log('Re-assigning submission 2 to Soham');
    await db.update(submissions).set({ studentId: sohamId }).where(eq(submissions.id, sub2.id));
  }

  // 4. Extract PDF text for both submissions
  const allSubs = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId)
  });

  for (const sub of allSubs) {
    if (sub.fileUrl && sub.fileType === 'application/pdf') {
      console.log(`Extracting text for ${sub.id}...`);
      try {
        const res = await fetch(sub.fileUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        
        const parser = new PDFParse({ data: new Uint8Array(buffer) });
        const data = await parser.getText();
        
        console.log(`Extracted ${data.text.length} characters.`);
        
        await db.update(submissions).set({ textContent: data.text }).where(eq(submissions.id, sub.id));
      } catch (e) {
        console.error('Failed to extract text:', e);
      }
    }
  }

  process.exit(0);
}

run().catch(e => { console.error('FATAL', e); process.exit(1); });
