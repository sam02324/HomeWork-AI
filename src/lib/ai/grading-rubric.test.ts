import { describe, expect, it } from 'vitest';
import type { Assignment, RubricCriteria } from '@/db/schema';
import { extractQuestionHeadings, getEffectiveRubric, isQuestionPaper } from './grading-rubric';

function makeAssignment(overrides: Partial<Assignment> = {}): Assignment {
  return {
    id: 'a242c653-a997-43fc-8974-3bf0b88e9217',
    classroomId: '0678c702-a0e3-4ab7-ae29-6d67b137d815',
    teacherId: 'user_teacher',
    title: 'Test assignment',
    subject: 'Chemistry',
    topic: null,
    description: null,
    maxScore: 100,
    dueDate: null,
    submissionType: 'any',
    status: 'published',
    rubric: null,
    gradingInstructions: null,
    referenceAnswers: null,
    strictness: 3,
    spreadsheetId: null,
    createdAt: new Date('2026-07-22T00:00:00Z'),
    updatedAt: new Date('2026-07-22T00:00:00Z'),
    ...overrides,
  };
}

describe('grading rubric fallback', () => {
  it('extracts, orders, and deduplicates question headings', () => {
    const reference = [
      'Question 2: Explain ionic bonding',
      'Q1. Define valency',
      'Q2) duplicate heading must not replace the first',
    ].join('\n');

    expect(extractQuestionHeadings(reference)).toEqual([
      'Q1: Define valency',
      'Q2: Explain ionic bonding',
    ]);
    expect(isQuestionPaper(reference)).toBe(true);
  });

  it('creates balanced question criteria when no explicit rubric exists', () => {
    const rubric = getEffectiveRubric(makeAssignment({
      maxScore: 40,
      referenceAnswers: 'Q1: First answer\nQ2: Second answer',
    }));

    expect(rubric).toHaveLength(2);
    expect(rubric.map((criterion) => criterion.weight)).toEqual([50, 50]);
    expect(rubric.map((criterion) => criterion.levels[0].points)).toEqual([20, 20]);
  });

  it('preserves a teacher-authored rubric unchanged', () => {
    const explicit: RubricCriteria[] = [{
      id: 'method',
      name: 'Method',
      weight: 100,
      description: 'Show the method.',
      levels: [{ label: 'Complete', points: 10, description: 'Complete method.' }],
    }];

    expect(getEffectiveRubric(makeAssignment({ rubric: explicit }))).toBe(explicit);
  });
});
