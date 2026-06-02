import { db } from './src/db';
import { googleTokens } from './src/db/schema';
import { getOAuthClientForUser } from './src/lib/google-sheets';
import { google } from 'googleapis';

async function run() {
  const tokens = await db.query.googleTokens.findMany();
  const token = tokens[0];
  const auth = await getOAuthClientForUser(token.userId);
  const drive = google.drive({ version: 'v3', auth });
  
  try {
    const res1 = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.folder' and trashed=false",
      fields: 'files(id, name)',
    });
    console.log(`Without supportsAllDrives: ${res1.data.files?.length || 0}`);
  } catch (e: any) {
    console.error('ERROR 1:', e.message);
  }
  process.exit(0);
}
run();
