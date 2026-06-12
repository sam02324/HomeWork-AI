'use client';

import Link from 'next/link';
import { Plus, Search, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import styles from './page.module.css';

import { useState, useRef, useEffect } from 'react';
import { useAssignments, useClassrooms, useGradeAssignment, useDeleteAssignment } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/Toast';
import { Reveal } from '@/components/motion/Reveal';

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
  const deleteAssignment = useDeleteAssignment();
  const queryClient = useQueryClient();
  const toast = useToast();

  // Edit/Delete state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [editError, setEditError] = useState('');
  const [deletingAssignment, setDeletingAssignment] = useState<{ id: string; title: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    }
    if (openDropdown) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [openDropdown]);

  // Simple client-side search
  const filteredAssignments = assignments?.filter(a => 
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  async function handleGrade(id: string) {
    try {
      const result = await gradeAssignment.mutateAsync(id) as { gradedCount?: number };
      toast.success(`Grading complete — ${result?.gradedCount ?? 0} submission(s) graded.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Grading failed');
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAssignment) return;
    setEditError('');
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/assignments/${editingAssignment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (!res.ok) throw new Error('Failed to rename');
      setEditingAssignment(null);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to rename';
      setEditError(message);
    } finally {
      setIsRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deletingAssignment) return;
    try {
      await deleteAssignment.mutateAsync(deletingAssignment.id);
      toast.success('Assignment deleted');
      setDeletingAssignment(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete assignment');
    }
  }

  return (
    <Reveal className={styles.page}>
      <div className={styles.header} data-reveal>
        <div>
          <span className="page-eyebrow">Assignments</span>
          <h1 className="page-title">
            All <em className="serif-accent">assignments</em>
          </h1>
          <p className={styles.subtitle}>Manage and grade all your assignments</p>
        </div>
        <Link href="/dashboard/assignments/new" className={styles.createBtn}>
          <Plus size={16} /> Create Assignment
        </Link>
      </div>

      <div className={styles.filters} data-reveal>
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

      <div className={styles.tableWrap} data-reveal>
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
                            Grade
                          </button>
                        )}
                        <Link href={`/dashboard/assignments/${a.id}`} className={styles.viewBtn}>View</Link>
                        <div className={styles.actionWrap} ref={openDropdown === a.id ? dropdownRef : null}>
                          <button
                            className={styles.moreBtn}
                            onClick={() => setOpenDropdown(openDropdown === a.id ? null : a.id)}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === a.id && (
                            <div className={styles.dropdown}>
                              <button
                                className={styles.dropdownItem}
                                onClick={() => {
                                  setOpenDropdown(null);
                                  setNewTitle(a.title);
                                  setEditingAssignment({ id: a.id, title: a.title });
                                }}
                              >
                                <Pencil size={13} /> Rename
                              </button>
                              <button
                                className={styles.dropdownItemDanger}
                                onClick={() => {
                                  setOpenDropdown(null);
                                  setDeletingAssignment({ id: a.id, title: a.title });
                                }}
                              >
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Rename Assignment Modal */}
      {editingAssignment && (
        <div className={styles.modalOverlay} onClick={() => setEditingAssignment(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Rename Assignment</h2>
              <button className={styles.closeBtn} onClick={() => setEditingAssignment(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRename}>
              {editError && <div className={styles.errorNote}>{editError}</div>}
              <div className={styles.formGroup}>
                <label className={styles.label}>Assignment Title</label>
                <input type="text" required className={styles.input} value={newTitle}
                  onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingAssignment(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={isRenaming}>
                  {isRenaming ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAssignment && (
        <div className={styles.modalOverlay} onClick={() => setDeletingAssignment(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Assignment</h2>
              <button className={styles.closeBtn} onClick={() => setDeletingAssignment(null)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deletingAssignment.title}</strong>?
              All submissions and grades will be permanently lost. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setDeletingAssignment(null)}>Cancel</button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleteAssignment.isPending}
              >
                {deleteAssignment.isPending ? 'Deleting...' : 'Delete Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Reveal>
  );
}
