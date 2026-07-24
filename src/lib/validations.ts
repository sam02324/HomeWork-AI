import { z } from 'zod';
import { parseGoogleSpreadsheetId } from '@/lib/google-sheet-id';

/* ═══════════════════════════════════════
   Classroom Schemas
   ═══════════════════════════════════════ */

export const createClassroomSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  subject: z.string().min(1, 'Subject is required').max(50),
  grade: z.string().min(1, 'Grade is required').max(20),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color').default('#4A90D9'),
}).strict();

export const updateClassroomSchema = createClassroomSchema.partial();

/* ═══════════════════════════════════════
   Student Schemas
   ═══════════════════════════════════════ */

export const createStudentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  rollNumber: z.string().min(1, 'Roll number is required'),
  email: z.string().email().optional().nullable(),
  parentPhone: z.string().max(15).optional().nullable(),
}).strict();

export const createStudentsBulkSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(200),
}).strict();

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
  }).strict()).default([]),
}).strict();

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
  spreadsheetId: z.string().max(300).transform((value, ctx) => {
    const id = parseGoogleSpreadsheetId(value);
    if (!id) {
      ctx.addIssue({ code: 'custom', message: 'Enter a valid Google Sheets URL or spreadsheet ID' });
      return z.NEVER;
    }
    return id;
  }).optional().nullable(),
}).strict();

export const updateAssignmentSchema = createAssignmentSchema.partial().extend({
  status: z.enum(['draft', 'published', 'grading', 'graded']).optional(),
}).strict();

/* ═══════════════════════════════════════
   Submission Schemas
   ═══════════════════════════════════════ */

export const createSubmissionSchema = z.object({
  assignmentId: z.string().uuid(),
  studentId: z.string().uuid(),
  fileUrl: z.string().max(2048).refine((value) => {
    const objectUuid = '[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
    const opaqueReference = new RegExp(`^r2:submissions/[0-9a-f]{32}/${objectUuid}$`);
    const normalizedLegacyReference = new RegExp(
      `^r2:submissions/[a-zA-Z0-9_-]{1,128}/${objectUuid}\\.[a-z0-9]{1,10}$`
    );
    if (opaqueReference.test(value) || normalizedLegacyReference.test(value)) {
      return true;
    }
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter a valid secure file reference').optional().nullable(),
  fileType: z.string().max(20).optional().nullable(),
  textContent: z.string().max(50000).optional().nullable(),
}).strict();

/* ═══════════════════════════════════════
   Grade Schemas
   ═══════════════════════════════════════ */

export const createGradeSchema = z.object({
  submissionId: z.string().uuid(),
  teacherOverrideScore: z.number().min(0).max(1000),
  teacherNote: z.string().max(5000).optional().default(''),
  maxScore: z.number().int().min(1).max(1000),
}).strict();

export const updateGradeSchema = z.object({
  teacherOverrideScore: z.number().min(0).max(1000).optional(),
  teacherNote: z.string().max(5000).optional(),
  reviewedByTeacher: z.boolean().optional(),
}).strict();

/* ═══════════════════════════════════════
   Sync Schemas
   ═══════════════════════════════════════ */

export const syncSubmissionsSchema = z.object({
  assignmentId: z.string().uuid(),
}).strict();

/* ═══════════════════════════════════════
   Query Params Schemas
   ═══════════════════════════════════════ */

export const assignmentQuerySchema = z.object({
  classroomId: z.string().uuid().optional(),
  status: z.enum(['draft', 'published', 'grading', 'graded']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

export const adminUserQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  plan: z.enum(['all', 'unassigned', 'subscription', 'pay_per_submission']).default('all'),
  role: z.enum(['all', 'teacher', 'student', 'admin']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
}).strict();

export const adminUsageQuerySchema = z.object({
  days: z.enum(['7', '30', '90']).default('30').transform(Number),
}).strict();

export const adminAccountQuerySchema = z.object({
  q: z.string().trim().max(100).default(''),
  status: z.enum(['all', 'active', 'suspended']).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(10).max(100).default(25),
}).strict();

const adminActionReason = z.string().trim().min(5).max(500);

export const adminAccountActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('suspend'),
    reason: adminActionReason,
  }).strict(),
  z.object({
    action: z.literal('reinstate'),
    reason: adminActionReason,
  }).strict(),
  z.object({
    action: z.literal('adjust_credits'),
    reason: adminActionReason,
    delta: z.number().int().min(-100_000).max(100_000).refine((value) => value !== 0),
  }).strict(),
  z.object({
    action: z.literal('set_quota'),
    reason: adminActionReason,
    monthlyQuota: z.number().int().min(0).max(100_000).nullable(),
  }).strict(),
  z.object({
    action: z.literal('set_plan'),
    reason: adminActionReason,
    plan: z.enum(['unassigned', 'subscription', 'pay_per_submission']),
  }).strict(),
]);

export const createContentReportSchema = z.object({
  submissionId: z.string().uuid(),
  category: z.enum(['privacy', 'incorrect_content', 'inappropriate', 'copyright', 'other']),
  reason: z.string().trim().min(10).max(1000),
}).strict();

export const adminModerationQuerySchema = z.object({
  status: z.enum(['all', 'open', 'resolved', 'dismissed']).default('open'),
}).strict();

export const adminModerationActionSchema = z.object({
  action: z.enum(['remove', 'restore', 'resolve', 'dismiss']),
  reason: z.string().trim().min(5).max(1000),
}).strict();

export const adminMonitoringTestSchema = z.object({
  note: z.string().trim().max(100).default('Owner console diagnostic'),
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
export type AdminUsageQuery = z.infer<typeof adminUsageQuerySchema>;
export type AdminAccountQuery = z.infer<typeof adminAccountQuerySchema>;
export type AdminAccountAction = z.infer<typeof adminAccountActionSchema>;
export type CreateContentReport = z.infer<typeof createContentReportSchema>;
export type AdminModerationQuery = z.infer<typeof adminModerationQuerySchema>;
export type AdminModerationAction = z.infer<typeof adminModerationActionSchema>;
