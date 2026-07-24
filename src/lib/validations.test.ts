import { describe, expect, it } from 'vitest';
import {
  createAssignmentSchema,
  createClassroomSchema,
  createGradeSchema,
  createSubmissionSchema,
  createStudentSchema,
  syncSubmissionsSchema,
  updateAssignmentSchema,
} from './validations';

const classroomId = '0678c702-a0e3-4ab7-ae29-6d67b137d815';
const submissionId = '693b525b-8987-4a7a-b5a6-d6ed0f8d63d2';

describe('state-changing request schemas', () => {
  it('rejects unknown classroom and student keys', () => {
    expect(createClassroomSchema.safeParse({
      name: 'Class 12 A',
      subject: 'Chemistry',
      grade: '12',
      color: '#EF3158',
      teacherId: 'attacker-controlled',
    }).success).toBe(false);

    expect(createStudentSchema.safeParse({
      name: 'Student',
      rollNumber: '12',
      role: 'admin',
    }).success).toBe(false);
  });

  it('rejects unknown assignment keys at create and update boundaries', () => {
    const assignment = {
      classroomId,
      title: 'Chemical Bonding',
      subject: 'Chemistry',
      maxScore: 100,
      submissionType: 'any' as const,
      strictness: 3,
      teacherId: 'must-come-from-auth',
    };

    expect(createAssignmentSchema.safeParse(assignment).success).toBe(false);
    expect(updateAssignmentSchema.safeParse({ title: 'Updated', teacherId: 'spoofed' }).success)
      .toBe(false);
  });

  it('rejects unknown nested rubric keys', () => {
    const parsed = createAssignmentSchema.safeParse({
      classroomId,
      title: 'Chemical Bonding',
      subject: 'Chemistry',
      rubric: [{
        id: 'accuracy',
        name: 'Accuracy',
        weight: 100,
        description: 'Correctness',
        injected: true,
        levels: [],
      }],
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts valid grade and sync payloads', () => {
    expect(createGradeSchema.safeParse({
      submissionId,
      teacherOverrideScore: 82,
      teacherNote: 'Reviewed against the answer key.',
      maxScore: 100,
    }).success).toBe(true);

    expect(syncSubmissionsSchema.safeParse({ assignmentId: classroomId }).success).toBe(true);
  });

  it('accepts opaque managed file references and rejects malformed references', () => {
    const base = {
      assignmentId: classroomId,
      studentId: submissionId,
      fileType: 'application/pdf',
    };

    expect(createSubmissionSchema.safeParse({
      ...base,
      fileUrl: 'r2:submissions/0123456789abcdef0123456789abcdef/123e4567-e89b-42d3-a456-426614174000',
    }).success).toBe(true);
    expect(createSubmissionSchema.safeParse({
      ...base,
      fileUrl: 'r2:submissions/other-user/../../student.pdf',
    }).success).toBe(false);
    expect(createSubmissionSchema.safeParse({
      ...base,
      fileUrl: 'http://files.example.com/student.pdf',
    }).success).toBe(false);
  });
});
