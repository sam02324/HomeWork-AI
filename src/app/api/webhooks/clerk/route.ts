import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    [key: string]: unknown;
  };
}

/** POST /api/webhooks/clerk — Sync Clerk user events to database */
export async function POST(request: Request) {
  try {
    const event: ClerkWebhookEvent = await request.json();

    const { type, data } = event;

    switch (type) {
      case 'user.created':
      case 'user.updated': {
        const email = data.email_addresses?.[0]?.email_address || '';
        const name = [data.first_name, data.last_name].filter(Boolean).join(' ') || 'User';

        await db
          .insert(users)
          .values({
            id: data.id,
            email,
            name,
            avatarUrl: data.image_url || null,
            role: 'teacher', // Default role
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email,
              name,
              avatarUrl: data.image_url || null,
              updatedAt: new Date(),
            },
          });

        break;
      }

      case 'user.deleted': {
        if (data.id) {
          await db.delete(users).where(eq(users.id, data.id));
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
