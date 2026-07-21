import { requireAdminApi } from '@/lib/admin/auth';
import { handleApiError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** GET /api/admin/session - verifies both the session claim and live Clerk metadata. */
export async function GET() {
  try {
    const access = await requireAdminApi();
    if (!access.ok) return access.response;

    return successResponse({
      admin: {
        userId: access.admin.userId,
        name: access.admin.name,
        email: access.admin.email,
        role: access.admin.role,
      },
      checks: {
        authenticated: true,
        sessionRole: true,
        clerkMetadata: true,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/session');
  }
}
