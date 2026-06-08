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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* ═══════════════════════════════════════
   ENUMS
   ═══════════════════════════════════════ */

export const userRoleEnum = pgEnum('user_role', ['teacher', 'student', 'admin']);
export const assignmentStatusEnum = pgEnum('assignment_status', ['draft', 'published', 'grading', 'graded']);
export const submissionTypeEnum = pgEnum('submission_type', ['any', 'pdf', 'image', 'text']);
export const submissionStatusEnum = pgEnum('submission_status', ['pending', 'grading', 'graded', 'error']);

/* ═══════════════════════════════════════
   TABLES
   ═══════════════════════════════════════ */

/** Users — synced from Clerk via webhook */
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').notNull().default('teacher'),
  orgName: text('org_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

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
});

/** Students */
export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  classroomId: uuid('classroom_id').notNull().references(() => classrooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  rollNumber: text('roll_number').notNull(),
  email: text('email'),
  parentPhone: text('parent_phone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

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
});

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
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
});

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

/* ═══════════════════════════════════════
   RELATIONS
   ═══════════════════════════════════════ */

export const usersRelations = relations(users, ({ many, one }) => ({
  classrooms: many(classrooms),
  assignments: many(assignments),
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

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assignment: one(assignments, { fields: [submissions.assignmentId], references: [assignments.id] }),
  student: one(students, { fields: [submissions.studentId], references: [students.id] }),
  grade: one(grades),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  submission: one(submissions, { fields: [grades.submissionId], references: [submissions.id] }),
}));

export const googleTokensRelations = relations(googleTokens, ({ one }) => ({
  user: one(users, { fields: [googleTokens.userId], references: [users.id] }),
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
