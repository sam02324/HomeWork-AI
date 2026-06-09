'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Users, BookOpen, TrendingUp, ChevronRight, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import styles from './page.module.css';
import { useClassrooms, useCreateClassroom, useDeleteClassroom, useUpdateClassroom } from '@/lib/api-client';

interface ClassroomData {
  id: string;
  name: string;
  subject: string;
  grade: string;
  color: string | null;
  studentCount: number;
  avgScore: number | null;
}

export default function ClassroomsPage() {
  const { data: classrooms, isLoading, error: fetchError } = useClassrooms();
  const createClassroom = useCreateClassroom();
  const deleteClassroom = useDeleteClassroom();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', grade: '', color: '#e11d48' });
  const [error, setError] = useState('');

  // Edit/Delete state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editingClassroom, setEditingClassroom] = useState<ClassroomData | null>(null);
  const [editForm, setEditForm] = useState({ name: '', subject: '', grade: '' });
  const [editError, setEditError] = useState('');
  const [deletingClassroom, setDeletingClassroom] = useState<ClassroomData | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createClassroom.mutateAsync(formData);
      setIsModalOpen(false);
      setFormData({ name: '', subject: '', grade: '', color: '#e11d48' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create classroom';
      setError(message);
      console.error('Failed to create classroom', err);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClassroom) return;
    setEditError('');
    try {
      await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      // Refetch
      window.location.reload();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update classroom';
      setEditError(message);
    }
  };

  const handleDelete = async () => {
    if (!deletingClassroom) return;
    try {
      await deleteClassroom.mutateAsync(deletingClassroom.id);
      setDeletingClassroom(null);
    } catch (err) {
      console.error('Failed to delete classroom', err);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Classrooms</h1>
          <p className={styles.subtitle}>Manage your classes, students, and assignments</p>
        </div>
        <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Create Classroom
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>Loading classrooms...</div>
      ) : fetchError ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--error)' }}>
          Error loading classrooms: {fetchError instanceof Error ? fetchError.message : String(fetchError)}
        </div>
      ) : !classrooms || classrooms.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          No classrooms yet. Click &quot;Create Classroom&quot; to get started.
        </div>
      ) : (
        <div className={styles.grid}>
          {classrooms.map((c) => (
            <Link key={c.id} href={`/dashboard/classrooms/${c.id}`} className={styles.card}>
              <div className={styles.cardBorder} style={{ background: c.color || 'var(--accent)' }} />
              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <div className={styles.subjectIcon} style={{ background: `${c.color || '#e11d48'}20`, color: c.color || '#e11d48' }}>
                    <BookOpen size={18} />
                  </div>
                  <div className={styles.cardHeaderRight}>
                    <div className={styles.cardHeaderWrap} ref={openDropdown === c.id ? dropdownRef : null}>
                      <button
                        className={styles.moreBtn}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === c.id ? null : c.id);
                        }}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openDropdown === c.id && (
                        <div className={styles.dropdown}>
                          <button
                            className={styles.dropdownItem}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenDropdown(null);
                              setEditForm({ name: c.name, subject: c.subject, grade: c.grade });
                              setEditingClassroom(c as ClassroomData);
                            }}
                          >
                            <Pencil size={13} /> Rename
                          </button>
                          <button
                            className={styles.dropdownItemDanger}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setOpenDropdown(null);
                              setDeletingClassroom(c as ClassroomData);
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} className={styles.cardArrow} />
                  </div>
                </div>
                <h3 className={styles.cardTitle}>{c.grade} {c.subject}</h3>
                <p className={styles.cardClass}>{c.name}</p>
                <div className={styles.cardStats}>
                  <div className={styles.cardStat}>
                    <Users size={13} />
                    <span>{c.studentCount} students</span>
                  </div>
                  <div className={styles.cardStat}>
                    <TrendingUp size={13} />
                    <span>Avg: {c.avgScore ?? '-'}%</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create New Classroom</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  padding: '10px 14px',
                  marginBottom: '16px',
                  background: 'hsl(0, 80%, 95%)',
                  border: '1px solid hsl(0, 70%, 80%)',
                  borderRadius: '8px',
                  color: 'hsl(0, 70%, 40%)',
                  fontSize: '0.85rem',
                }}>
                  {error}
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Class Name / Section (e.g., Class A)</label>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Class A" 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject (e.g., Physics)</label>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.subject}
                  onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Physics" 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Grade / Level (e.g., 12th)</label>
                <input 
                  type="text" 
                  required 
                  className={styles.input} 
                  value={formData.grade}
                  onChange={e => setFormData({ ...formData, grade: e.target.value })}
                  placeholder="12th" 
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Theme Color</label>
                <input 
                  type="color" 
                  className={styles.input} 
                  value={formData.color}
                  onChange={e => setFormData({ ...formData, color: e.target.value })}
                  style={{ height: '40px', padding: '4px' }}
                />
              </div>
              
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.submitBtn} disabled={createClassroom.isPending}>
                  {createClassroom.isPending ? 'Creating...' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Classroom Modal */}
      {editingClassroom && (
        <div className={styles.modalOverlay} onClick={() => setEditingClassroom(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Rename Classroom</h2>
              <button className={styles.closeBtn} onClick={() => setEditingClassroom(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRename}>
              {editError && (
                <div style={{
                  padding: '10px 14px', marginBottom: '16px',
                  background: 'hsl(0, 80%, 95%)', border: '1px solid hsl(0, 70%, 80%)',
                  borderRadius: '8px', color: 'hsl(0, 70%, 40%)', fontSize: '0.85rem',
                }}>
                  {editError}
                </div>
              )}
              <div className={styles.formGroup}>
                <label className={styles.label}>Class Name</label>
                <input type="text" required className={styles.input} value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Subject</label>
                <input type="text" required className={styles.input} value={editForm.subject}
                  onChange={e => setEditForm({ ...editForm, subject: e.target.value })} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Grade / Level</label>
                <input type="text" required className={styles.input} value={editForm.grade}
                  onChange={e => setEditForm({ ...editForm, grade: e.target.value })} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setEditingClassroom(null)}>Cancel</button>
                <button type="submit" className={styles.submitBtn}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingClassroom && (
        <div className={styles.modalOverlay} onClick={() => setDeletingClassroom(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Delete Classroom</h2>
              <button className={styles.closeBtn} onClick={() => setDeletingClassroom(null)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 'var(--space-6)' }}>
              Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deletingClassroom.name}</strong>?
              This will also delete all students and assignments in this classroom. This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={() => setDeletingClassroom(null)}>Cancel</button>
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={deleteClassroom.isPending}
              >
                {deleteClassroom.isPending ? 'Deleting...' : 'Delete Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
