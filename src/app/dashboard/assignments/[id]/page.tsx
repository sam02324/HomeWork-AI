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
  Eye,
  Save,
  Pencil,
  Trash2,
  BookOpen
} from 'lucide-react';
import styles from './page.module.css';
import { Reveal } from '@/components/motion/Reveal';
import { useToast } from '@/components/ui/Toast';
import { 
  useAssignment, 
  useStudents, 
  useAssignmentSubmissions,
  useCreateSubmission,
  useUploadFile,
  useGradeAssignment,
  useSyncSubmissions,
  useUpdateAssignment,
  useDeleteSubmission,
} from '@/lib/api-client';
import type { Grade, RubricCriteria } from '@/db/schema';

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
  const deleteSubmission = useDeleteSubmission();

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ message: string; errors: string[] } | null>(null);

  const updateAssignment = useUpdateAssignment(id);
  const toast = useToast();

  // Pre-Grade Modal State
  const [showPreGradeModal, setShowPreGradeModal] = useState(false);
  const [localInstructions, setLocalInstructions] = useState('');
  const [localRubric, setLocalRubric] = useState<RubricCriteria[]>([]);

  // Edit Details Modal State
  const [showEditDetailsModal, setShowEditDetailsModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMaxScore, setEditMaxScore] = useState('');
  const [editDueDate, setEditDueDate] = useState('');

  // Reference Answers Modal State
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [localReferenceText, setLocalReferenceText] = useState('');
  const [isUploadingReference, setIsUploadingReference] = useState(false);

  // The API orders submissions newest first. Render every attempt instead of
  // collapsing them to the first submission for each student.
  const submissionRows = submissions?.map((sub) => ({
    student: sub.student,
    submission: sub,
  })) ?? [];
  const studentsWithoutSubmissions = students?.filter(
    (student) => !submissions?.some((sub) => sub.studentId === student.id)
  ) ?? [];

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
      toast.error('Failed to upload submission');
    } finally {
      setUploadingFor(null);
    }
  }

  function openPreGradeModal() {
    setLocalInstructions(assignment?.gradingInstructions || '');
    setLocalRubric(Array.isArray(assignment?.rubric) ? [...assignment.rubric] : []);
    setShowPreGradeModal(true);
  }

  function openReferenceModal() {
    setLocalReferenceText(assignment?.referenceAnswers || '');
    setShowReferenceModal(true);
  }

  async function handleReferenceFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setIsUploadingReference(true);
    try {
      const text = await file.text();
      setLocalReferenceText(prev => prev ? prev + '\n\n--- Uploaded from: ' + file.name + ' ---\n\n' + text : text);
    } catch {
      toast.error('Could not read the file. Please paste the content manually.');
    } finally {
      setIsUploadingReference(false);
      e.target.value = '';
    }
  }

  function openEditDetailsModal() {
    setEditTitle(assignment?.title || '');
    setEditMaxScore(assignment?.maxScore?.toString() || '100');
    setEditDueDate(assignment?.dueDate ? new Date(assignment.dueDate).toISOString().slice(0, 16) : '');
    setShowEditDetailsModal(true);
  }

  async function handleEditDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateAssignment.mutateAsync({
        title: editTitle,
        maxScore: parseInt(editMaxScore),
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
      });
      setShowEditDetailsModal(false);
    } catch {
      toast.error('Failed to update assignment details');
    }
  }

  return (
    <Reveal className={styles.page}>
      <div className={styles.header} data-reveal>
        <div className={styles.headerLeft}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={16} /> Back
          </button>
          <span className="page-eyebrow">Assignment</span>
          <div className={styles.titleWrapper}>
            <h1 className="page-title">{assignment.title}</h1>
            <button className={styles.editTitleBtn} onClick={openEditDetailsModal} title="Edit Assignment Details">
              <Pencil size={16} />
            </button>
          </div>
          <p className={styles.subtitle}>
            {assignment.classroom?.name} • Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'No deadline'}
          </p>
        </div>
        <div className={styles.headerRight}>
          <button
            className={styles.syncBtn}
            onClick={openPreGradeModal}
            title="Review and edit the AI Grading Rubric"
          >
            <FileText size={16} /> Review Rubric
          </button>
          <button
            className={styles.syncBtn}
            onClick={openReferenceModal}
            title="Add or edit reference answers / question paper for grading"
          >
            <BookOpen size={16} /> Add Reference
          </button>
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
            onClick={async () => {
              if (confirm('Are you sure you want to start grading all pending submissions?')) {
                try {
                  const result = await gradeAssignment.mutateAsync(id);
                  if (result.gradedCount > 0) {
                    toast.success(result.message);
                  } else {
                    toast.error(result.errors[0] || 'No submissions needed grading.');
                  }
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : 'Grading failed');
                }
              }
            }}
            disabled={gradeAssignment.isPending || !submissions?.some(s => s.status === 'pending' || s.status === 'error')}
            title="Start grading all pending submissions using the saved rubric"
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
        <div className={styles.statCard} data-reveal>
          <span className={styles.statLabel}>Total Students</span>
          <span className={styles.statValue}>{students?.length || 0}</span>
        </div>
        <div className={styles.statCard} data-reveal>
          <span className={styles.statLabel}>Submissions</span>
          <span className={styles.statValue}>{assignment.submissionCount}</span>
        </div>
        <div className={styles.statCard} data-reveal>
          <span className={styles.statLabel}>Graded</span>
          <span className={styles.statValue}>{assignment.gradedCount}</span>
        </div>
        <div className={styles.statCard} data-reveal>
          <span className={styles.statLabel}>Max Score</span>
          <span className={styles.statValue}>{assignment.maxScore}</span>
        </div>
      </div>

      <div className={styles.submissionsSection} data-reveal>
        <h2 className={styles.sectionTitle}>Student Submissions</h2>
        
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll Number</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody className="stagger-children">
              {submissionRows.map(({ student, submission: sub }) => {
                const grade = sub.grade as Grade | undefined;

                return (
                  <tr key={sub.id} className={styles.row}>
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
                      {new Date(sub.submittedAt).toLocaleString()}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${sub.status === 'graded' ? styles.badgeSuccess : styles.badgeWarning}`}>
                        {sub.status === 'graded' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {sub.status === 'graded' ? 'Graded' : 'Pending'}
                      </span>
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
                        <button
                          className={styles.viewSubBtn}
                          onClick={() => {
                            const url = sub.fileUrl
                              || (sub.googleDriveFileId ? `https://drive.google.com/file/d/${sub.googleDriveFileId}/view` : null);
                            if (url) {
                              window.open(url, '_blank');
                            } else {
                              toast.error('No file URL available for this submission.');
                            }
                          }}
                          title="View Document"
                        >
                          <FileText size={14} /> View
                        </button>
                        <button
                          className={styles.reviewBtn}
                          onClick={() => router.push(`/dashboard/assignments/${id}/review/${sub.id}`)}
                          title={sub.status === 'graded' && grade ? 'Review AI Grade' : 'Edit Manual Score'}
                        >
                          <Eye size={14} /> {sub.status === 'graded' && grade ? 'Review Grade' : 'Edit Score'}
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this submission?')) {
                              deleteSubmission.mutate(sub.id);
                            }
                          }}
                          disabled={deleteSubmission.isPending}
                          title="Delete Submission"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            background: 'transparent',
                            border: '1px solid var(--danger-color)',
                            color: 'var(--danger-color)',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.8rem'
                          }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {studentsWithoutSubmissions.map((student) => {
                const isUploading = uploadingFor === student.id;
                return (
                  <tr key={student.id} className={styles.row}>
                    <td><strong>{student.name}</strong></td>
                    <td>{student.rollNumber}</td>
                    <td>—</td>
                    <td><span className={styles.badgePending}>No Submission</span></td>
                    <td><span className={styles.textMuted}>—</span></td>
                    <td>
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
                    </td>
                  </tr>
                );
              })}
              {submissionRows.length === 0 && studentsWithoutSubmissions.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyState}>
                    No students in this classroom yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pre-Grade Rubric Editor Modal */}
      {showPreGradeModal && (
        <div className={styles.modalOverlay} onClick={() => setShowPreGradeModal(false)}>
          <div className={styles.modal} style={{ width: '800px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Review Grading Instructions</h2>
              <button className={styles.closeBtn} onClick={() => setShowPreGradeModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.modalContent}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Before grading, you can tweak the AI&apos;s grading instructions and view the rubric criteria.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Global Grading Instructions (Prompt for AI)</label>
                <textarea 
                  className={styles.textarea} 
                  rows={4}
                  value={localInstructions}
                  onChange={e => setLocalInstructions(e.target.value)}
                  placeholder="e.g., Be strict on unit conversions. Do not penalize for spelling mistakes."
                />
              </div>

              <div className={styles.gradeSection} style={{ marginTop: '16px' }}>
                <h3>Current Rubric ({localRubric.length} Criteria)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                  {localRubric.map((crit, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ flex: 1 }}>
                        <strong>{crit.name}</strong>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>{crit.description || 'No description'}</p>
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--accent)' }}>
                        {crit.weight} pts
                      </div>
                    </div>
                  ))}
                  {localRubric.length === 0 && (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No rubric criteria set. The AI will grade based purely on the instructions above.</p>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowPreGradeModal(false)}>Cancel</button>
                <button type="button" className={styles.submitBtn} onClick={async () => {
                  try {
                    await updateAssignment.mutateAsync({ 
                      gradingInstructions: localInstructions, 
                      rubric: localRubric 
                    });
                    setShowPreGradeModal(false);
                    toast.success('Rubric saved');
                  } catch { toast.error('Save failed'); }
                }} disabled={updateAssignment.isPending}>
                  {updateAssignment.isPending ? 'Saving...' : <><Save size={14}/> Save Rubric</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Details Modal */}
      {showEditDetailsModal && (
        <div className={styles.modalOverlay} onClick={() => setShowEditDetailsModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Edit Assignment</h2>
              <button className={styles.closeBtn} onClick={() => setShowEditDetailsModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <form onSubmit={handleEditDetailsSubmit} className={styles.reviewForm}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Title</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Max Score</label>
                    <input 
                      type="number" 
                      min="1"
                      className={styles.input} 
                      value={editMaxScore}
                      onChange={e => setEditMaxScore(e.target.value)}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Due Date (Optional)</label>
                    <input 
                      type="datetime-local" 
                      className={styles.input} 
                      value={editDueDate}
                      onChange={e => setEditDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowEditDetailsModal(false)}>Cancel</button>
                  <button type="submit" className={styles.submitBtn} disabled={updateAssignment.isPending}>
                    {updateAssignment.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reference Answers Modal */}
      {showReferenceModal && (
        <div className={styles.modalOverlay} onClick={() => setShowReferenceModal(false)}>
          <div className={styles.modal} style={{ width: '800px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Reference Answers / Question Paper</h2>
              <button className={styles.closeBtn} onClick={() => setShowReferenceModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className={styles.modalContent}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Paste or upload the assignment questions and/or reference answer key. The AI grader will use this as a guide when evaluating student submissions.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.label}>Upload Question Paper / Answer Key</label>
                <label className={styles.uploadBtn} style={{ alignSelf: 'flex-start' }}>
                  <Upload size={14} />
                  {isUploadingReference ? 'Reading...' : 'Upload .txt / .md file'}
                  <input 
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={handleReferenceFileUpload}
                    accept=".txt,.md,.text,.csv,.json"
                    disabled={isUploadingReference}
                  />
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: '4px 0 0 0' }}>
                  Supported: .txt, .md, .csv, .json — contents will be appended below.
                </p>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Questions / Reference Answers</label>
                <textarea 
                  className={styles.textarea} 
                  rows={10}
                  value={localReferenceText}
                  onChange={e => setLocalReferenceText(e.target.value)}
                  placeholder={"Paste the assignment questions or reference answer key here...\n\nExample:\nQ1. What is the chemical formula of water?\nA1. H₂O\n\nQ2. Explain photosynthesis in 3 sentences.\nA2. Photosynthesis is the process by which..."}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowReferenceModal(false)}>Cancel</button>
                <button type="button" className={styles.submitBtn} onClick={async () => {
                  try {
                    await updateAssignment.mutateAsync({ 
                      referenceAnswers: localReferenceText
                    });
                    setShowReferenceModal(false);
                    toast.success('Reference answers saved');
                  } catch { toast.error('Save failed'); }
                }} disabled={updateAssignment.isPending}>
                  {updateAssignment.isPending ? 'Saving...' : <><Save size={14}/> Save Reference</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Reveal>
  );
}
