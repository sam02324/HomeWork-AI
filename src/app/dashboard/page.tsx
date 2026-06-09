'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
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
  X,
} from 'lucide-react';
import styles from './page.module.css';
import { useDashboardStats, useAssignments, useGoogleAuthStatus } from '@/lib/api-client';
import { useUser } from '@clerk/nextjs';



function DashboardContent() {
  const { user } = useUser();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: assignments, isLoading: assignmentsLoading } = useAssignments();

  const firstName = user?.firstName || 'Teacher';
  const { data: googleAuth } = useGoogleAuthStatus();
  const searchParams = useSearchParams();

  const [googleBannerDismissed, setGoogleBannerDismissed] = useState(false);
  const [oauthMessage, setOauthMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle OAuth callback params
  useEffect(() => {
    const authResult = searchParams.get('google_auth');
    if (authResult === 'success') {
      setOauthMessage({ type: 'success', text: 'Google account connected successfully!' });
      // Clean URL
      window.history.replaceState({}, '', '/dashboard');
    } else if (authResult === 'error') {
      const reason = searchParams.get('reason') || 'unknown';
      setOauthMessage({ type: 'error', text: `Failed to connect Google: ${reason}` });
      window.history.replaceState({}, '', '/dashboard');
    }
  }, [searchParams]);

  const showGoogleBanner = googleAuth && !googleAuth.connected && !googleBannerDismissed;

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
          <h1 className={styles.greeting}>Welcome back, {firstName}</h1>
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

      {/* OAuth callback message */}
      {oauthMessage && (
        <div className={`${styles.oauthBanner} ${oauthMessage.type === 'success' ? styles.oauthSuccess : styles.oauthError}`}>
          <span>{oauthMessage.text}</span>
          <button onClick={() => setOauthMessage(null)} className={styles.oauthDismiss}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Google Connect Banner */}
      {showGoogleBanner && (
        <div className={styles.googleBanner}>
          <div className={styles.googleBannerLeft}>
            <div className={styles.googleBannerIcon}>
              <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            </div>
            <div className={styles.googleBannerText}>
              <strong>Connect your Google Account</strong>
              <span>Allow GradeAI to access your Google Forms responses and Drive files for seamless submission syncing.</span>
            </div>
          </div>
          <div className={styles.googleBannerActions}>
            <a href="/api/auth/google" className={styles.googleConnectBtn}>
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#fff" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#fff" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#fff" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#fff" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Allow Access
            </a>
            <button className={styles.googleLaterBtn} onClick={() => setGoogleBannerDismissed(true)}>
              Maybe Later
            </button>
          </div>
        </div>
      )}

      {/* Connected indicator (subtle) */}
      {googleAuth?.connected && (
        <div className={styles.googleConnected}>
          <CheckCircle size={14} />
          <span>Google connected: {googleAuth.googleEmail}</span>
        </div>
      )}

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
              <div style={{ padding: '20px', color: 'var(--text-tertiary)' }}>No assignments found. Get started by creating your first assignment.</div>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 'var(--space-6) var(--space-8)', color: 'var(--text-tertiary)' }}>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
