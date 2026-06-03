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
  Bot,
  MessageSquareWarning,
  Eye,
  Save
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
  useUpdateGrade,
} from '@/lib/api-client';
import type { Grade } from '@/db/schema';

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

  // Review Modal State
  const [reviewGrade, setReviewGrade] = useState<Grade | null>(null);
  const [reviewStudentName, setReviewStudentName] = useState('');
  const [overrideScore, setOverrideScore] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  
  const updateGrade = useUpdateGrade(reviewGrade?.id || '');

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

  function openReviewModal(grade: Grade, studentName: string) {
    setReviewGrade(grade);
    setReviewStudentName(studentName);
    setOverrideScore(grade.teacherOverrideScore ? grade.teacherOverrideScore.toString() : grade.totalScore);
    setTeacherNote(grade.teacherNote || '');
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reviewGrade) return;
    try {
      await updateGrade.mutateAsync({
        teacherOverrideScore: parseFloat(overrideScore),
        teacherNote: teacherNote,
        reviewedByTeacher: true
      });
      setReviewGrade(null);
    } catch (err) {
      console.error('Failed to update grade', err);
      alert('Failed to save review');
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
                const grade = sub?.grade as Grade | undefined;

                return (
                  <tr key={student.id} className={styles.row}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong>{student.name}</strong>
                        {grade?.aiDetectionFlag && !grade.reviewedByTeacher && (
                          <div className={styles.aiWarningBadge} title={`Suspected AI (Score: ${grade.aiDetectionScore}%)`}>
                            <Bot size={12} /> AI Flag
                          </div>
                        )}
                        {grade?.reviewedByTeacher && (
                          <div className={styles.reviewedBadge} title="Reviewed by Teacher">
                            <CheckCircle size={12} /> Reviewed
                          </div>
                        )}
                      </div>
                    </td>
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
                      {sub?.status === 'graded' && grade ? (
                        <div className={styles.scoreCell}>
                          <span className={grade.teacherOverrideScore ? styles.scoreOverridden : styles.scoreText}>
                            {grade.teacherOverrideScore || grade.totalScore} / {grade.maxScore}
                          </span>
                          {grade.teacherOverrideScore && (
                            <span className={styles.overrideLabel}>Manual</span>
                          )}
                        </div>
                      ) : (
                        <span className={styles.textMuted}>—</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        {sub ? (
                          <>
                            <button 
                              className={styles.viewSubBtn}
                              onClick={() => {
                                if (sub.fileUrl) {
                                  window.open(sub.fileUrl, '_blank');
                                } else {
                                  alert('No file URL available for this submission.');
                                }
                              }}
                              title="View Document"
                            >
                              <FileText size={14} /> View
                            </button>
                            {sub.status === 'graded' && grade && (
                              <button
                                className={`${styles.reviewBtn} ${grade.aiDetectionFlag && !grade.reviewedByTeacher ? styles.reviewBtnWarn : ''}`}
                                onClick={() => openReviewModal(grade, student.name)}
                                title="Review Grade"
                              >
                                <Eye size={14} /> Review
                              </button>
                            )}
                          </>
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
                      </div>
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

      {/* Review Modal */}
      {reviewGrade && (
        <div className={styles.modalOverlay} onClick={() => setReviewGrade(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Review: {reviewStudentName}</h2>
              <button className={styles.closeBtn} onClick={() => setReviewGrade(null)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              {reviewGrade.aiDetectionFlag && !reviewGrade.reviewedByTeacher && (
                <div className={styles.aiWarningBanner}>
                  <MessageSquareWarning size={18} />
                  <div>
                    <strong>Potential AI Submission Detected</strong>
                    <p>AI generated probability: {reviewGrade.aiDetectionScore}%</p>
                  </div>
                </div>
              )}

              <div className={styles.gradeSection}>
                <h3>AI Feedback</h3>
                <p className={styles.aiFeedback}>{reviewGrade.feedback}</p>
                
                {reviewGrade.strengths && reviewGrade.strengths.length > 0 && (
                  <div className={styles.strengths}>
                    <strong>Strengths:</strong>
                    <ul>
                      {reviewGrade.strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
                
                {reviewGrade.improvements && reviewGrade.improvements.length > 0 && (
                  <div className={styles.improvements}>
                    <strong>Areas for Improvement:</strong>
                    <ul>
                      {reviewGrade.improvements.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              <form onSubmit={handleReviewSubmit} className={styles.reviewForm}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>AI Suggested Score (Out of {reviewGrade.maxScore})</label>
                    <div className={styles.readOnlyScore}>{reviewGrade.totalScore}</div>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Final Score Override</label>
                    <input 
                      type="number" 
                      step="0.5"
                      min="0"
                      max={reviewGrade.maxScore}
                      className={styles.input} 
                      value={overrideScore}
                      onChange={e => setOverrideScore(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Teacher Note (Internal)</label>
                  <textarea 
                    className={styles.textarea} 
                    rows={3}
                    value={teacherNote}
                    onChange={e => setTeacherNote(e.target.value)}
                    placeholder="Add a note about this review or AI detection..."
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setReviewGrade(null)}>Cancel</button>
                  <button type="submit" className={styles.submitBtn} disabled={updateGrade.isPending}>
                    {updateGrade.isPending ? 'Saving...' : <><Save size={14}/> Save Review & Mark Approved</>}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
