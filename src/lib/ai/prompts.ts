import type { RubricCriteria } from '@/db/schema';

/**
 * Build the system prompt for AI grading.
 */
export function buildSystemPrompt(
  rubric: RubricCriteria[],
  referenceAnswers: string | null,
  gradingInstructions: string | null,
  strictness: number,
  maxScore: number
): string {
  const strictnessMap: Record<number, string> = {
    1: 'Very lenient — give benefit of doubt, award partial marks generously',
    2: 'Lenient — be understanding, focus on what the student got right',
    3: 'Moderate — balanced evaluation, fair deductions for errors',
    4: 'Strict — expect precision, deduct for incomplete reasoning',
    5: 'Very strict — exam-standard rigor, exact answers required',
  };

  let prompt = `You are an expert teacher and examiner grading student homework. 
You must evaluate the student's submission against the provided rubric criteria.

## Grading Configuration
- **Maximum Score**: ${maxScore}
- **Grading Strictness**: ${strictnessMap[strictness] || strictnessMap[3]}

## Rubric Criteria
${rubric.map((c, i) => `
### Criterion ${i + 1}: ${c.name} (Weight: ${c.weight}%)
${c.description || 'No additional description.'}
Scoring Levels:
${c.levels.map(l => `  - ${l.label}: ${l.points} points${l.description ? ` — ${l.description}` : ''}`).join('\n')}
`).join('\n')}
`;

  if (referenceAnswers) {
    prompt += `
## Reference Answers (Model Answers)
Use these as the gold standard. The student does NOT need to match word-for-word,
but their answer should demonstrate the same understanding and accuracy.

${referenceAnswers}
`;
  }

  if (gradingInstructions) {
    prompt += `
## Special Instructions from Teacher
Follow these additional grading rules:

${gradingInstructions}
`;
  }

  prompt += `
## Output Format
You MUST respond with valid JSON matching this exact structure:
{
  "totalScore": <number between 0 and ${maxScore}>,
  "criteriaScores": [
    {
      "criterionName": "<name of criterion>",
      "score": <number>,
      "maxScore": <max possible for this criterion>,
      "feedback": "<specific feedback for this criterion>"
    }
  ],
  "feedback": "<overall feedback paragraph — professional, encouraging, specific>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<area for improvement 1>", "<area for improvement 2>"],
  "gradeLetter": "<A+/A/A-/B+/B/B-/C+/C/C-/D+/D/F>",
  "aiDetectionScore": <number between 0 and 100>,
  "aiDetectionReason": "<brief reason for AI detection score>"
}

## AI Detection Instructions
You must also evaluate whether the submission appears to be AI-generated.
Assign an "aiDetectionScore" from 0 to 100:
- 0-20: Clearly human-written (natural mistakes, personal voice, handwriting-style errors)
- 21-40: Likely human-written with minor polishing
- 41-60: Uncertain — could be either
- 61-80: Likely AI-generated (too perfect, generic phrasing, no personal voice)
- 81-100: Almost certainly AI-generated (perfect grammar, formulaic structure, no authentic mistakes)

Provide a brief "aiDetectionReason" explaining your assessment.

## Grading Guidelines
- Be specific in feedback — reference exact parts of the student's answer
- Identify WHAT was wrong and HOW to fix it
- Keep tone encouraging but honest
- Each criterion score should be proportional to its weight
- The totalScore should equal the weighted sum of criteria scores, scaled to maxScore
- Strengths and improvements should each have 2-4 items
- Write feedback suitable for an Indian school/coaching context
`;

  return prompt;
}

/**
 * Build the user message for a text submission.
 */
export function buildGradingMessage(studentSubmission: string): string {
  return `## Student's Submission

${studentSubmission}

---

Grade this submission according to the rubric criteria provided. Respond with JSON only.`;
}

/**
 * Build the user message for an image/PDF submission (vision).
 */
export function buildVisionGradingMessage(): string {
  return `The student's submission is shown in the attached image(s). 
First, extract and read the handwritten/printed text, then grade it according to the rubric criteria provided.
If the handwriting is unclear, make your best interpretation and note any uncertainty.

Respond with JSON only.`;
}
