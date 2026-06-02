'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle, 
  Clock, 
  FileText,
  Play,
  CloudDownload,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import styles from './page.module.css';
import { 
  useAssignment, 
  useStudents, 
  useAssignmentSubmissions,
  useCreateSubmission,
  useUploadFile,
  useGradeAssignment,
  useSyncSubmissions,
} from '@/lib/api-client';

export default function AssignmentDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const { data: assignment, isLoading: assignmentLoading } = useAssignment(id);
  const { data: students, isLoading: studentsLoading } = useStudents(assignment?.classroomId || '');
  const { data: submissions, isLoading: submissionsLoading } = useAssignmentSubmissions(id);
  
  const uploadFile = useUploadFile();
  const createSubmission = useCreateSubmission();
  const gradeAssignment = useGradeAssignment();
  const syncSubmissions = useSyncSubmissions();

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ message: string; errors: string[] } | null>(null);

  if (assignmentLoading || studentsLoading || submissionsLoading) {
    return <div className={styles.loading}>Loading assignment details...</div>;
  }

  if (!assignment) {
    return <div className={styles.error}>Assignment not found</div>;
  }

  async function handleFileUpload(studentId: string, e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    
    setUploadingFor(studentId);
    try {
      const file = e.target.files[0];
      const res = await uploadFile.mutateAsync(file);
      
      await createSubmission.mutateAsync({
        assignmentId: id,
        studentId: studentId,
        fileUrl: res.url,
        fileType: file.type || 'application/pdf',
      });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload submission');
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleGradeAll() {
    try {
      await gradeAssignment.mutateAsync(id);
    } catch (e) {
      console.error(e);
      alert('Grading failed');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 className={styles.title}>{assignment.title}</h1>
          <p className={styles.subtitle}>
            {assignment.classroom?.name} • Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.syncBtn}
            onClick={async () => {
              setSyncResult(null);
              try {
                const result = await syncSubmissions.mutateAsync({ assignmentId: id });
                setSyncResult({ message: result.message, errors: result.errors });
              } catch (err) {
                setSyncResult({ 
                  message: 'Sync failed', 
                  errors: [err instanceof Error ? err.message : 'Unknown error'] 
                });
              }
            }}
            disabled={syncSubmissions.isPending || !assignment.spreadsheetId}
            title={!assignment.spreadsheetId ? 'No Google Sheet linked — edit assignment to add one' : 'Sync from Google Forms'}
          >
            {syncSubmissions.isPending ? (
              <><Loader2 size={16} className={styles.spin} /> Syncing...</>
            ) : (
              <><CloudDownload size={16} /> Sync from Google Forms</>
            )}
          </button>
          <button 
            className={styles.gradeBtn} 
            onClick={handleGradeAll}
            disabled={gradeAssignment.isPending || assignment.status === 'graded'}
          >
            <Play size={16} />
            {gradeAssignment.isPending ? 'Grading...' : 'Grade All Pending'}
          </button>
        </div>
      </div>

      {/* Sync result banner */}
      {syncResult && (
        <div className={`${styles.syncBanner} ${syncResult.errors.length > 0 ? styles.syncBannerWarn : styles.syncBannerSuccess}`}>
          <div className={styles.syncBannerContent}>
            {syncResult.errors.length > 0 ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            <div>
              <strong>{syncResult.message}</strong>
              {syncResult.errors.length > 0 && (
                <ul className={styles.syncErrors}>
                  {syncResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          </div>
          <button className={styles.syncBannerClose} onClick={() => setSyncResult(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Students</span>
          <span className={styles.statValue}>{students?.length || 0}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Submissions</span>
          <span className={styles.statValue}>{assignment.submissionCount}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Graded</span>
          <span className={styles.statValue}>{assignment.gradedCount}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Max Score</span>
          <span className={styles.statValue}>{assignment.maxScore}</span>
        </div>
      </div>

      <div className={styles.submissionsSection}>
        <h2 className={styles.sectionTitle}>Student Submissions</h2>
        
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Status</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {students?.map(student => {
                const sub = submissions?.find(s => s.studentId === student.id);
                const isUploading = uploadingFor === student.id;

                return (
                  <tr key={student.id} className={styles.row}>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.rollNumber}</td>
                    <td>
                      {sub ? (
                        <span className={`${styles.badge} ${sub.status === 'graded' ? styles.badgeSuccess : styles.badgeWarning}`}>
                          {sub.status === 'graded' ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {sub.status === 'graded' ? 'Graded' : 'Pending'}
                        </span>
                      ) : (
                        <span className={styles.badgePending}>No Submission</span>
                      )}
                    </td>
                    <td>
                      {sub?.status === 'graded' && sub.grade ? (
                        <span className={styles.scoreText}>
                          {sub.grade.totalScore} / {sub.grade.maxScore} ({sub.grade.gradeLetter})
                        </span>
                      ) : (
                        <span className={styles.textMuted}>—</span>
                      )}
                    </td>
                    <td>
                      {sub ? (
                        <button 
                          className={styles.viewSubBtn}
                          onClick={() => {
                            if (sub.fileUrl) {
                              window.open(sub.fileUrl, '_blank');
                            } else {
                              alert('No file URL available for this submission.');
                            }
                          }}
                        >
                          <FileText size={14} /> View
                        </button>
                      ) : (
                        <label className={styles.uploadBtn}>
                          <Upload size={14} />
                          {isUploading ? 'Uploading...' : 'Upload Submission'}
                          <input 
                            type="file" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleFileUpload(student.id, e)}
                            accept=".pdf,image/*,text/plain" 
                            disabled={isUploading}
                          />
                        </label>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(!students || students.length === 0) && (
                <tr>
                  <td colSpan={5} className={styles.emptyState}>
                    No students in this classroom yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
