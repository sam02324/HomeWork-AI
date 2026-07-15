import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { db } from '@/db';
import { grades, submissions, assignments } from '@/db/schema';
import type { Assignment, Submission, RubricCriteria } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSystemPrompt, buildGradingMessage, buildVisionGradingMessage } from './prompts';
import { getGradeLetter, assertAllowedFileUrl } from '@/lib/utils';
import { createMimoCompletion, getAiModel, getAiProvider, type MimoMessage } from './mimo-client';

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
   Core Grading Function
   ═══════════════════════════════════════ */

/**
 * Grade a single submission using Claude AI.
 * Handles both text and image-based submissions.
 */
export async function gradeSubmission(
  submission: Submission,
  assignment: Assignment
): Promise<void> {
  const rubric = (assignment.rubric || []) as RubricCriteria[];
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
            try {
              const { PDFParse } = await import('pdf-parse');
              const parser = new PDFParse({ data: new Uint8Array(driveFile.buffer) });
              const pdfData = await parser.getText();
              resolvedTextContent = pdfData.text;

              // Also save the extracted text back to the submission for future use
              await db.update(submissions)
                .set({ textContent: resolvedTextContent, fileType: resolvedFileType })
                .where(eq(submissions.id, submission.id));
            } catch (pdfErr) {
              console.error(`PDF parse error during grading for ${submission.googleDriveFileId}:`, pdfErr);
            }
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
        throw new Error('MiMo requires extracted text for PDF submissions');
      }

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
    } else {
      throw new Error('Submission has no content to grade');
    }

    let responseText: string;
    let tokensUsed: number;
    const model = getAiModel();

    if (aiProvider === 'mimo') {
      if (!mimoContent) throw new Error('MiMo received unsupported submission content');
      const response = await createMimoCompletion([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: mimoContent },
      ]);
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
      throw new Error('Claude did not return valid JSON');
    }

    const result: GradingResult = JSON.parse(jsonMatch[0]);
    // 6. Calculate tokens used (handled above)
    // 7. Ensure grade letter is correct
    const percentage = (result.totalScore / assignment.maxScore) * 100;
    const gradeLetter = result.gradeLetter || getGradeLetter(percentage);

    // AI detection is disabled, hardcode default safe values
    const aiDetectionScore = 0;
    const aiDetectionFlag = false;

    // Upsert (SEC-8 / BUG-3): re-grading an errored submission overwrites the
    // existing row instead of crashing on the submissionId UNIQUE constraint.
    // Teacher override fields are intentionally left untouched.
    await db.insert(grades).values({
      submissionId: submission.id,
      totalScore: totalScore.toString(),
      maxScore: assignment.maxScore,
      gradeLetter,
      feedback: result.feedback,
      criteriaScores,
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
        totalScore: totalScore.toString(),
        maxScore: assignment.maxScore,
        gradeLetter,
        feedback: result.feedback,
        criteriaScores,
        strengths: result.strengths,
        improvements: result.improvements,
        aiModel: 'claude-sonnet-4-6',
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
 * Returns count of successfully graded submissions.
 */
export async function gradeAllSubmissions(assignmentId: string): Promise<number> {
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
    return 0;
  }

  // Update assignment status
  await db.update(assignments)
    .set({ status: 'grading' })
    .where(eq(assignments.id, assignmentId));

  let gradedCount = 0;

  // Grade each submission sequentially to avoid rate limits
  for (const submission of toGrade) {
    try {
      await gradeSubmission(submission, assignment);
      gradedCount++;
    } catch (error) {
      console.error(`Failed to grade submission ${submission.id}:`, error);
      // Continue grading other submissions
    }
  }

  // Always release the 'grading' lock based on the *current* DB state (BUG-9):
  // submissions may have been added during the run, so re-query fresh.
  await finalizeAssignmentStatus(assignmentId);

  return gradedCount;
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
