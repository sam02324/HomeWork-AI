import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { db } from '@/db';
import { grades, submissions, assignments } from '@/db/schema';
import type { Assignment, Submission, CriterionScore, RubricCriteria } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSystemPrompt, buildGradingMessage, buildVisionGradingMessage } from './prompts';
import { getGradeLetter, assertAllowedFileUrl } from '@/lib/utils';
import { createMimoCompletion, getAiModel, getAiProvider, type MimoMessage } from './mimo-client';
import { getEffectiveRubric } from './grading-rubric';

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

async function extractScannedPdfText(pdfBuffer: Buffer): Promise<string | null> {
  const ocrClient = getClient();
  if (!ocrClient) return null;

  const response = await ocrClient.messages.create({
    model: process.env.ANTHROPIC_OCR_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6',
    max_tokens: 8000,
    system: 'You are a high-accuracy OCR engine. Transcribe faithfully without grading, summarizing, or inventing missing content.',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBuffer.toString('base64'),
            },
          },
          {
            type: 'text',
            text: `Extract every readable student answer from every page.
Preserve question numbers, equations, mathematical notation, units, chemical formulae, tables, and labels.
Describe diagrams with their visible labels and relationships.
Mark uncertain text as [unclear] instead of guessing.
Return plain text only and preserve page breaks.`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return text || null;
}

/* ═══════════════════════════════════════
   Core Grading Function
   ═══════════════════════════════════════ */

/**
 * Grade a single submission using the configured AI provider.
 * Handles both text and image-based submissions.
 */
export async function gradeSubmission(
  submission: Submission,
  assignment: Assignment
): Promise<void> {
  const rubric = getEffectiveRubric(assignment);
  const aiProvider = getAiProvider();
  const anthropic = aiProvider === 'anthropic' ? getClient() : null;

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
    let mimoContent: MimoMessage['content'] | null = null;

    // If we have no textContent but have a googleDriveFileId, try to fetch and extract now
    let resolvedTextContent = submission.textContent;
    let resolvedFileType = submission.fileType;
    let resolvedFileBuffer: Buffer | null = null;
    let mimoPdfPages: Array<{
      type: 'image_url';
      image_url: { url: string };
    }> = [];

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

              // MiMo does not accept PDF documents directly. For scanned PDFs,
              // render every page when the document is short. Longer scans use
              // full-document OCR below so no answers are silently omitted.
              if (!resolvedTextContent && aiProvider === 'mimo') {
                const info = await parser.getInfo();
                if (info.total <= 4) {
                  const screenshots = await parser.getScreenshot({
                    desiredWidth: 1400,
                    imageBuffer: false,
                    imageDataUrl: true,
                  });
                  mimoPdfPages = screenshots.pages.map((page) => ({
                    type: 'image_url' as const,
                    image_url: { url: page.dataUrl },
                  }));
                }
              }
            } catch (pdfErr) {
              console.error(`PDF parse error during grading for ${submission.googleDriveFileId}:`, pdfErr);
            } finally {
              await parser?.destroy();
            }

            // Some server runtimes cannot rasterize PDFs. Use document OCR as
            // a fallback, then keep MiMo as the grading model.
            if (!resolvedTextContent && aiProvider === 'mimo' && mimoPdfPages.length === 0) {
              try {
                resolvedTextContent = await extractScannedPdfText(driveFile.buffer);
              } catch (ocrError) {
                console.error(`PDF OCR fallback failed for ${submission.googleDriveFileId}:`, ocrError);
              }
            }

            // Cache extracted/OCR text so retries do not repeat document processing.
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
      mimoContent = userContent;
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
      mimoContent = [
        {
          type: 'image_url',
          image_url: { url: `data:${mediaType};base64,${base64}` },
        },
        { type: 'text', text: buildVisionGradingMessage() },
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
      mimoContent = [
        {
          type: 'image_url',
          image_url: { url: `data:${mediaType};base64,${base64}` },
        },
        { type: 'text', text: buildVisionGradingMessage() },
      ];
    } else if (resolvedFileBuffer && resolvedFileType === 'application/pdf') {
      if (aiProvider === 'mimo') {
        if (mimoPdfPages.length === 0) {
          throw new Error('The scanned PDF could not be converted into images for grading');
        }
        userContent = buildVisionGradingMessage();
        mimoContent = [
          ...mimoPdfPages,
          { type: 'text', text: buildVisionGradingMessage() },
        ];
      } else {
        // PDF downloaded from Drive but text extraction failed — send as document
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
      }
    } else {
      throw new Error('Submission has no content to grade');
    }

    let responseText: string;
    let tokensUsed: number;
    const model = getAiModel();

    if (aiProvider === 'mimo') {
      if (!mimoContent) throw new Error('MiMo received unsupported submission content');
      const response = await createMimoCompletion(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: mimoContent },
        ],
        12_000,
        {
          // Grading favors reasoning quality over latency; chat keeps the global setting.
          thinking: process.env.MIMO_GRADING_THINKING === 'disabled' ? 'disabled' : 'enabled',
          temperature: 0.1,
          jsonMode: true,
        }
      );
      responseText = response.text;
      tokensUsed = response.tokensUsed;
    } else {
      if (!anthropic) {
        throw new Error('Anthropic API Key is missing. Please add ANTHROPIC_API_KEY to your environment variables.');
      }

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

      responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');
      tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    }

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

  if (message.includes('MIMO_API_KEY')) {
    return 'MiMo is not configured in Railway. Add MIMO_API_KEY and redeploy.';
  }
  if (/MiMo API error \((401|403)\)/.test(message)) {
    return 'MiMo rejected the Railway API key. Replace MIMO_API_KEY and redeploy.';
  }
  if (message.includes('MiMo API error (429)')) {
    return 'MiMo rate limit reached. Wait briefly and retry grading.';
  }
  if (/MiMo API error \((400|413)\)/.test(message)) {
    return 'MiMo rejected the scanned-PDF image payload. Try a smaller PDF or image submission.';
  }
  if (/MiMo API error \(5\d\d\)/.test(message)) {
    return 'MiMo is temporarily unavailable. Retry grading in a moment.';
  }
  if (message.includes('scanned PDF could not be converted')) {
    return 'Automatic PDF processing failed. Verify ANTHROPIC_API_KEY in Railway and retry.';
  }
  if (message.includes('no content to grade') || message.includes('unsupported submission content')) {
    return 'The submission has no readable text or supported file content.';
  }
  if (message.includes('valid grading JSON') || message.includes('Unexpected token')) {
    return 'MiMo returned an invalid grading response. Retry the submission.';
  }
  if (
    error instanceof z.ZodError ||
    message.includes('rubric criteria') ||
    message.includes('Criterion score exceeds') ||
    message.includes('total exceeds')
  ) {
    return 'MiMo returned inconsistent rubric scores. Retry grading; no inaccurate grade was saved.';
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
