import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/admin/auth';
import {
  AdminMonitoringError,
  sendAdminSentryDiagnostic,
} from '@/lib/admin/monitoring';
import { adminMonitoringTestSchema } from '@/lib/validations';
import {
  errorResponse,
  handleApiError,
  parseBody,
  rateLimitGuard,
  successResponse,
} from '@/lib/utils';

export async function POST(request: Request) {
  const access = await requireAdminApi();
  if (!access.ok) return access.response;

  const limited = rateLimitGuard(`sentry-test:${access.admin.userId}`, 3, 60_000);
  if (limited) return limited;

  const body = await parseBody(request, adminMonitoringTestSchema);
  if (body instanceof NextResponse) return body;

  try {
    return successResponse(await sendAdminSentryDiagnostic(access.admin, body.note));
  } catch (error) {
    if (error instanceof AdminMonitoringError) {
      return errorResponse(error.message, error.status, error.code);
    }
    return handleApiError(error, 'POST /api/admin/monitoring/test');
  }
}
