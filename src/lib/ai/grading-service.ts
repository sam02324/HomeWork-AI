import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { grades, submissions, assignments } from '@/db/schema';
import type { Assignment, Submission, CriterionScore, RubricCriteria } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { buildSystemPrompt, buildGradingMessage, buildVisionGradingMessage } from './prompts';
import { getGradeLetter } from '@/lib/utils';

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
  aiDetectionScore?: number;
  aiDetectionReason?: string;
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

    if (submission.textContent) {
      // Text submission
      userContent = buildGradingMessage(submission.textContent);
    } else if (submission.fileUrl && (submission.fileType === 'image' || submission.fileType?.startsWith('image/'))) {
      // Fetch image and convert to base64
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
    } else if (submission.fileUrl) {
      // PDF or other file — for now, treat URL as context
      userContent = buildGradingMessage(
        `[Student submitted a ${submission.fileType || 'file'} at: ${submission.fileUrl}]\n\n` +
        (submission.textContent || 'No text content extracted from file.')
      );
    } else {
      throw new Error('Submission has no content to grade');
    }

    let result: GradingResult;
    let tokensUsed = 0;

    if (!anthropic) {
      throw new Error('Anthropic API Key is missing. Please add ANTHROPIC_API_KEY to your environment variables.');
    }

    // 4. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-4-5-sonnet-latest',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
    });

    // 5. Parse response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Claude did not return valid JSON');
    }

    result = JSON.parse(jsonMatch[0]);
    tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

    // 6. Calculate tokens used (handled above)
    // 7. Ensure grade letter is correct
    const percentage = (result.totalScore / assignment.maxScore) * 100;
    const gradeLetter = result.gradeLetter || getGradeLetter(percentage);

    // 8. Save grade to database
    const aiDetectionScore = result.aiDetectionScore ?? 0;
    const aiDetectionFlag = aiDetectionScore > 60;

    await db.insert(grades).values({
      submissionId: submission.id,
      totalScore: result.totalScore.toString(),
      maxScore: assignment.maxScore,
      gradeLetter,
      feedback: result.feedback,
      criteriaScores: result.criteriaScores,
      strengths: result.strengths,
      improvements: result.improvements,
      aiModel: 'claude-sonnet-4-20250514',
      aiTokensUsed: tokensUsed,
      aiDetectionScore,
      aiDetectionFlag,
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

  const toGrade = pendingSubmissions.filter((s) => s.status === 'pending');

  if (toGrade.length === 0) {
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

  // Update assignment status to 'graded' if all done
  const remainingPending = await db.query.submissions.findMany({
    where: eq(submissions.assignmentId, assignmentId),
  });

  const allGraded = remainingPending.every((s) => s.status === 'graded' || s.status === 'error');

  if (allGraded) {
    await db.update(assignments)
      .set({ status: 'graded', updatedAt: new Date() })
      .where(eq(assignments.id, assignmentId));
  }

  return gradedCount;
}
