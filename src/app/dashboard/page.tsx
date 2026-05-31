'use client';

import Link from 'next/link';
import {
  Users,
  Clock,
  TrendingUp,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Upload,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import styles from './page.module.css';
import { useDashboardStats, useAssignments } from '@/lib/api-client';
import { useUser } from '@clerk/nextjs';



export default function DashboardPage() {
  const { user } = useUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: assignments, isLoading: assignmentsLoading } = useAssignments();

  const firstName = user?.firstName || 'Teacher';

  const STATS = [
    { label: 'Total Students', value: statsLoading ? '...' : (stats?.totalStudents ?? 0), icon: Users, trend: '', trendUp: true, color: 'var(--accent)' },
    { label: 'Pending Gradings', value: statsLoading ? '...' : (stats?.pendingGradings ?? 0), icon: Clock, trend: '', trendUp: false, color: 'var(--warning)' },
    { label: 'Avg. Class Score', value: statsLoading ? '...' : `${stats?.avgScore ?? 0}%`, icon: TrendingUp, trend: '', trendUp: true, color: 'var(--score-good)' },
    { label: 'Graded This Week', value: statsLoading ? '...' : (stats?.gradedThisWeek ?? 0), icon: CheckCircle, trend: '', trendUp: true, color: 'var(--success)' },
  ];

  // Get active grading assignments
  const gradingAssignments = assignments?.filter((a) => a.status === 'grading') || [];
  const recentAssignments = assignments?.slice(0, 4) || [];

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good evening, {firstName} 👋</h1>
          <p className={styles.subGreeting}>
            You have <strong>{stats?.pendingGradings || 0} submissions</strong> waiting to be graded
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/dashboard/assignments/new" className={styles.primaryBtn}>
            <Plus size={16} />
            <span>New Assignment</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={styles.statCard}>
              <div className={styles.statTop}>
                <div className={styles.statIconWrap} style={{ background: `${stat.color}15`, color: stat.color }}>
                  <Icon size={18} />
                </div>
                {stat.trend && (
                  <span className={`${styles.statTrend} ${stat.trendUp ? styles.trendUp : styles.trendDown}`}>
                    {stat.trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className={styles.mainGrid}>
        {/* Left Column */}
        <div className={styles.leftCol}>
          <div className={styles.sectionHeader}>
            <h2>Recent Assignments</h2>
            <Link href="/dashboard/assignments" className={styles.viewAll}>
              View all <ChevronRight size={14} />
            </Link>
          </div>

          <div className={styles.assignmentList}>
            {assignmentsLoading ? (
              <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>Loading assignments...</div>
            ) : recentAssignments.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>No assignments yet. Create one!</div>
            ) : (
              recentAssignments.map((a) => (
                <div key={a.id} className={styles.assignmentCard}>
                  <div className={styles.assignmentInfo}>
                    <div className={styles.assignmentDot} style={{
                      background: a.status === 'graded' ? 'var(--success)' :
                                  a.status === 'grading' ? 'var(--warning)' : 'var(--text-tertiary)'
                    }} />
                    <div>
                      <h3 className={styles.assignmentTitle}>{a.title}</h3>
                      <p className={styles.assignmentClass}>Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}</p>
                    </div>
                  </div>

                  <div className={styles.assignmentMeta}>
                    <div className={styles.progressWrap}>
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{
                            width: a.submissionCount > 0 ? `${(a.gradedCount / a.submissionCount) * 100}%` : '0%',
                            background: a.status === 'graded'
                              ? 'var(--success)'
                              : 'var(--accent)',
                          }}
                        />
                      </div>
                      <span className={styles.progressText}>{a.gradedCount}/{a.submissionCount}</span>
                    </div>

                    <span className={`${styles.statusBadge} ${
                      a.status === 'grading' ? styles.statusGrading :
                      a.status === 'graded' ? styles.statusCompleted :
                      styles.statusPending
                    }`}>
                      {a.status === 'grading' && <span className={styles.pulseDot} />}
                      {a.status === 'grading' ? 'Grading' :
                       a.status === 'graded' ? 'Graded' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className={styles.rightCol}>
          {/* Grading Queue */}
          <div className={styles.rightSection}>
            <div className={styles.sectionHeader}>
              <h2>
                <Sparkles size={16} className={styles.sectionIcon} />
                Grading Queue
              </h2>
            </div>

            {gradingAssignments.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>No assignments currently being graded.</div>
            ) : (
              gradingAssignments.map(ga => (
                <div key={ga.id} className={styles.gradingCard} style={{ marginBottom: '12px' }}>
                  <div className={styles.gradingHeader}>
                    <span className={styles.gradingTitle}>{ga.title}</span>
                    <span className={styles.gradingEta}>ETA: ~2 min</span>
                  </div>
                  <div className={styles.gradingProgress}>
                    <div className={styles.gradingBar}>
                      <div className={styles.gradingFill} style={{ width: ga.submissionCount > 0 ? `${(ga.gradedCount / ga.submissionCount) * 100}%` : '0%' }} />
                    </div>
                    <span className={styles.gradingPercent}>{ga.gradedCount}/{ga.submissionCount}</span>
                  </div>
                  <div className={styles.gradingStatus}>
                    <span className={styles.aiPulse} />
                    <span>AI is grading...</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* At-Risk Students */}
          <div className={styles.rightSection}>
            <div className={styles.sectionHeader}>
              <h2>
                <AlertTriangle size={16} className={styles.warnIcon} />
                At-Risk Students
              </h2>
            </div>

            <div className={styles.riskList}>
              <div style={{ padding: '20px', color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center' }}>
                No at-risk students detected yet. This section will populate once you have graded assignments with student data.
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <Link href="/dashboard/assignments/new" className={styles.quickBtn}>
              <Plus size={16} />
              New Assignment
            </Link>
            <Link href="/dashboard/assignments" className={styles.quickBtnGhost}>
              <Upload size={16} />
              Import Submissions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
