import type { Assignment, RubricCriteria } from '@/db/schema';

const QUESTION_HEADING = /^\s*Q(?:uestion)?\s*(\d+)\s*[.:)]?\s*([^\r\n]*)/gim;

export function extractQuestionHeadings(referenceMaterial: string | null): string[] {
  if (!referenceMaterial) return [];

  const headings = new Map<number, string>();
  for (const match of referenceMaterial.matchAll(QUESTION_HEADING)) {
    const questionNumber = Number(match[1]);
    const title = match[2].trim().replace(/^[-:]\s*/, '');
    if (!headings.has(questionNumber)) {
      headings.set(questionNumber, title ? `Q${questionNumber}: ${title}` : `Q${questionNumber}`);
    }
  }

  return [...headings.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, heading]) => heading);
}

export function isQuestionPaper(referenceMaterial: string | null): boolean {
  return extractQuestionHeadings(referenceMaterial).length >= 2;
}

function buildCriterion(
  id: string,
  name: string,
  weight: number,
  maxPoints: number
): RubricCriteria {
  return {
    id,
    name,
    weight,
    description: `Evaluate correctness, method, reasoning, and completeness for ${name}.`,
    levels: [
      { label: 'Complete and correct', points: maxPoints, description: 'Correct answer with sufficient working.' },
      { label: 'Mostly correct', points: maxPoints * 0.75, description: 'Correct approach with minor errors or omissions.' },
      { label: 'Partially correct', points: maxPoints * 0.5, description: 'Some valid progress, but substantial errors remain.' },
      { label: 'Limited progress', points: maxPoints * 0.25, description: 'Minimal relevant work or an unsupported answer.' },
      { label: 'Incorrect or missing', points: 0, description: 'No creditable response.' },
    ],
  };
}

/** Keeps scoring stable when an imported assignment has no teacher-authored rubric. */
export function getEffectiveRubric(assignment: Assignment): RubricCriteria[] {
  const explicitRubric = (assignment.rubric || []) as RubricCriteria[];
  if (explicitRubric.length > 0) return explicitRubric;

  const headings = extractQuestionHeadings(assignment.referenceAnswers);
  if (headings.length > 0) {
    const weight = 100 / headings.length;
    const maxPoints = assignment.maxScore / headings.length;
    return headings.map((name, index) =>
      buildCriterion(`auto-question-${index + 1}`, name, weight, maxPoints)
    );
  }

  return [
    buildCriterion(
      'auto-overall',
      'Overall Accuracy and Completeness',
      100,
      assignment.maxScore
    ),
  ];
}
