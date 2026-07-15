'use client';

import { XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area, AreaChart } from 'recharts';
import { ArrowLeft, TrendingUp, Award, Target, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { Reveal, CountUp } from '@/components/motion/Reveal';
import { useStudentAnalytics } from '@/lib/api-client';

export default function StudentAnalyticsPage() {
  const params = useParams();
  const studentId = params.id as string;
  const { data: analytics, isLoading } = useStudentAnalytics(studentId);

  if (isLoading) return <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>Loading student data...</div>;
  if (!analytics) return <div style={{ padding: 40, color: 'var(--text-tertiary)' }}>Student not found.</div>;

  const { student, avgScore, totalSubmissions, scoreTrend, grades } = analytics;
  const initials = student.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  // Calculate Radar Data and Weak Topics
  const criteriaMap: Record<string, { totalScore: number, totalMax: number }> = {};
  if (grades && Array.isArray(grades)) {
    grades.forEach((g) => {
      if (Array.isArray(g.criteriaScores)) {
        g.criteriaScores.forEach((c) => {
          if (!criteriaMap[c.criterionName]) {
            criteriaMap[c.criterionName] = { totalScore: 0, totalMax: 0 };
          }
          criteriaMap[c.criterionName].totalScore += (Number(c.score) || 0);
          criteriaMap[c.criterionName].totalMax += (Number(c.maxScore) || 0);
        });
      }
    });
  }

  const RADAR_DATA = Object.entries(criteriaMap).map(([topic, stats]) => ({
    topic: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
    score: Math.round((stats.totalScore / stats.totalMax) * 100) || 0
  }));

  const HISTORY = (grades || []).map((g, i) => ({
    id: g.id || `grade-${i}`,
    title: g.assignmentTitle || 'Assignment',
    date: g.gradedAt ? new Date(g.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unknown',
    score: g.totalScore,
    max: g.maxScore,
    grade: g.gradeLetter || '-',
    status: 'Graded'
  }));

  return (
    <Reveal className={styles.page}>
      {/* Header */}
      <div className={styles.backRow}>
        <Link href="/dashboard" className={styles.backLink}><ArrowLeft size={16} /> Back to Dashboard</Link>
      </div>

      {/* Hero */}
      <div className={styles.hero} data-reveal>
        <div className={styles.avatarLg}>{initials}</div>
        <div className={styles.heroInfo}>
          <h1 className="page-title">
            <em className="serif-accent">{student.name}</em>
          </h1>
          <p className={styles.heroClass}>{student.classroom?.subject} — {student.classroom?.name} · Roll No: {student.rollNumber}</p>
          <span className={styles.riskBadge} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>Low Risk</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow} data-reveal>
        {[
          { icon: TrendingUp, label: 'Average Score', value: <CountUp value={avgScore} suffix="%" /> },
          { icon: Target, label: 'Completed', value: <CountUp value={totalSubmissions} /> },
          { icon: Award, label: 'Class Rank', value: '-' },
          { icon: BarChart3, label: 'Consistency', value: '-' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={styles.statCard}>
              <Icon size={18} className={styles.statIcon} />
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className={styles.chartsGrid} data-reveal>
        {/* Score Trend */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Performance Trend</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={scoreTrend}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(350, 80%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(350, 80%, 45%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="assignmentTitle" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }} />
                <Area type="monotone" dataKey="score" stroke="hsl(350, 80%, 45%)" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: 'hsl(350, 80%, 45%)', r: 4, strokeWidth: 0 }} animationDuration={900} animationEasing="ease-out" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Topic Strengths</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={250}>
              {RADAR_DATA.length > 0 ? (
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={RADAR_DATA}>
                  <PolarGrid stroke="var(--glass-border)" />
                  <PolarAngleAxis dataKey="topic" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Student" dataKey="score" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.3} animationDuration={900} animationEasing="ease-out" animationBegin={200} />
                </RadarChart>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
                  Not enough rubric data
                </div>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* History */}
      <div className={styles.historySection}>
        <h2 className={styles.sectionTitle}>Submission History</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Date</th>
                <th>Score</th>
                <th>Grade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="stagger-children">
              {HISTORY.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)'}}>No submissions yet.</td></tr>
              ) : HISTORY.map((h) => (
                <tr key={h.id} className={styles.row}>
                  <td className={styles.titleCell}>{h.title}</td>
                  <td className={styles.dateCell}>{h.date}</td>
                  <td>
                    <span className={styles.mono}>{h.score}/{h.max}</span>
                  </td>
                  <td>
                    <span className={styles.badge} style={{ 
                      background: h.grade.startsWith('A') ? 'var(--success-bg)' : 
                                  h.grade.startsWith('B') ? 'rgba(59,130,246,0.1)' : 
                                  h.grade.startsWith('C') ? 'var(--warning-bg)' : 'var(--danger-bg)',
                      color: h.grade.startsWith('A') ? 'var(--success)' : 
                             h.grade.startsWith('B') ? 'var(--accent)' : 
                             h.grade.startsWith('C') ? 'var(--warning)' : 'var(--danger)'
                    }}>
                      {h.grade}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles.statusGraded}`}>{h.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Reveal>
  );
}
