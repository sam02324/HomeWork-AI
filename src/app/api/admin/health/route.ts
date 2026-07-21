import { requireAdminApi } from '@/lib/admin/auth';
import { getAdminHealthOverview } from '@/lib/admin/health';
import { handleApiError, successResponse } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;

  try {
    return successResponse(await getAdminHealthOverview());
  } catch (error) {
    return handleApiError(error, 'GET /api/admin/health');
  }
}
