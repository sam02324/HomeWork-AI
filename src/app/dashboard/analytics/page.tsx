'use client';

import { Users, FileText, TrendingUp, Clock } from 'lucide-react';
import styles from './page.module.css';
import { useDashboardStats, useAssignments, useClassrooms } from '@/lib/api-client';
import { Reveal } from '@/components/motion/Reveal';

export default function AnalyticsPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: assignments } = useAssignments();
  const { data: classrooms } = useClassrooms();

  const totalStudents = stats?.totalStudents ?? 0;
  const totalAssignments = stats?.totalAssignments ?? 0;
  const avgScore = stats?.avgScore ?? 0;
  const timeSaved = stats?.timeSavedMinutes ?? 0;
  const timeSavedLabel = timeSaved >= 60 ? `${(timeSaved / 60).toFixed(1)} hrs` : `${timeSaved} min`;

  const STATS = [
    { label: 'Total Students', value: statsLoading ? '...' : totalStudents, icon: Users, color: 'var(--accent)' },
    { label: 'Total Assignments', value: statsLoading ? '...' : totalAssignments, icon: FileText, color: 'hsl(280,65%,60%)' },
    { label: 'Overall Average', value: statsLoading ? '...' : `${avgScore}%`, icon: TrendingUp, color: 'var(--score-good)' },
    { label: 'Time Saved', value: statsLoading ? '...' : timeSavedLabel, icon: Clock, color: 'var(--success)' },
  ];

  const hasData = totalStudents > 0 || totalAssignments > 0;

  return (
    <Reveal className={styles.page}>
      <div className={styles.header} data-reveal>
        <span className="page-eyebrow">Analytics</span>
        <h1 className="page-title">
          Performance <em className="serif-accent">insights</em>
        </h1>
        <p className={styles.subtitle}>Performance insights across all your classes</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={styles.statCard} data-reveal>
              <div className={styles.statIcon} style={{ background: `${s.color}15`, color: s.color }}><Icon size={18} /></div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {!hasData ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: 'var(--text-tertiary)',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '1px solid var(--glass-border)',
          marginTop: '20px',
        }}>
          <TrendingUp size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '1.1rem' }}>No analytics data yet</h3>
          <p style={{ maxWidth: '400px', margin: '0 auto', lineHeight: 1.6, fontSize: '0.9rem' }}>
            Create classrooms, add students, create assignments, and start grading to see analytics here.
          </p>
        </div>
      ) : (
        <div className={styles.chartsGrid}>
          {/* Assignment Overview */}
          <div className={styles.chartCard} data-reveal>
            <h3 className={styles.chartTitle}>Assignments by Status</h3>
            <div style={{ padding: '20px' }}>
              {['draft', 'published', 'grading', 'graded'].map(status => {
                const count = assignments?.filter(a => a.status === status).length ?? 0;
                const colors: Record<string, string> = {
                  draft: 'var(--text-tertiary)',
                  published: 'hsl(217, 91%, 60%)',
                  grading: 'var(--warning)',
                  graded: 'var(--success)',
                };
                return (
                  <div key={status} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0', borderBottom: '1px solid var(--glass-border)',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: colors[status],
                      flexShrink: 0,
                    }} />
                    <span style={{ flex: 1, textTransform: 'capitalize', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{status}</span>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>{count}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Classrooms Summary */}
          <div className={styles.chartCard} data-reveal>
            <h3 className={styles.chartTitle}>Classrooms Summary</h3>
            <div style={{ padding: '20px' }}>
              {classrooms && classrooms.length > 0 ? (
                classrooms.map(c => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0', borderBottom: '1px solid var(--glass-border)',
                  }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: c.color || 'var(--accent)',
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 500 }}>
                        {c.grade} {c.subject} — {c.name}
                      </div>
                      <div style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>
                        {c.studentCount} students · Avg: {c.avgScore ?? '—'}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No classrooms yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Reveal>
  );
}
