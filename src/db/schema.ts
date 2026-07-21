import {
  pgTable,
  text,
  uuid,
  integer,
  decimal,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ═══════════════════════════════════════
   ENUMS
   ═══════════════════════════════════════ */

export const userRoleEnum = pgEnum('user_role', ['teacher', 'student', 'admin']);
export const accountPlanEnum = pgEnum('account_plan', [
  'unassigned',
  'subscription',
  'pay_per_submission',
]);
export const userAccountStatusEnum = pgEnum('user_account_status', ['active', 'suspended']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['draft', 'published', 'grading', 'graded']);
export const submissionTypeEnum = pgEnum('submission_type', ['any', 'pdf', 'image', 'text']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'grading', 'graded', 'error']);
export const aiUsageStatusEnum = pgEnum('ai_usage_status', ['success', 'error']);
export const systemEventSeverityEnum = pgEnum('system_event_severity', ['info', 'warning', 'error']);
export const systemEventCategoryEnum = pgEnum('system_event_category', [
  'grading',
  'sync',
  'auth',
  'database',
  'moderation',
  'system',
]);
export const contentReportStatusEnum = pgEnum('content_report_status', [
  'open',
  'resolved',
  'dismissed',
]);
export const contentReportCategoryEnum = pgEnum('content_report_category', [
  'privacy',
  'incorrect_content',
  'inappropriate',
  'copyright',
  'other',
]);

/* ═══════════════════════════════════════
   TABLES
   ═══════════════════════════════════════ */

/** Users — synced from Clerk via webhook */
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('teacher'),
  accountPlan: accountPlanEnum('account_plan').notNull().default('unassigned'),
  accountStatus: userAccountStatusEnum('account_status').notNull().default('active'),
  submissionCredits: integer('submission_credits').notNull().default(0),
  monthlySubmissionQuota: integer('monthly_submission_quota'),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }),
  suspendedReason: text('suspended_reason'),
  orgName: text('org_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  accountPlanIdx: index('users_account_plan_idx').on(table.accountPlan),
  accountStatusIdx: index('users_account_status_idx').on(table.accountStatus),
  roleIdx: index('users_role_idx').on(table.role),
}));

/** Classrooms */
export const classrooms = pgTable('classrooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  teacherId: text('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  subject: text('subject').notNull(),
  grade: text('grade').notNull(),
  color: text('color').notNull().default('#4A90D9'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  teacherIdx: index('classrooms_teacher_idx').on(table.teacherId),
}));

/** Students */
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  classroomId: uuid('classroom_id').notNull().references(() => classrooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rollNumber: text('roll_number').notNull(),
  email: text('email'),
  parentPhone: text('parent_phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  classroomIdx: index('students_classroom_idx').on(table.classroomId),
}));

/** Assignments */
export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  classroomId: uuid('classroom_id').notNull().references(() => classrooms.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subject: text('subject').notNull(),
  topic: text('topic'),
  description: text('description'),
  maxScore: integer('max_score').notNull().default(100),
  dueDate: timestamp('due_date', { withTimezone: true }),
  submissionType: submissionTypeEnum('submission_type').notNull().default('any'),
  status: assignmentStatusEnum('status').notNull().default('draft'),
  rubric: jsonb('rubric').$type<RubricCriteria[]>(),
  gradingInstructions: text('grading_instructions'),
  referenceAnswers: text('reference_answers'),
  strictness: integer('strictness').notNull().default(3),
  /** Google Spreadsheet ID linked to this assignment's Google Form responses */
  spreadsheetId: text('spreadsheet_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  classroomIdx: index('assignments_classroom_idx').on(table.classroomId),
  teacherIdx: index('assignments_teacher_idx').on(table.teacherId),
}));

/** Submissions */
export const submissions = pgTable('submissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  assignmentId: uuid('assignment_id').notNull().references(() => assignments.id, { onDelete: 'cascade' }),
  studentId: uuid('student_id').notNull().references(() => students.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url'),
  fileType: text('file_type'),
  textContent: text('text_content'),
  status: submissionStatusEnum('status').notNull().default('pending'),
  /** Dedup key from Google Sheets: hash of timestamp + email, prevents duplicate syncs */
  googleFormResponseId: text('google_form_response_id'),
  /** Google Drive file ID for the uploaded file from the form */
  googleDriveFileId: text('google_drive_file_id'),
  /** Soft-removal keeps the audit trail while excluding content from teacher workflows. */
  removedAt: timestamp('removed_at', { withTimezone: true }),
  removedBy: text('removed_by').references(() => users.id, { onDelete: 'set null' }),
  removalReason: text('removal_reason'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  assignmentIdx: index('submissions_assignment_idx').on(table.assignmentId),
  studentIdx: index('submissions_student_idx').on(table.studentId),
  removedAtIdx: index('submissions_removed_at_idx').on(table.removedAt),
}));

/** Grades */
export const grades = pgTable('grades', {
  id: uuid('id').defaultRandom().primaryKey(),
  submissionId: uuid('submission_id').notNull().unique().references(() => submissions.id, { onDelete: 'cascade' }),
  totalScore: decimal('total_score', { precision: 6, scale: 2 }).notNull(),
  maxScore: integer('max_score').notNull(),
  gradeLetter: text('grade_letter').notNull(),
  feedback: text('feedback').notNull(),
  criteriaScores: jsonb('criteria_scores').$type<CriterionScore[]>().notNull(),
  strengths: text('strengths').array(),
  improvements: text('improvements').array(),
  aiModel: text('ai_model').notNull(),
  aiTokensUsed: integer('ai_tokens_used'),
  /** AI detection: probability (0-100) that the submission is AI-generated */
  aiDetectionScore: integer('ai_detection_score'),
  /** Flag: true if submission is suspected AI-generated (score > 60) */
  aiDetectionFlag: boolean('ai_detection_flag').notNull().default(false),
  aiRationale: text('ai_rationale'),
  chatHistory: jsonb('chat_history'),
  gradedAt: timestamp('graded_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedByTeacher: boolean('reviewed_by_teacher').notNull().default(false),
  /** Teacher's manually overridden score, if any */
  teacherOverrideScore: decimal('teacher_override_score', { precision: 6, scale: 2 }),
  /** Teacher's manual feedback note */
  teacherNote: text('teacher_note'),
});

/** Google OAuth tokens — one per teacher for Google Drive/Sheets access */
export const googleTokens = pgTable('google_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  tokenExpiry: timestamp('token_expiry', { withTimezone: true }).notNull(),
  googleEmail: text('google_email'),
  scopes: text('scopes'),
  syncFolderId: text('sync_folder_id'),
  syncFolderName: text('sync_folder_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Immutable per-call cost ledger. Prices are snapshotted when the call occurs. */
export const aiUsageEvents = pgTable('ai_usage_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  assignmentId: uuid('assignment_id'),
  submissionId: uuid('submission_id'),
  provider: text('provider').notNull().default('anthropic'),
  model: text('model').notNull(),
  operation: text('operation').notNull().default('grade_submission'),
  status: aiUsageStatusEnum('status').notNull(),
  inputTokens: integer('input_tokens').notNull().default(0),
  outputTokens: integer('output_tokens').notNull().default(0),
  totalTokens: integer('total_tokens').notNull().default(0),
  inputPriceUsdMicrosPerMillion: integer('input_price_usd_micros_per_million').notNull(),
  outputPriceUsdMicrosPerMillion: integer('output_price_usd_micros_per_million').notNull(),
  estimatedCostUsdMicros: integer('estimated_cost_usd_micros').notNull().default(0),
  usdToInrMicros: integer('usd_to_inr_micros').notNull(),
  estimatedCostInrPaise: integer('estimated_cost_inr_paise').notNull().default(0),
  latencyMs: integer('latency_ms').notNull(),
  errorCode: text('error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  createdAtIdx: index('ai_usage_events_created_at_idx').on(table.createdAt),
  userCreatedIdx: index('ai_usage_events_user_created_idx').on(table.userId, table.createdAt),
  statusCreatedIdx: index('ai_usage_events_status_created_idx').on(table.status, table.createdAt),
}));

/** Sanitized operational events. Student content and secrets never belong here. */
export const systemEvents = pgTable('system_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: systemEventCategoryEnum('category').notNull(),
  severity: systemEventSeverityEnum('severity').notNull(),
  code: text('code').notNull(),
  message: text('message').notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').$type<SystemEventMetadata>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  severityCreatedIdx: index('system_events_severity_created_idx').on(table.severity, table.createdAt),
  categoryCreatedIdx: index('system_events_category_created_idx').on(table.category, table.createdAt),
}));

/** Append-only record of every owner action that mutates user or content state. */
export const adminAuditEvents = pgTable('admin_audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: text('actor_user_id').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  reason: text('reason').notNull(),
  beforeState: jsonb('before_state').$type<AdminAuditState>(),
  afterState: jsonb('after_state').$type<AdminAuditState>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  actorCreatedIdx: index('admin_audit_events_actor_created_idx').on(table.actorUserId, table.createdAt),
  targetCreatedIdx: index('admin_audit_events_target_created_idx').on(table.targetType, table.targetId, table.createdAt),
}));

/** Teacher-created reports reviewed only inside the owner console. */
export const contentReports = pgTable('content_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  reporterId: text('reporter_id').references(() => users.id, { onDelete: 'set null' }),
  submissionId: uuid('submission_id').references(() => submissions.id, { onDelete: 'set null' }),
  category: contentReportCategoryEnum('category').notNull(),
  reason: text('reason').notNull(),
  status: contentReportStatusEnum('status').notNull().default('open'),
  reviewedBy: text('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  resolutionNote: text('resolution_note'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  reporterSubmissionUnique: uniqueIndex('content_reports_reporter_submission_unique').on(
    table.reporterId,
    table.submissionId
  ),
  statusCreatedIdx: index('content_reports_status_created_idx').on(table.status, table.createdAt),
  submissionIdx: index('content_reports_submission_idx').on(table.submissionId),
}));

/* ═══════════════════════════════════════
   RELATIONS
   ═══════════════════════════════════════ */

export const usersRelations = relations(users, ({ many, one }) => ({
  classrooms: many(classrooms),
  assignments: many(assignments),
  aiUsageEvents: many(aiUsageEvents),
  contentReports: many(contentReports, { relationName: 'reportedContent' }),
  reviewedContentReports: many(contentReports, { relationName: 'reviewedContent' }),
  googleToken: one(googleTokens),
}));

export const classroomsRelations = relations(classrooms, ({ one, many }) => ({
  teacher: one(users, { fields: [classrooms.teacherId], references: [users.id] }),
  students: many(students),
  assignments: many(assignments),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  classroom: one(classrooms, { fields: [students.classroomId], references: [classrooms.id] }),
  submissions: many(submissions),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  classroom: one(classrooms, { fields: [assignments.classroomId], references: [classrooms.id] }),
  teacher: one(users, { fields: [assignments.teacherId], references: [users.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  student: one(students, { fields: [submissions.studentId], references: [students.id] }),
  grade: one(grades),
  reports: many(contentReports),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, { fields: [grades.submissionId], references: [submissions.id] }),
}));

export const googleTokensRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, { fields: [googleTokens.userId], references: [users.id] }),
}));

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  user: one(users, { fields: [aiUsageEvents.userId], references: [users.id] }),
}));

export const contentReportsRelations = relations(contentReports, ({ one }) => ({
  reporter: one(users, {
    fields: [contentReports.reporterId],
    references: [users.id],
    relationName: 'reportedContent',
  }),
  reviewer: one(users, {
    fields: [contentReports.reviewedBy],
    references: [users.id],
    relationName: 'reviewedContent',
  }),
  submission: one(submissions, { fields: [contentReports.submissionId], references: [submissions.id] }),
}));

/* ═══════════════════════════════════════
   TYPES
   ═══════════════════════════════════════ */

export interface RubricCriteria {
  id: string;
  name: string;
  weight: number;
  description: string;
  levels: { label: string; points: number; description: string }[];
}

export interface CriterionScore {
  criterionName: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export type SystemEventMetadata = Record<string, string | number | boolean | null>;
export type AdminAuditState = Record<string, string | number | boolean | null>;

/* Inferred types for select/insert */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Classroom = typeof classrooms.$inferSelect;
export type NewClassroom = typeof classrooms.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Assignment = typeof assignments.$inferSelect;
export type NewAssignment = typeof assignments.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Grade = typeof grades.$inferSelect;
export type NewGrade = typeof grades.$inferInsert;
export type GoogleToken = typeof googleTokens.$inferSelect;
export type NewGoogleToken = typeof googleTokens.$inferInsert;
export type AiUsageEvent = typeof aiUsageEvents.$inferSelect;
export type NewAiUsageEvent = typeof aiUsageEvents.$inferInsert;
export type SystemEvent = typeof systemEvents.$inferSelect;
export type NewSystemEvent = typeof systemEvents.$inferInsert;
export type AdminAuditEvent = typeof adminAuditEvents.$inferSelect;
export type NewAdminAuditEvent = typeof adminAuditEvents.$inferInsert;
export type ContentReport = typeof contentReports.$inferSelect;
export type NewContentReport = typeof contentReports.$inferInsert;
