import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { db } from '@/db';
import { assignments, submissions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { normalizeAppRole } from '@/lib/auth/roles';
import { deleteManagedSubmissionReferences } from '@/lib/storage/submission-files';

/** POST /api/webhooks/clerk — Sync Clerk user events to database */
export async function POST(request: NextRequest) {
  // This endpoint is public — verify the Svix signature so forged events
  // can't create or delete users. Secret comes from the Clerk Dashboard
  // webhook config (CLERK_WEBHOOK_SECRET, whsec_…).
  let event;
  try {
    event = await verifyWebhook(request, {
      signingSecret: process.env.CLERK_WEBHOOK_SECRET,
    });
  } catch (error) {
    console.error('Clerk webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        const data = event.data;
        const email = data.email_addresses?.[0]?.email_address || '';
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'User';
        const role = normalizeAppRole(data.public_metadata?.role);

        await db
          .insert(users)
          .values({
            id: data.id,
            email,
            name,
            avatarUrl: data.image_url || null,
            role,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email,
              name,
              avatarUrl: data.image_url || null,
              role,
              updatedAt: new Date(),
            },
          });

        break;
      }

      case 'user.deleted': {
        if (event.data.id) {
          const ownedFiles = await db
            .select({ fileReference: submissions.fileUrl })
            .from(submissions)
            .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
            .where(eq(assignments.teacherId, event.data.id));

          await deleteManagedSubmissionReferences(ownedFiles.map((row) => row.fileReference));
          await db.delete(users).where(eq(users.id, event.data.id));
        }
        break;
      }

      default:
        // Ignore unknown event types
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
