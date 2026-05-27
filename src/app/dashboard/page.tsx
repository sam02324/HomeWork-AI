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

/* ═══ Mock Data ═══ */
const STATS = [
  { label: 'Total Students', value: '342', icon: Users, trend: '+12%', trendUp: true, color: 'var(--accent)' },
  { label: 'Pending Gradings', value: '47', icon: Clock, trend: '', trendUp: false, color: 'var(--warning)' },
  { label: 'Avg. Class Score', value: '78.4%', icon: TrendingUp, trend: '+3.2%', trendUp: true, color: 'var(--score-good)' },
  { label: 'Graded This Week', value: '156', icon: CheckCircle, trend: '', trendUp: true, color: 'var(--success)' },
];

const ASSIGNMENTS = [
  { id: '1', title: 'Thermodynamics Chapter Test', class: '12th Physics — Class A', graded: 28, total: 32, status: 'grading', dueDate: 'May 28', avgScore: null },
  { id: '2', title: 'Organic Chemistry Worksheet', class: '12th Chemistry — Class B', graded: 45, total: 45, status: 'completed', dueDate: null, avgScore: 74 },
  { id: '3', title: 'Integration Practice Set', class: '12th Maths — Class A', graded: 0, total: 32, status: 'pending', dueDate: 'May 30', avgScore: null },
  { id: '4', title: 'Kinematics Weekly Quiz', class: '11th Physics — Class C', graded: 38, total: 38, status: 'completed', dueDate: null, avgScore: 82 },
];

const AT_RISK = [
  { name: 'Ananya Gupta', class: '12th Physics', avg: 42, trend: 'declining', risk: 'high', initials: 'AG' },
  { name: 'Rohit Patel', class: '11th Maths', avg: 51, trend: 'declining', risk: 'medium', initials: 'RP' },
  { name: 'Meera Singh', class: '12th Chemistry', avg: 55, trend: 'flat', risk: 'medium', initials: 'MS' },
];

const STATUS_CONFIG: Record<string, { label: string; class: string }> = {
  grading: { label: 'Grading', class: styles.statusGrading || '' },
  completed: { label: 'Completed', class: styles.statusCompleted || '' },
  pending: { label: 'Pending', class: styles.statusPending || '' },
};

export default function DashboardPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.greeting}>Good evening, Rajesh 👋</h1>
          <p className={styles.subGreeting}>You have <strong>47 submissions</strong> waiting to be graded</p>
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
            {ASSIGNMENTS.map((a) => (
              <div key={a.id} className={styles.assignmentCard}>
                <div className={styles.assignmentInfo}>
                  <div className={styles.assignmentDot} style={{
                    background: a.status === 'completed' ? 'var(--success)' :
                                a.status === 'grading' ? 'var(--warning)' : 'var(--text-tertiary)'
                  }} />
                  <div>
                    <h3 className={styles.assignmentTitle}>{a.title}</h3>
                    <p className={styles.assignmentClass}>{a.class}</p>
                  </div>
                </div>

                <div className={styles.assignmentMeta}>
                  <div className={styles.progressWrap}>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{
                          width: `${(a.graded / a.total) * 100}%`,
                          background: a.status === 'completed'
                            ? 'var(--success)'
                            : 'var(--accent)',
                        }}
                      />
                    </div>
                    <span className={styles.progressText}>{a.graded}/{a.total}</span>
                  </div>

                  <span className={`${styles.statusBadge} ${
                    a.status === 'grading' ? styles.statusGrading :
                    a.status === 'completed' ? styles.statusCompleted :
                    styles.statusPending
                  }`}>
                    {a.status === 'grading' && <span className={styles.pulseDot} />}
                    {a.status === 'grading' ? 'Grading' :
                     a.status === 'completed' ? 'Completed' : 'Pending'}
                  </span>

                  {a.avgScore && (
                    <span className={styles.avgScore}>Avg: {a.avgScore}%</span>
                  )}
                  {a.dueDate && (
                    <span className={styles.dueDate}>Due: {a.dueDate}</span>
                  )}
                </div>
              </div>
            ))}
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

            <div className={styles.gradingCard}>
              <div className={styles.gradingHeader}>
                <span className={styles.gradingTitle}>Thermodynamics Chapter Test</span>
                <span className={styles.gradingEta}>ETA: 2 min</span>
              </div>
              <div className={styles.gradingProgress}>
                <div className={styles.gradingBar}>
                  <div className={styles.gradingFill} style={{ width: '87.5%' }} />
                </div>
                <span className={styles.gradingPercent}>28/32 (87.5%)</span>
              </div>
              <div className={styles.gradingStatus}>
                <span className={styles.aiPulse} />
                <span>AI is grading...</span>
              </div>
            </div>
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
              {AT_RISK.map((student, i) => (
                <Link
                  key={i}
                  href={`/dashboard/students/${i + 1}`}
                  className={styles.riskCard}
                >
                  <div className={styles.riskAvatar}>{student.initials}</div>
                  <div className={styles.riskInfo}>
                    <div className={styles.riskName}>{student.name}</div>
                    <div className={styles.riskClass}>{student.class} · Avg: {student.avg}%</div>
                  </div>
                  <div className={styles.riskRight}>
                    <span className={styles.riskTrend}>
                      {student.trend === 'declining' ? '↓' : '→'} {student.trend}
                    </span>
                    <span className={`${styles.riskBadge} ${
                      student.risk === 'high' ? styles.riskHigh : styles.riskMedium
                    }`}>
                      {student.risk}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <Link href="/dashboard/assignments/new" className={styles.quickBtn}>
              <Plus size={16} />
              New Assignment
            </Link>
            <button className={styles.quickBtnGhost}>
              <Upload size={16} />
              Import Submissions
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
