import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { assignments, submissions, grades } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getAuthUserId, errorResponse } from '@/lib/utils';
import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

type Params = { params: Promise<{ id: string; subId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const userId = await getAuthUserId();
  if (userId instanceof NextResponse) return userId;

  const { id, subId } = await params;
  const { messages } = await req.json();

  if (!messages || !Array.isArray(messages)) {
    return errorResponse('Missing messages array', 400);
  }

  try {
    // 1. Verify ownership
    const assignment = await db.query.assignments.findFirst({
      where: and(eq(assignments.id, id), eq(assignments.teacherId, userId)),
    });

    if (!assignment) return errorResponse('Assignment not found', 404);

    // 2. Get Submission and Grade
    const submission = await db.query.submissions.findFirst({
      where: eq(submissions.id, subId),
    });

    if (!submission) return errorResponse('Submission not found', 404);

    const grade = await db.query.grades.findFirst({
      where: eq(grades.submissionId, subId),
    });

    if (!grade) return errorResponse('Grade not found', 404);

    // 3. Configure Anthropic Client
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return errorResponse('Missing Anthropic API Key', 500);
    }
    const anthropic = createAnthropic({ apiKey });

    // 4. Construct System Context
    const systemContext = `
You are an expert teacher and AI grading assistant. 
You previously graded a student's submission for the assignment "${assignment.title}".

### Assignment Rubric & Context
Max Score: ${assignment.maxScore}
Reference Answers: ${assignment.referenceAnswers || 'None provided.'}
Special Instructions: ${assignment.gradingInstructions || 'None provided.'}

### Student Submission Text
${submission.textContent || 'No text extracted. Assume the user provided an image or document that you cannot see right now.'}

### Your Initial Grade
Score Given: ${grade.totalScore} / ${grade.maxScore}
Grade Letter: ${grade.gradeLetter}
Your Rationale: ${grade.aiRationale || 'No rationale available.'}
Feedback: ${grade.feedback}

The user (the teacher) is now chatting with you to understand your grading, ask for specific breakdowns, or request you to re-evaluate specific parts. 
Be helpful, professional, and clear. If the teacher asks you to re-evaluate, provide your thoughts, but let them know they can manually override the score using the "Edit Score" option in the UI.
`;

    // 5. Stream the response
    const result = streamText({
      model: anthropic('claude-3-haiku-20240307'), // use haiku to ensure model availability and faster chat
      system: systemContext,
      messages: messages as any[],
      async onFinish({ text }) {
        // Optional: Save chat history to database
        const updatedMessages = [...messages, { role: 'assistant', content: text }];
        await db.update(grades)
          .set({ chatHistory: updatedMessages })
          .where(eq(grades.id, grade.id));
      }
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('POST /api/chat error:', error);
    return errorResponse('Failed to start chat', 500);
  }
}
