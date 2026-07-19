import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { db } from '@/db';
import { grades, submissions, assignments } from '@/db/schema';
import type { Assignment, Submission, CriterionScore, RubricCriteria } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSystemPrompt, buildGradingMessage, buildVisionGradingMessage } from './prompts';
import { getGradeLetter, assertAllowedFileUrl } from '@/lib/utils';
import { getEffectiveRubric } from './grading-rubric';

const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-6';

/* ═══════════════════════════════════════
   Claude Client (singleton)
   ═══════════════════════════════════════ */

let client: Anthropic | null = null;

function getClient(): Anthropic | null {
  if (!client) {
    if (process.env.ANTHROPIC_API_KEY) {
      client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
  }
  return client;
}

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface GradingResult {
  totalScore: number;
  criteriaScores: CriterionScore[];
  feedback: string;
  strengths: string[];
  improvements: string[];
  gradeLetter: string;
  aiRationale: string;
}

const gradingResultSchema: z.ZodType<GradingResult> = z.object({
  totalScore: z.number().finite().nonnegative(),
  criteriaScores: z.array(z.object({
    criterionName: z.string().min(1),
    score: z.number().finite().nonnegative(),
    maxScore: z.number().finite().positive(),
    feedback: z.string(),
  })).min(1),
  feedback: z.string().min(1),
  strengths: z.array(z.string().min(1)).min(1),
  improvements: z.array(z.string().min(1)).min(1),
  gradeLetter: z.string().min(1),
  aiRationale: z.string().min(1),
});

function applyRubricMath(
  result: GradingResult,
  rubric: RubricCriteria[],
  assignmentMaxScore: number
): GradingResult {
  if (result.totalScore > assignmentMaxScore) {
    throw new Error('Grading response total exceeds the assignment maximum');
  }
  if (rubric.length === 0) return result;

  if (result.criteriaScores.length !== rubric.length) {
    throw new Error('Grading response omitted rubric criteria');
  }

  const totalWeight = rubric.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (totalWeight <= 0) throw new Error('Assignment rubric has no positive weight');

  let weightedRatio = 0;
  for (let index = 0; index < rubric.length; index++) {
    const criterion = result.criteriaScores[index];
    if (criterion.score > criterion.maxScore) {
      throw new Error(`Criterion score exceeds maximum for ${criterion.criterionName}`);
    }
    weightedRatio += (criterion.score / criterion.maxScore) * (rubric[index].weight / totalWeight);
  }

  return {
    ...result,
    totalScore: Number((weightedRatio * assignmentMaxScore).toFixed(2)),
  };
}

/* ═══════════════════════════════════════
   Core Grading Function
   ═══════════════════════════════════════ */

/**
 * Grade a single submission using Claude.
 * Handles both text and image-based submissions.
 */
export async function gradeSubmission(
  submission: Submission,
  assignment: Assignment
): Promise<void> {
  const rubric = getEffectiveRubric(assignment);
  const anthropic = getClient();

  // 1. Update submission status to 'grading'
  await db.update(submissions)
    .set({ status: 'grading' })
    .where(eq(submissions.id, submission.id));

  try {
    // 2. Build system prompt with rubric context
    const systemPrompt = buildSystemPrompt(
      rubric,
      assignment.referenceAnswers,
      assignment.gradingInstructions,
      assignment.strictness,
      assignment.maxScore
    );

    // 3. Build the user message based on submission type
    let userContent: Anthropic.MessageParam['content'];

    // If we have no textContent but have a googleDriveFileId, try to fetch and extract now
    let resolvedTextContent = submission.textContent;
    let resolvedFileType = submission.fileType;
    let resolvedFileBuffer: Buffer | null = null;

    if (!resolvedTextContent && submission.googleDriveFileId) {
      try {
        // Dynamically import to avoid circular deps
        const { downloadDriveFile } = await import('@/lib/google-sheets');
        // Find the teacher's userId from the assignment
        const assignmentRecord = await db.query.assignments.findFirst({
          where: eq(assignments.id, submission.assignmentId),
          columns: { teacherId: true },
        });

        if (assignmentRecord) {
          // Check if teacher has OAuth tokens
          const { googleTokens } = await import('@/db/schema');
          const tokenRecord = await db.query.googleTokens.findFirst({
            where: eq(googleTokens.userId, assignmentRecord.teacherId),
          });
          const oauthUserId = tokenRecord ? assignmentRecord.teacherId : undefined;

          const driveFile = await downloadDriveFile(submission.googleDriveFileId, oauthUserId);
          resolvedFileType = driveFile.mimeType;
          resolvedFileBuffer = driveFile.buffer;

          if (driveFile.mimeType === 'application/pdf') {
            let parser: InstanceType<(typeof import('pdf-parse'))['PDFParse']> | null = null;
            try {
              const { PDFParse } = await import('pdf-parse');
              parser = new PDFParse({ data: new Uint8Array(driveFile.buffer) });
              const pdfData = await parser.getText();
              resolvedTextContent = pdfData.text.trim();
            } catch (pdfErr) {
              console.error(`PDF parse error during grading for ${submission.googleDriveFileId}:`, pdfErr);
            } finally {
              await parser?.destroy();
            }

            // Cache extracted text; scanned PDFs remain native Claude documents.
            await db.update(submissions)
              .set({ textContent: resolvedTextContent || null, fileType: resolvedFileType })
              .where(eq(submissions.id, submission.id));
          }
        }
      } catch (driveErr) {
        console.error(`Failed to download Drive file during grading for ${submission.googleDriveFileId}:`, driveErr);
      }
    }

    if (resolvedTextContent) {
      // Text submission
      userContent = buildGradingMessage(resolvedTextContent);
    } else if (resolvedFileBuffer && resolvedFileType?.startsWith('image/')) {
      // Image downloaded from Drive
      const base64 = resolvedFileBuffer.toString('base64');
      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (resolvedFileType === 'image/png') mediaType = 'image/png';
      else if (resolvedFileType === 'image/gif') mediaType = 'image/gif';
      else if (resolvedFileType === 'image/webp') mediaType = 'image/webp';

      userContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: buildVisionGradingMessage(),
        },
      ];
    } else if (submission.fileUrl && (submission.fileType === 'image' || submission.fileType?.startsWith('image/'))) {
      // Fetch image from URL and convert to base64 (origin-restricted — SEC-7b)
      assertAllowedFileUrl(submission.fileUrl);
      const response = await fetch(submission.fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      let mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
      if (submission.fileType === 'image/png') mediaType = 'image/png';
      else if (submission.fileType === 'image/gif') mediaType = 'image/gif';
      else if (submission.fileType === 'image/webp') mediaType = 'image/webp';

      userContent = [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mediaType,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: buildVisionGradingMessage(),
        },
      ];
    } else if (resolvedFileBuffer && resolvedFileType === 'application/pdf') {
      // Claude accepts scanned PDFs natively, preserving every page for grading.
      const base64 = resolvedFileBuffer.toString('base64');
      userContent = [
        {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        },
        {
          type: 'text' as const,
          text: buildVisionGradingMessage(),
        },
      ];
    } else {
      throw new Error('Submission has no content to grade');
    }

    if (!anthropic) {
      throw new Error('Anthropic API Key is missing. Please add ANTHROPIC_API_KEY to your environment variables.');
    }

    const model = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`${model} did not return valid grading JSON`);
    }

    const parsedResult = gradingResultSchema.parse(JSON.parse(jsonMatch[0]));
    const result = applyRubricMath(parsedResult, rubric, assignment.maxScore);
    // 6. Calculate tokens used (handled above)
    // 7. Ensure grade letter is correct
    const percentage = (result.totalScore / assignment.maxScore) * 100;
    const gradeLetter = getGradeLetter(percentage);

    // AI detection is disabled, hardcode default safe values
    const aiDetectionScore = 0;
    const aiDetectionFlag = false;

    // Upsert (SEC-8 / BUG-3): re-grading an errored submission overwrites the
    // existing row instead of crashing on the submissionId UNIQUE constraint.
    // Teacher override fields are intentionally left untouched.
    await db.insert(grades).values({
      submissionId: submission.id,
      totalScore: result.totalScore.toString(),
      maxScore: assignment.maxScore,
      gradeLetter,
      feedback: result.feedback,
      criteriaScores: result.criteriaScores,
      strengths: result.strengths,
      improvements: result.improvements,
      aiModel: model,
      aiTokensUsed: tokensUsed,
      aiDetectionScore,
      aiDetectionFlag,
      aiRationale: result.aiRationale,
    }).onConflictDoUpdate({
      target: grades.submissionId,
      set: {
        totalScore: result.totalScore.toString(),
        maxScore: assignment.maxScore,
        gradeLetter,
        feedback: result.feedback,
        criteriaScores: result.criteriaScores,
        strengths: result.strengths,
        improvements: result.improvements,
        aiModel: model,
        aiTokensUsed: tokensUsed,
        aiDetectionScore,
        aiDetectionFlag,
        aiRationale: result.aiRationale,
        gradedAt: new Date(),
      },
    });

    // 9. Update submission status to 'graded'
    await db.update(submissions)
      .set({ status: 'graded' })
      .where(eq(submissions.id, submission.id));

  } catch (error) {
    // Mark submission as error
    await db.update(submissions)
      .set({ status: 'error' })
      .where(eq(submissions.id, submission.id));

    console.error(`Grading failed for submission ${submission.id}:`, error);
    throw error;
  }
}

/**
 * Grade all pending submissions for an assignment.
 * Returns counts and safe, actionable failure messages for the UI.
 */
export interface GradingBatchResult {
  gradedCount: number;
  failedCount: number;
  errors: string[];
}

function getSafeGradingError(error: unknown): string {
  const message = error instanceof Error ? error.message : '';
  const status = error instanceof Anthropic.APIError ? error.status : undefined;

  if (message.includes('Anthropic API Key') || status === 401 || status === 403) {
    return 'The AI grading service is not configured correctly. Contact the application administrator.';
  }
  if (status === 429) {
    return 'The AI grading service is busy. Wait briefly and retry grading.';
  }
  if (status && status >= 500) {
    return 'The AI grading service is temporarily unavailable. Retry grading in a moment.';
  }
  if (message.includes('no content to grade') || message.includes('unsupported submission content')) {
    return 'The submission has no readable text or supported file content.';
  }
  if (message.includes('valid grading JSON') || message.includes('Unexpected token')) {
    return 'The AI grading service returned an invalid response. Retry the submission.';
  }
  if (
    error instanceof z.ZodError ||
    message.includes('rubric criteria') ||
    message.includes('Criterion score exceeds') ||
    message.includes('total exceeds')
  ) {
    return 'The AI grading service returned inconsistent rubric scores. Retry grading; no inaccurate grade was saved.';
  }
  if (message.includes('Google') || message.includes('Drive')) {
    return 'The submission file could not be downloaded from Google Drive. Reconnect Google and retry.';
  }

  return 'AI grading failed. Check the Railway deployment logs for the grading error.';
}

export async function gradeAllSubmissions(assignmentId: string): Promise<GradingBatchResult> {
  // Get assignment
  const assignment = await db.query.assignments.findFirst({
    where: eq(assignments.id, assignmentId),
  });

  if (!assignment) {
    throw new Error('Assignment not found');
  }

  // Get pending submissions
  const pendingSubmissions = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  });

  const toGrade = pendingSubmissions.filter((s) => s.status === 'pending' || s.status === 'error');

  if (toGrade.length === 0) {
    // Nothing to grade. The caller has already flipped status to 'grading', so
    // we MUST release that lock here (BUG-2) — pick the correct terminal state.
    await finalizeAssignmentStatus(assignmentId);
    return { gradedCount: 0, failedCount: 0, errors: [] };
  }

  // Update assignment status
  await db.update(assignments)
    .set({ status: 'grading' })
    .where(eq(assignments.id, assignmentId));

  let gradedCount = 0;
  let failedCount = 0;
  const errors = new Set<string>();

  // Grade each submission sequentially to avoid rate limits
  for (const submission of toGrade) {
    try {
      await gradeSubmission(submission, assignment);
      gradedCount++;
    } catch (error) {
      console.error(`Failed to grade submission ${submission.id}:`, error);
      failedCount++;
      errors.add(getSafeGradingError(error));
      // Continue grading other submissions
    }
  }

  // Always release the 'grading' lock based on the *current* DB state (BUG-9):
  // submissions may have been added during the run, so re-query fresh.
  await finalizeAssignmentStatus(assignmentId);

  return { gradedCount, failedCount, errors: [...errors] };
}

/**
 * Move an assignment off the transient 'grading' status to a terminal state,
 * derived from the live submission rows. Guarantees the lock is released even
 * when new submissions arrived mid-run or nothing was pending to begin with.
 */
async function finalizeAssignmentStatus(assignmentId: string): Promise<void> {
  const current = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  });

  const fullyGraded =
    current.length > 0 && current.every((s) => s.status === 'graded' || s.status === 'error');

  await db.update(assignments)
    .set({ status: fullyGraded ? 'graded' : 'published', updatedAt: new Date() })
    .where(eq(assignments.id, assignmentId));
}
