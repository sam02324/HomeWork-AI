import 'server-only';

import { auth, clerkClient } from '@clerk/nextjs/server';
import { notFound, redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { errorResponse } from '@/lib/utils';
import { isAdminRole, normalizeAppRole } from '@/lib/auth/roles';

export interface AdminPrincipal {
  userId: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: 'admin';
}

interface AdminSession {
  userId: string;
  role: 'admin';
}

export type AdminApiAccess =
  | { ok: true; admin: AdminPrincipal }
  | { ok: false; response: NextResponse };

async function readAdminSession(): Promise<
  | { status: 'unauthenticated' }
  | { status: 'forbidden' }
  | { status: 'authorized'; session: AdminSession }
> {
  const { userId, sessionClaims } = await auth();

  if (!userId) return { status: 'unauthenticated' };
  if (!isAdminRole(sessionClaims?.metadata?.role)) return { status: 'forbidden' };

  return {
    status: 'authorized',
    session: { userId, role: 'admin' },
  };
}

async function verifyAdminMetadata(userId: string): Promise<AdminPrincipal | null> {
  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const primaryEmail = user.emailAddresses.find(
    (email) => email.id === user.primaryEmailAddressId
  )?.emailAddress;
  const email = primaryEmail ?? user.emailAddresses[0]?.emailAddress ?? '';
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'GradeAI owner';
  const liveRole = normalizeAppRole(user.publicMetadata.role);

  // Clerk remains the authorization source. This upsert only repairs reporting
  // drift when a webhook was delayed or missed; the database can never grant access.
  if (email) {
    try {
      await db.insert(users).values({
        id: user.id,
        name,
        email,
        avatarUrl: user.imageUrl || null,
        role: liveRole,
      }).onConflictDoUpdate({
        target: users.id,
        set: {
          name,
          email,
          avatarUrl: user.imageUrl || null,
          role: liveRole,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      // Keep the Clerk boundary usable during a database incident so the owner
      // can still reach the health page and see the failed Neon probe.
      console.error('Admin reporting-role reconciliation failed:', error);
    }
  }

  // The Backend API check makes role removal effective even with a stale session claim.
  if (!isAdminRole(user.publicMetadata.role)) return null;

  return {
    userId: user.id,
    name,
    email,
    imageUrl: user.imageUrl || null,
    role: 'admin',
  };
}

/** Fast layout guard. Every page must still call requireAdminPage(). */
export async function requireAdminLayout(): Promise<AdminSession> {
  const access = await readAdminSession();

  if (access.status === 'unauthenticated') {
    redirect('/sign-in?redirect_url=%2Fadmin');
  }
  if (access.status === 'forbidden') {
    notFound();
  }

  return access.session;
}

/**
 * Page-level authorization boundary. This must be called by every admin page,
 * because layouts are not re-evaluated on every client-side navigation.
 */
export async function requireAdminPage(): Promise<AdminPrincipal> {
  const session = await requireAdminLayout();
  const admin = await verifyAdminMetadata(session.userId);

  if (!admin) notFound();
  return admin;
}

/** Every /api/admin route calls this before reading or mutating protected data. */
export async function requireAdminApi(): Promise<AdminApiAccess> {
  const access = await readAdminSession();

  if (access.status === 'unauthenticated') {
    return {
      ok: false,
      response: errorResponse('Authentication required', 401, 'UNAUTHORIZED'),
    };
  }
  if (access.status === 'forbidden') {
    return {
      ok: false,
      response: errorResponse('Administrator access required', 403, 'FORBIDDEN'),
    };
  }

  const admin = await verifyAdminMetadata(access.session.userId);
  if (!admin) {
    return {
      ok: false,
      response: errorResponse('Administrator access required', 403, 'FORBIDDEN'),
    };
  }

  return { ok: true, admin };
}
