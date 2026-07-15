import { NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, submissions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserId, errorResponse, handleApiError } from '@/lib/utils';

type Params = { params: Promise<{ id: string }> };

/** Escape a CSV cell (wrap in quotes, double internal quotes). */
function csvCell(value: unknown): string {
  let s = value == null ? '' : String(value);
  // SEC-6: neutralize spreadsheet formula injection. A cell beginning with one
  // of these triggers formula evaluation in Excel/Sheets — prefix with a quote
  // so it's treated as literal text (e.g. =HYPERLINK(...) -> '=HYPERLINK(...)).
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

/** GET /api/assignments/[id]/export — Download grades for an assignment as CSV. */
export async function GET(_req: Request, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;

  try {
    // Ownership check.
    const assignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
    });
    if (!assignment) return errorResponse('Assignment not found', 404);

    // Single query with relations — avoids N+1 over submissions.
    const rows = await db.query.submissions.findMany({
      where: eq(submissions.assignmentId, id),
      with: { student: true, grade: true },
    });

    const header = [
      'Roll Number',
      'Student Name',
      'Email',
      'Status',
      'Score',
      'Max Score',
      'Percentage',
      'Grade',
      'Teacher Override',
      'Feedback',
    ];

    const body = rows.map((r) => {
      const g = r.grade;
      const score = g?.teacherOverrideScore ?? g?.totalScore ?? '';
      const pct =
        g && g.maxScore
          ? Math.round((Number(g.teacherOverrideScore ?? g.totalScore) / g.maxScore) * 1000) / 10
          : '';
      return [
        r.student?.rollNumber ?? '',
        r.student?.name ?? '',
        r.student?.email ?? '',
        r.status,
        score,
        g?.maxScore ?? assignment.maxScore,
        pct,
        g?.gradeLetter ?? '',
        g?.teacherOverrideScore != null ? 'Yes' : 'No',
        g?.feedback ?? '',
      ]
        .map(csvCell)
        .join(',');
    });

    const csv = [header.map(csvCell).join(','), ...body].join('\r\n');
    const safeName = assignment.title.replace(/[^a-z0-9]+/gi, '_').toLowerCase();

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="grades_${safeName}.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'GET /api/assignments/[id]/export');
  }
}
