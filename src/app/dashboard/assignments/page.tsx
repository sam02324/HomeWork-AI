'use client';

import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import styles from './page.module.css';

import { useState } from 'react';
import { useAssignments, useClassrooms, useGradeAssignment } from '@/lib/api-client';

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'statusDraft' },
  published: { label: 'Published', cls: 'statusPublished' },
  grading: { label: 'Grading', cls: 'statusGrading' },
  graded: { label: 'Graded', cls: 'statusGraded' },
};

export default function AssignmentsPage() {
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: assignments, isLoading } = useAssignments({
    classroomId: classFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: classrooms } = useClassrooms();
  const gradeAssignment = useGradeAssignment();

  // Simple client-side search
  const filteredAssignments = assignments?.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleGrade(id: string) {
    try {
      await gradeAssignment.mutateAsync(id);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Assignments</h1>
          <p className={styles.subtitle}>Manage and grade all your assignments</p>
        </div>
        <Link href="/dashboard/assignments/new" className={styles.createBtn}>
          <Plus size={16} /> Create Assignment
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input 
            className={styles.searchInput} 
            placeholder="Search assignments..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className={styles.filterSelect} value={classFilter} onChange={e => setClassFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classrooms?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="grading">Grading</option>
          <option value="graded">Graded</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Class</th>
              <th>Submissions</th>
              <th>Status</th>
              <th>Avg Score</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>Loading...</td></tr>
            ) : !filteredAssignments || filteredAssignments.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)' }}>No assignments found</td></tr>
            ) : (
              filteredAssignments.map((a) => {
                const st = STATUS_MAP[a.status] || STATUS_MAP.draft;
                const c = classrooms?.find(cls => cls.id === a.classroomId);
                return (
                  <tr key={a.id} className={styles.row}>
                    <td className={styles.titleCell}>{a.title}</td>
                    <td className={styles.classCell}>{c ? c.name : '—'}</td>
                    <td><span className={styles.mono}>{a.gradedCount}/{a.submissionCount}</span></td>
                    <td>
                      <span className={`${styles.badge} ${styles[st.cls]}`}>
                        {a.status === 'grading' && <span className={styles.pulseDot} />}
                        {st.label}
                      </span>
                    </td>
                    <td><span className={styles.mono}>—</span></td>
                    <td className={styles.dateCell}>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className={styles.actions}>
                        {(a.status === 'draft' || a.status === 'published' || a.status === 'grading') && (
                          <button 
                            className={styles.gradeBtn} 
                            onClick={() => handleGrade(a.id)}
                            disabled={gradeAssignment.isPending}
                          >
                            Grade (Mock)
                          </button>
                        )}
                        <Link href={`/dashboard/assignments/${a.id}`} className={styles.viewBtn}>View</Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
