'use client';

import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  Trash2,
  GripVertical,
  Upload,
  FileText,
  Image as ImageIcon,
  Type,
  PenTool,
  Info,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import styles from './page.module.css';

/* ───── types ───── */
interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  description: string;
  levels: { label: string; points: number; description: string }[];
}

/* ───── mock data ───── */
const CLASSES = [
  { id: '1', name: '12th Physics — Class A', students: 32 },
  { id: '2', name: '12th Physics — Class B', students: 28 },
  { id: '3', name: '12th Chemistry — Class B', students: 45 },
  { id: '4', name: '11th Physics — Class C', students: 38 },
  { id: '5', name: '12th Maths — Class A', students: 32 },
];

const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Computer Science'];

const RUBRIC_TEMPLATES = [
  {
    name: 'Numerical Problem Set',
    criteria: [
      { name: 'Correct Answer', weight: 40 },
      { name: 'Working/Steps', weight: 30 },
      { name: 'Diagram & Units', weight: 15 },
      { name: 'Presentation', weight: 15 },
    ],
  },
  {
    name: 'Essay / Long Answer',
    criteria: [
      { name: 'Content Accuracy', weight: 35 },
      { name: 'Explanation Depth', weight: 25 },
      { name: 'Examples & Diagrams', weight: 20 },
      { name: 'Language & Structure', weight: 20 },
    ],
  },
  {
    name: 'Lab Report',
    criteria: [
      { name: 'Aim & Procedure', weight: 20 },
      { name: 'Observation Table', weight: 25 },
      { name: 'Calculations', weight: 30 },
      { name: 'Conclusion', weight: 15 },
      { name: 'Diagram', weight: 10 },
    ],
  },
];

const STEPS = [
  { label: 'Basics', icon: FileText },
  { label: 'Rubric', icon: ClipboardList },
  { label: 'Answers', icon: Sparkles },
  { label: 'Review', icon: Check },
];

/* ───── helpers ───── */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultCriterion(): RubricCriterion {
  return {
    id: uid(),
    name: '',
    weight: 25,
    description: '',
    levels: [
      { label: 'Excellent', points: 10, description: '' },
      { label: 'Good', points: 7, description: '' },
      { label: 'Fair', points: 4, description: '' },
      { label: 'Poor', points: 1, description: '' },
    ],
  };
}

/* ════════════════════════════════════════════════════════
   PAGE COMPONENT
   ════════════════════════════════════════════════════════ */
export default function NewAssignmentPage() {
  const [step, setStep] = useState(0);

  /* step 1 state */
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [submissionType, setSubmissionType] = useState<'any' | 'pdf' | 'image' | 'text'>('any');

  /* step 2 state */
  const [criteria, setCriteria] = useState<RubricCriterion[]>([defaultCriterion()]);
  const [strictness, setStrictness] = useState(3);

  /* step 3 state */
  const [referenceAnswers, setReferenceAnswers] = useState('');
  const [gradingInstructions, setGradingInstructions] = useState('');
  const [referenceFiles, setReferenceFiles] = useState<string[]>([]);

  /* ── rubric helpers ── */
  function addCriterion() {
    setCriteria([...criteria, defaultCriterion()]);
  }

  function removeCriterion(id: string) {
    setCriteria(criteria.filter((c) => c.id !== id));
  }

  function updateCriterion(id: string, field: string, value: string | number) {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function applyTemplate(templateIndex: number) {
    const tmpl = RUBRIC_TEMPLATES[templateIndex];
    const newCriteria: RubricCriterion[] = tmpl.criteria.map((c) => ({
      ...defaultCriterion(),
      name: c.name,
      weight: c.weight,
    }));
    setCriteria(newCriteria);
  }

  function addReferenceFile() {
    setReferenceFiles([...referenceFiles, `reference_${referenceFiles.length + 1}.pdf`]);
  }

  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);

  /* ── navigation ── */
  const canProceed = [
    () => title && classId && subject && maxScore,
    () => criteria.length > 0 && criteria.every((c) => c.name),
    () => true,
    () => true,
  ];

  function next() {
    if (step < 3 && canProceed[step]()) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }

  const selectedClass = CLASSES.find((c) => c.id === classId);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/dashboard/assignments" className={styles.backLink}>
            <ArrowLeft size={18} />
            <span>Assignments</span>
          </a>
          <h1 className={styles.title}>Create New Assignment</h1>
          <p className={styles.subtitle}>Set up the assignment, build your rubric, and let AI handle the grading</p>
        </div>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isComplete = i < step;
          return (
            <div key={s.label} className={styles.stepperItem}>
              <button
                className={`${styles.stepCircle} ${isActive ? styles.stepActive : ''} ${isComplete ? styles.stepComplete : ''}`}
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
              >
                {isComplete ? <Check size={16} /> : <Icon size={16} />}
              </button>
              <span className={`${styles.stepLabel} ${isActive ? styles.stepLabelActive : ''}`}>{s.label}</span>
              {i < STEPS.length - 1 && (
                <div className={`${styles.stepLine} ${isComplete ? styles.stepLineComplete : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className={styles.content}>
        {/* ── STEP 1: Basics ── */}
        {step === 0 && (
          <div className={styles.stepContent} key="step-0">
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Assignment Title *</label>
                <input
                  className={styles.input}
                  placeholder="e.g., Thermodynamics Chapter Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Class *</label>
                <select className={styles.select} value={classId} onChange={(e) => setClassId(e.target.value)}>
                  <option value="">Select a class</option>
                  {CLASSES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.students} students)
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Subject *</label>
                <select className={styles.select} value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">Select subject</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Topic</label>
                <input
                  className={styles.input}
                  placeholder="e.g., Laws of Thermodynamics"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Maximum Score *</label>
                <input
                  className={styles.input}
                  type="number"
                  min="1"
                  max="1000"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Due Date</label>
                <input
                  className={styles.input}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup} style={{ marginTop: 24 }}>
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                placeholder="Instructions for students (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className={styles.formGroup} style={{ marginTop: 24 }}>
              <label className={styles.label}>Accepted Submission Types</label>
              <div className={styles.submissionTypes}>
                {[
                  { value: 'any' as const, label: 'All Types', icon: FileText },
                  { value: 'pdf' as const, label: 'PDF Only', icon: FileText },
                  { value: 'image' as const, label: 'Image Only', icon: ImageIcon },
                  { value: 'text' as const, label: 'Text Only', icon: Type },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.value}
                      className={`${styles.typeButton} ${submissionType === t.value ? styles.typeActive : ''}`}
                      onClick={() => setSubmissionType(t.value)}
                    >
                      <Icon size={18} />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Rubric ── */}
        {step === 1 && (
          <div className={styles.stepContent} key="step-1">
            {/* Templates */}
            <div className={styles.templates}>
              <div className={styles.templatesHeader}>
                <Sparkles size={16} className={styles.templatesIcon} />
                <span>Quick Templates</span>
              </div>
              <div className={styles.templateButtons}>
                {RUBRIC_TEMPLATES.map((t, i) => (
                  <button key={t.name} className={styles.templateBtn} onClick={() => applyTemplate(i)}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grading Strictness */}
            <div className={styles.strictnessSection}>
              <label className={styles.label}>
                Grading Strictness
                <span className={styles.strictnessValue}>
                  {['Very Lenient', 'Lenient', 'Moderate', 'Strict', 'Very Strict'][strictness - 1]}
                </span>
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={strictness}
                onChange={(e) => setStrictness(Number(e.target.value))}
                className={styles.slider}
              />
              <div className={styles.strictnessLabels}>
                <span>Lenient</span>
                <span>Strict</span>
              </div>
            </div>

            {/* Weight Summary */}
            <div className={`${styles.weightSummary} ${totalWeight !== 100 ? styles.weightError : ''}`}>
              <Info size={14} />
              <span>
                Total weight: <strong>{totalWeight}%</strong>
                {totalWeight !== 100 && ' — should equal 100%'}
              </span>
            </div>

            {/* Criteria List */}
            <div className={styles.criteriaList}>
              {criteria.map((criterion, index) => (
                <div key={criterion.id} className={styles.criterionCard}>
                  <div className={styles.criterionHeader}>
                    <div className={styles.criterionDrag}>
                      <GripVertical size={16} />
                      <span className={styles.criterionNumber}>#{index + 1}</span>
                    </div>
                    {criteria.length > 1 && (
                      <button className={styles.removeCriterion} onClick={() => removeCriterion(criterion.id)}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <div className={styles.criterionBody}>
                    <div className={styles.criterionRow}>
                      <div className={styles.formGroup} style={{ flex: 2 }}>
                        <label className={styles.smallLabel}>Criterion Name *</label>
                        <input
                          className={styles.input}
                          placeholder="e.g., Content Accuracy"
                          value={criterion.name}
                          onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className={styles.formGroup} style={{ flex: 1 }}>
                        <label className={styles.smallLabel}>Weight (%)</label>
                        <input
                          className={styles.input}
                          type="number"
                          min={0}
                          max={100}
                          value={criterion.weight}
                          onChange={(e) => updateCriterion(criterion.id, 'weight', Number(e.target.value))}
                        />
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.smallLabel}>Description</label>
                      <input
                        className={styles.input}
                        placeholder="What should the AI evaluate for this criterion?"
                        value={criterion.description}
                        onChange={(e) => updateCriterion(criterion.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* Levels preview */}
                    <div className={styles.levelsPreview}>
                      {criterion.levels.map((level, li) => (
                        <div key={li} className={styles.levelChip}>
                          <span className={styles.levelLabel}>{level.label}</span>
                          <span className={styles.levelPoints}>{level.points}pt</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className={styles.addCriterion} onClick={addCriterion}>
              <Plus size={16} />
              <span>Add Criterion</span>
            </button>
          </div>
        )}

        {/* ── STEP 3: Reference Answers ── */}
        {step === 2 && (
          <div className={styles.stepContent} key="step-2">
            <div className={styles.answersInfo}>
              <Sparkles size={18} />
              <div>
                <h3>Reference Answers & Grading Instructions</h3>
                <p>
                  Provide model answers and specific instructions to help the AI grade more accurately.
                  The more context you give, the better the grading quality.
                </p>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Reference / Model Answers</label>
              <textarea
                className={styles.textarea}
                placeholder="Paste your answer key or model answers here. You can include question numbers, expected answers, and acceptable variations..."
                value={referenceAnswers}
                onChange={(e) => setReferenceAnswers(e.target.value)}
                rows={10}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Special Grading Instructions for AI</label>
              <textarea
                className={styles.textarea}
                placeholder="e.g., 'Give partial marks for correct approach even if final answer is wrong', 'Deduct 0.5 marks for missing units', 'Accept both CGS and SI units'..."
                value={gradingInstructions}
                onChange={(e) => setGradingInstructions(e.target.value)}
                rows={5}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Upload Reference Documents (Optional)</label>
              <div className={styles.uploadArea}>
                <div className={styles.uploadContent}>
                  <Upload size={24} />
                  <p>Drag & drop PDFs, images, or click to browse</p>
                  <span>Answer keys, marking schemes, sample solutions</span>
                </div>
              </div>
              {referenceFiles.length > 0 && (
                <div className={styles.uploadedFiles}>
                  {referenceFiles.map((f, i) => (
                    <div key={i} className={styles.uploadedFile}>
                      <FileText size={14} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className={styles.addFileBtn} onClick={addReferenceFile}>
                <Plus size={14} /> Add sample file
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 3 && (
          <div className={styles.stepContent} key="step-3">
            <div className={styles.reviewSection}>
              <h3 className={styles.reviewTitle}>Review Your Assignment</h3>

              <div className={styles.reviewGrid}>
                <div className={styles.reviewCard}>
                  <h4>Basic Details</h4>
                  <div className={styles.reviewRow}><span>Title</span><strong>{title || '—'}</strong></div>
                  <div className={styles.reviewRow}><span>Class</span><strong>{selectedClass?.name || '—'}</strong></div>
                  <div className={styles.reviewRow}><span>Subject</span><strong>{subject || '—'}</strong></div>
                  <div className={styles.reviewRow}><span>Topic</span><strong>{topic || '—'}</strong></div>
                  <div className={styles.reviewRow}><span>Max Score</span><strong>{maxScore}</strong></div>
                  <div className={styles.reviewRow}><span>Due Date</span><strong>{dueDate || 'No deadline'}</strong></div>
                  <div className={styles.reviewRow}><span>Submission Type</span><strong>{submissionType}</strong></div>
                </div>

                <div className={styles.reviewCard}>
                  <h4>Rubric ({criteria.length} criteria)</h4>
                  {criteria.map((c, i) => (
                    <div key={c.id} className={styles.reviewRow}>
                      <span>{c.name || `Criterion ${i + 1}`}</span>
                      <strong>{c.weight}%</strong>
                    </div>
                  ))}
                  <div className={styles.reviewDivider} />
                  <div className={styles.reviewRow}>
                    <span>Strictness</span>
                    <strong>{['Very Lenient', 'Lenient', 'Moderate', 'Strict', 'Very Strict'][strictness - 1]}</strong>
                  </div>
                </div>

                <div className={styles.reviewCard}>
                  <h4>AI Grading Config</h4>
                  <div className={styles.reviewRow}>
                    <span>Reference Answers</span>
                    <strong>{referenceAnswers ? `${referenceAnswers.length} chars` : 'Not provided'}</strong>
                  </div>
                  <div className={styles.reviewRow}>
                    <span>Grading Instructions</span>
                    <strong>{gradingInstructions ? `${gradingInstructions.length} chars` : 'Not provided'}</strong>
                  </div>
                  <div className={styles.reviewRow}>
                    <span>Reference Files</span>
                    <strong>{referenceFiles.length} files</strong>
                  </div>
                </div>
              </div>

              <div className={styles.estimateCard}>
                <Sparkles size={18} />
                <div>
                  <h4>AI Grading Estimate</h4>
                  <p>
                    {selectedClass
                      ? `~${selectedClass.students} submissions × ₹0.50 avg = ₹${(selectedClass.students * 0.5).toFixed(0)} estimated cost`
                      : 'Select a class to see estimate'}
                  </p>
                  <p className={styles.estimateNote}>Estimated grading time: ~{selectedClass ? Math.ceil(selectedClass.students * 0.15) : '—'} minutes</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className={styles.footer}>
        <button className={styles.backBtn} onClick={back} disabled={step === 0}>
          <ArrowLeft size={16} />
          <span>Back</span>
        </button>

        <div className={styles.footerRight}>
          {step < 3 ? (
            <button
              className={styles.nextBtn}
              onClick={next}
              disabled={!canProceed[step]()}
            >
              <span>Continue</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button className={styles.publishBtn}>
              <Sparkles size={16} />
              <span>Publish Assignment</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
