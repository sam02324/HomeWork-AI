'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Search,
  BarChart3,
  AlertTriangle,
  X,
} from 'lucide-react';
import styles from './page.module.css';
import { Reveal } from '@/components/motion/Reveal';
import { useClassroom, useStudents, useAddStudents } from '@/lib/api-client';

function getStatus(score: number | null) {
  if (score === null) return 'no-data';
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'average';
  return 'at-risk';
}

function statusColor(status: string) {
  switch (status) {
    case 'excellent': return { bg: 'var(--score-excellent-bg)', color: 'var(--score-excellent)' };
    case 'good': return { bg: 'var(--score-good-bg)', color: 'var(--score-good)' };
    case 'average': return { bg: 'var(--score-average-bg)', color: 'var(--score-average)' };
    case 'at-risk': return { bg: 'var(--score-poor-bg)', color: 'var(--score-poor)' };
    default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' };
  }
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const { data: classroom, isLoading: isClassLoading } = useClassroom(id);
  const { data: students, isLoading: isStudentsLoading } = useStudents(id);
  const addStudents = useAddStudents(id);

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRoll, setNewRoll] = useState('');

  if (isClassLoading || isStudentsLoading) {
    return <div className={styles.loading}>Loading classroom data...</div>;
  }

  if (!classroom) {
    return <div className={styles.error}>Classroom not found.</div>;
  }

  const filteredStudents = students?.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.rollNumber.toString().includes(search)
  ) || [];

  const excellentCount = students?.filter(s => getStatus(s.avgScore) === 'excellent').length || 0;
  const goodCount = students?.filter(s => getStatus(s.avgScore) === 'good').length || 0;
  const averageCount = students?.filter(s => getStatus(s.avgScore) === 'average').length || 0;
  const atRiskCount = students?.filter(s => getStatus(s.avgScore) === 'at-risk').length || 0;

  const studentCount = students?.length || 0;
  const avgScore = studentCount > 0 
    ? Math.round(students!.reduce((acc, s) => acc + (s.avgScore || 0), 0) / studentCount)
    : 0;

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!newName || !newRoll) return;
    try {
      await addStudents.mutateAsync({
        students: [{
          name: newName,
          rollNumber: newRoll,
        }]
      });
      setIsModalOpen(false);
      setNewName('');
      setNewRoll('');
    } catch (err) {
      console.error(err);
      alert('Failed to add student');
    }
  }

  return (
    <Reveal className={styles.page}>
      <Link href="/dashboard/classrooms" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Classrooms
      </Link>

      {/* Hero */}
      <div className={styles.hero} data-reveal>
        <div className={styles.heroColor} style={{ background: classroom.color || '#4A90D9' }} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{classroom.grade} {classroom.subject} — {classroom.name}</h1>
          <div className={styles.heroStats}>
            <span><Users size={14} /> {studentCount} students</span>
            <span><TrendingUp size={14} /> Avg: {avgScore}%</span>
          </div>
        </div>
        <Link href="/dashboard/assignments/new" className={styles.addBtn}>
          <Plus size={16} /> New Assignment
        </Link>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow} data-reveal>
        {[
          { label: 'Excellent (≥85)', count: excellentCount, color: 'var(--score-excellent)' },
          { label: 'Good (70-84)', count: goodCount, color: 'var(--score-good)' },
          { label: 'Average (50-69)', count: averageCount, color: 'var(--score-average)' },
          { label: 'At-Risk (<50)', count: atRiskCount, color: 'var(--score-poor)' },
        ].map((s, i) => (
          <div key={i} className={styles.statMini}>
            <div className={styles.statDot} style={{ background: s.color }} />
            <span className={styles.statCount}>{s.count}</span>
            <span className={styles.statMiniLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search & Actions */}
      <div className={styles.toolbar} data-reveal>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input 
            className={styles.searchInput} 
            placeholder="Search students..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button className={styles.addStudentBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add Student
        </button>
      </div>

      {/* Student Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Roll</th>
              <th>Student</th>
              <th>Average</th>
              <th>Submissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>
                  No students found. Add a student to get started!
                </td>
              </tr>
            ) : filteredStudents.map((s) => {
              const status = getStatus(s.avgScore);
              const sc = statusColor(status);
              const initials = s.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              return (
                <tr key={s.id} className={styles.row}>
                  <td className={styles.rollCell}>{s.rollNumber}</td>
                  <td>
                    <div className={styles.studentCell}>
                      <div className={styles.studentAvatar} style={{ background: `${classroom.color}22`, color: classroom.color || '#4A90D9' }}>{initials}</div>
                      <span className={styles.studentName}>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    {s.avgScore !== null ? (
                      <span className={styles.avgScore} style={{ color: sc.color }}>{s.avgScore}%</span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                    )}
                  </td>
                  <td><span className={styles.mono}>{s.submissionCount}</span></td>
                  <td>
                    {status === 'no-data' ? (
                      <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>No Data</span>
                    ) : (
                      <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                        {status === 'at-risk' && <AlertTriangle size={10} />}
                        {status}
                      </span>
                    )}
                  </td>
                  <td>
                    <Link href={`/dashboard/students/${s.id}`} className={styles.viewBtn}>
                      <BarChart3 size={13} /> View Analytics
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Add Student</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddStudent} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label>Student Name</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  placeholder="e.g. Aarav Patel"
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Roll Number</label>
                <input 
                  type="number" 
                  value={newRoll} 
                  onChange={e => setNewRoll(e.target.value)} 
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={addStudents.isPending}>
                  {addStudents.isPending ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Reveal>
  );
}
