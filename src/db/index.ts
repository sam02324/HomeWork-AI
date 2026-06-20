import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Fail fast — a silent mock connection hides misconfiguration and corrupts
  // every downstream query.
  throw new Error('DATABASE_URL is not set. Configure it in your environment before starting the app.');
}

const sql = neon(databaseUrl);

export const db = drizzle(sql, { schema });

export type Database = typeof db;
