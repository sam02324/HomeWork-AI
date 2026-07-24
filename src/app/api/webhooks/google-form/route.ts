import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * The original Apps Script webhook used one shared secret and a caller-provided
 * teacher email. It is retired because that cannot provide tenant isolation.
 * Teachers must use the authenticated Google OAuth sync flow instead.
 */
export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'This legacy webhook is retired. Connect Google from GradeAI and sync the assignment.',
    code: 'LEGACY_WEBHOOK_RETIRED',
  }, { status: 410 });
}
