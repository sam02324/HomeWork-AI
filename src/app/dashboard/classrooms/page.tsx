'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Users, BookOpen, TrendingUp, ChevronRight, X } from 'lucide-react';
import styles from './page.module.css';
import { useClassrooms, useCreateClassroom } from '@/lib/api-client';

export default function ClassroomsPage() {
  const { data: classrooms, isLoading } = useClassrooms();
  const createClassroom = useCreateClassroom();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '', grade: '', color: '#e11d48' });
  const [error, setError] = useState('');

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
      ) : !classrooms || classrooms.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)' }}>
          No classrooms yet. Click "Create Classroom" to get started.
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
                  <ChevronRight size={16} className={styles.cardArrow} />
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
                  ⚠️ {error}
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
    </div>
  );
}
