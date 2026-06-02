'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Classroom,
  Student,
  Assignment,
  Submission,
  Grade,
} from '@/db/schema';

/* ═══════════════════════════════════════
   Generic fetch helper
   ═══════════════════════════════════════ */

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'API error');
  }
  return res.json();
}

/* ═══════════════════════════════════════
   Classrooms
   ═══════════════════════════════════════ */

interface ClassroomWithStats extends Classroom {
  studentCount: number;
  avgScore: number | null;
}

export function useClassrooms() {
  return useQuery<ClassroomWithStats[]>({
    queryKey: ['classrooms'],
    queryFn: () => apiFetch('/api/classrooms'),
  });
}

export function useClassroom(id: string) {
  return useQuery<Classroom & { students: Student[] }>({
    queryKey: ['classrooms', id],
    queryFn: () => apiFetch(`/api/classrooms/${id}`),
    enabled: !!id,
  });
}

export function useCreateClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject: string; grade: string; color?: string }) =>
      apiFetch('/api/classrooms', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

export function useUpdateClassroom(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Classroom>) =>
      apiFetch(`/api/classrooms/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] });
      qc.invalidateQueries({ queryKey: ['classrooms', id] });
    },
  });
}

export function useDeleteClassroom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/classrooms/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['classrooms'] }),
  });
}

/* ═══════════════════════════════════════
   Students
   ═══════════════════════════════════════ */

interface StudentWithStats extends Student {
  submissionCount: number;
  avgScore: number | null;
}

export function useStudents(classroomId: string) {
  return useQuery<StudentWithStats[]>({
    queryKey: ['students', classroomId],
    queryFn: () => apiFetch(`/api/classrooms/${classroomId}/students`),
    enabled: !!classroomId,
  });
}

export function useAddStudents(classroomId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { students: Array<{ name: string; rollNumber: string; email?: string; parentPhone?: string }> }) =>
      apiFetch(`/api/classrooms/${classroomId}/students`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classroomId] });
      qc.invalidateQueries({ queryKey: ['classrooms'] });
    },
  });
}

/* ═══════════════════════════════════════
   Assignments
   ═══════════════════════════════════════ */

interface AssignmentWithStats extends Assignment {
  submissionCount: number;
  gradedCount: number;
}

export function useAssignments(filters?: { classroomId?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters?.classroomId) params.set('classroomId', filters.classroomId);
  if (filters?.status) params.set('status', filters.status);

  return useQuery<AssignmentWithStats[]>({
    queryKey: ['assignments', filters],
    queryFn: () => apiFetch(`/api/assignments?${params.toString()}`),
  });
}

export function useAssignment(id: string) {
  return useQuery<Assignment & { classroom: Classroom, submissionCount: number; gradedCount: number; pendingCount: number }>({
    queryKey: ['assignments', id],
    queryFn: () => apiFetch(`/api/assignments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch('/api/assignments', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

export function useUpdateAssignment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch(`/api/assignments/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['assignments', id] });
    },
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/assignments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

/* ═══════════════════════════════════════
   Grading
   ═══════════════════════════════════════ */

export function useGradeAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch(`/api/assignments/${assignmentId}/grade`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
    },
  });
}

/* ═══════════════════════════════════════
   Submissions
   ═══════════════════════════════════════ */

export function useSubmission(id: string) {
  return useQuery<Submission & { grade: Grade | null; student: Student; assignment: Assignment }>({
    queryKey: ['submissions', id],
    queryFn: () => apiFetch(`/api/submissions/${id}`),
    enabled: !!id,
  });
}

export function useAssignmentSubmissions(assignmentId: string) {
  return useQuery<Array<Submission & { student: Student; grade: Grade | null }>>({
    queryKey: ['assignments', assignmentId, 'submissions'],
    queryFn: () => apiFetch(`/api/assignments/${assignmentId}/submissions`),
    enabled: !!assignmentId,
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch('/api/submissions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assignments'] }),
  });
}

/* ═══════════════════════════════════════
   Analytics
   ═══════════════════════════════════════ */

interface DashboardStats {
  totalStudents: number;
  totalAssignments: number;
  pendingGradings: number;
  avgScore: number | null;
  gradedThisWeek: number;
  timeSavedMinutes: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiFetch('/api/analytics/dashboard'),
  });
}

interface StudentAnalytics {
  student: Student & { classroom: { name: string; subject: string } };
  avgScore: number;
  totalSubmissions: number;
  scoreTrend: Array<{ date: string; score: number; assignmentTitle: string }>;
}

export function useStudentAnalytics(studentId: string) {
  return useQuery<StudentAnalytics>({
    queryKey: ['analytics', 'student', studentId],
    queryFn: () => apiFetch(`/api/analytics/student/${studentId}`),
    enabled: !!studentId,
  });
}

/* ═══════════════════════════════════════
   File Upload
   ═══════════════════════════════════════ */

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      return res.json() as Promise<{ url: string; filename: string }>;
    },
  });
}

/* ═══════════════════════════════════════
   Google Forms Sync
   ═══════════════════════════════════════ */

interface SyncResult {
  synced: number;
  skipped: number;
  autoCreated: number;
  errors: string[];
  message: string;
}

export function useSyncSubmissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assignmentId: string }) =>
      apiFetch<SyncResult>('/api/sync-submissions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['assignments'] });
      qc.invalidateQueries({ queryKey: ['assignments', variables.assignmentId, 'submissions'] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
}

/* ═══════════════════════════════════════
   Google Sheets Discovery
   ═══════════════════════════════════════ */

interface SharedSpreadsheet {
  id: string;
  name: string;
  modifiedTime: string;
  ownerEmail: string | null;
  webViewLink: string | null;
}

/** Fetches all Google Sheets the teacher has access to (via OAuth or service account) */
export function useGoogleSheets(enabled = true) {
  return useQuery<SharedSpreadsheet[]>({
    queryKey: ['google-sheets'],
    queryFn: () => apiFetch<SharedSpreadsheet[]>('/api/google-sheets'),
    enabled,
    staleTime: 60_000, // Cache for 1 minute
  });
}

/* ═══════════════════════════════════════
   Google OAuth Connection
   ═══════════════════════════════════════ */

interface GoogleAuthStatus {
  connected: boolean;
  googleEmail: string | null;
  connectedAt: string | null;
}

/** Checks whether the current teacher has connected their Google account */
export function useGoogleAuthStatus() {
  return useQuery<GoogleAuthStatus>({
    queryKey: ['google-auth-status'],
    queryFn: () => apiFetch<GoogleAuthStatus>('/api/auth/google/status'),
    staleTime: 30_000,
  });
}

/** Disconnects the teacher's Google account (revokes + deletes tokens) */
export function useDisconnectGoogle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch('/api/auth/google/status', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-auth-status'] });
      qc.invalidateQueries({ queryKey: ['google-sheets'] });
    },
  });
}

