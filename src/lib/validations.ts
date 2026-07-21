import { z } from 'zod';

/* ═══════════════════════════════════════
   Classroom Schemas
   ═══════════════════════════════════════ */

export const createClassroomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(50),
  grade: z.string().min(1, 'Grade is required').max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#4A90D9'),
});

export const updateClassroomSchema = createClassroomSchema.partial();

/* ═══════════════════════════════════════
   Student Schemas
   ═══════════════════════════════════════ */

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  rollNumber: z.string().min(1, 'Roll number is required'),
  email: z.string().email().optional().nullable(),
  parentPhone: z.string().max(15).optional().nullable(),
});

export const createStudentsBulkSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(200),
});

/* ═══════════════════════════════════════
   Assignment Schemas
   ═══════════════════════════════════════ */

const rubricCriterionSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  weight: z.number().min(0).max(100),
  description: z.string().default(''),
  levels: z.array(z.object({
    label: z.string(),
    points: z.number().min(0),
    description: z.string().default(''),
  })).default([]),
});

export const createAssignmentSchema = z.object({
  classroomId: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  subject: z.string().min(1).max(50),
  topic: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  maxScore: z.number().int().min(1).max(1000).default(100),
  dueDate: z.string().datetime().optional().nullable(),
  submissionType: z.enum(['any', 'pdf', 'image', 'text']).default('any'),
  rubric: z.array(rubricCriterionSchema).optional().nullable(),
  gradingInstructions: z.string().max(5000).optional().nullable(),
  referenceAnswers: z.string().max(10000).optional().nullable(),
  strictness: z.number().int().min(1).max(5).default(3),
  spreadsheetId: z.string().max(200).optional().nullable(),
});

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  status: z.enum(['draft', 'published', 'grading', 'graded']).optional(),
});

/* ═══════════════════════════════════════
   Submission Schemas
   ═══════════════════════════════════════ */

export const createSubmissionSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  fileUrl: z.string().url().optional().nullable(),
  fileType: z.string().max(20).optional().nullable(),
  textContent: z.string().max(50000).optional().nullable(),
});

/* ═══════════════════════════════════════
   Grade Schemas
   ═══════════════════════════════════════ */

export const createGradeSchema = z.object({
  submissionId: z.string().uuid(),
  teacherOverrideScore: z.number().min(0).max(1000),
  teacherNote: z.string().max(5000).optional().default(''),
  maxScore: z.number().int().min(1).max(1000),
});

export const updateGradeSchema = z.object({
  teacherOverrideScore: z.number().min(0).max(1000).optional(),
  teacherNote: z.string().max(5000).optional(),
  reviewedByTeacher: z.boolean().optional(),
});

/* ═══════════════════════════════════════
   Sync Schemas
   ═══════════════════════════════════════ */

export const syncSubmissionsSchema = z.object({
  assignmentId: z.string().uuid(),
});

/* ═══════════════════════════════════════
   Query Params Schemas
   ═══════════════════════════════════════ */

export const assignmentQuerySchema = z.object({
  classroomId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'grading', 'graded']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  plan: z.enum(['all', 'unassigned', 'subscription', 'pay_per_submission']).default('all'),
  role: z.enum(['all', 'teacher', 'student', 'admin']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
}).strict();

/* ═══════════════════════════════════════
   Type Exports
   ═══════════════════════════════════════ */

export type CreateClassroom = z.infer<typeof createClassroomSchema>;
export type UpdateClassroom = z.infer<typeof updateClassroomSchema>;
export type CreateStudent = z.infer<typeof createStudentSchema>;
export type CreateAssignment = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignment = z.infer<typeof updateAssignmentSchema>;
export type CreateSubmission = z.infer<typeof createSubmissionSchema>;
export type CreateGrade = z.infer<typeof createGradeSchema>;
export type UpdateGrade = z.infer<typeof updateGradeSchema>;
export type AdminUserQuery = z.infer<typeof adminUserQuerySchema>;
