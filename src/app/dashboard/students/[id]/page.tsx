'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area, AreaChart } from 'recharts';
import { ArrowLeft, TrendingUp, Award, Target, BarChart3, BookOpen, Sparkles } from 'lucide-react';
import Link from 'next/link';
import styles from './page.module.css';

/* Mock data */
const STUDENT = { name: 'Priya Sharma', class: '12th Physics — Class A', roll: 17, avg: 72.4, completed: 18, total: 22, rank: 8, totalStudents: 32, consistency: 7.2, risk: 'Low' };

const SCORE_TREND = [
  { name: 'Test 1', score: 68 }, { name: 'Test 2', score: 72 }, { name: 'Test 3', score: 65 },
  { name: 'Test 4', score: 78 }, { name: 'Test 5', score: 71 }, { name: 'Test 6', score: 82 },
  { name: 'Test 7', score: 69 }, { name: 'Test 8', score: 75 }, { name: 'Test 9', score: 80 },
  { name: 'Test 10', score: 76 },
];

const RADAR_DATA = [
  { topic: 'Mechanics', score: 85 }, { topic: 'Thermo', score: 62 },
  { topic: 'Optics', score: 78 }, { topic: 'Electrostatics', score: 45 },
  { topic: 'Waves', score: 71 }, { topic: 'Modern', score: 58 },
];

const HEATMAP_DATA = Array.from({ length: 12 }, () =>
  Array.from({ length: 6 }, () => {
    const r = Math.random();
    return r < 0.15 ? null : r < 0.3 ? Math.floor(Math.random() * 50) : Math.floor(50 + Math.random() * 50);
  })
);

const WEAK_TOPICS = [
  { topic: 'Electrostatics', avg: 45, desc: "Struggles with Coulomb's law applications and electric field calculations" },
  { topic: 'Modern Physics', avg: 58, desc: 'Photoelectric effect concepts need reinforcement' },
  { topic: 'Thermodynamics', avg: 62, desc: 'Second law applications and Carnot cycle problems' },
];

const ROADMAP = [
  { week: 'Week 1-2', title: 'Focus on Electrostatics', desc: "Review Coulomb's Law, practice 10 problems daily from HC Verma", status: 'in_progress' },
  { week: 'Week 3-4', title: 'Modern Physics Fundamentals', desc: 'Re-read Chapter 12, solve NCERT Exemplar problems', status: 'not_started' },
  { week: 'Week 5-6', title: 'Thermodynamics Problem Practice', desc: 'Attempt previous year JEE questions on thermodynamics', status: 'not_started' },
];

const HISTORY = [
  { title: 'Thermodynamics Test', date: 'May 24', score: 76, max: 100, grade: 'B+', status: 'Graded' },
  { title: 'Optics Quiz', date: 'May 18', score: 82, max: 100, grade: 'A-', status: 'Graded' },
  { title: 'Kinematics Set', date: 'May 12', score: 69, max: 80, grade: 'B', status: 'Graded' },
  { title: 'Mechanics Test', date: 'May 5', score: 85, max: 100, grade: 'A', status: 'Graded' },
  { title: 'Electrostatics Quiz', date: 'Apr 28', score: 42, max: 100, grade: 'D', status: 'Reviewed' },
  { title: 'Wave Optics', date: 'Apr 20', score: 78, max: 100, grade: 'B+', status: 'Graded' },
  { title: 'Modern Physics', date: 'Apr 14', score: 58, max: 100, grade: 'C+', status: 'Graded' },
  { title: 'Thermodynamics HW', date: 'Apr 8', score: 65, max: 80, grade: 'B-', status: 'Graded' },
];

function scoreColor(score: number | null) {
  if (score === null) return 'var(--bg-tertiary)';
  if (score >= 90) return 'var(--score-excellent)';
  if (score >= 70) return 'var(--score-good)';
  if (score >= 50) return 'var(--score-average)';
  return 'var(--score-poor)';
}

export default function StudentAnalyticsPage() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.backRow}>
        <Link href="/dashboard" className={styles.backLink}><ArrowLeft size={16} /> Back to Dashboard</Link>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.avatarLg}>PS</div>
        <div className={styles.heroInfo}>
          <h1 className={styles.heroName}>{STUDENT.name}</h1>
          <p className={styles.heroClass}>{STUDENT.class} · Roll No: {STUDENT.roll}</p>
          <span className={styles.riskBadge} style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>{STUDENT.risk} Risk</span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        {[
          { icon: TrendingUp, label: 'Average Score', value: `${STUDENT.avg}%` },
          { icon: Target, label: 'Completed', value: `${STUDENT.completed}/${STUDENT.total}` },
          { icon: Award, label: 'Class Rank', value: `#${STUDENT.rank}/${STUDENT.totalStudents}` },
          { icon: BarChart3, label: 'Consistency', value: `${STUDENT.consistency}/10` },
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
      <div className={styles.chartsGrid}>
        {/* Score Trend */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Performance Trend</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={SCORE_TREND}>
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }} />
                <Area type="monotone" dataKey="score" stroke="hsl(217, 91%, 60%)" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: 'hsl(217, 91%, 60%)', r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Topic Strengths</h3>
          <div className={styles.chartWrap}>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={RADAR_DATA}>
                <PolarGrid stroke="var(--glass-border)" />
                <PolarAngleAxis dataKey="topic" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="score" stroke="hsl(217, 91%, 60%)" fill="hsl(217, 91%, 60%)" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: 'hsl(217, 91%, 60%)' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}>Activity Heatmap</h3>
        <div className={styles.heatmap}>
          <div className={styles.heatmapDays}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <span key={d} className={styles.heatmapDay}>{d}</span>
            ))}
          </div>
          <div className={styles.heatmapGrid}>
            {HEATMAP_DATA.map((week, wi) => (
              <div key={wi} className={styles.heatmapCol}>
                {week.map((score, di) => (
                  <div
                    key={di}
                    className={styles.heatmapCell}
                    style={{ background: scoreColor(score) }}
                    title={score !== null ? `${score}%` : 'No data'}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className={styles.heatmapLegend}>
            <span>Less</span>
            <div className={styles.heatmapCell} style={{ background: 'var(--bg-tertiary)' }} />
            <div className={styles.heatmapCell} style={{ background: 'var(--score-poor)' }} />
            <div className={styles.heatmapCell} style={{ background: 'var(--score-average)' }} />
            <div className={styles.heatmapCell} style={{ background: 'var(--score-good)' }} />
            <div className={styles.heatmapCell} style={{ background: 'var(--score-excellent)' }} />
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className={styles.bottomGrid}>
        {/* Weak Topics */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            <Target size={16} style={{ color: 'var(--warning)' }} /> Weak Topics
          </h3>
          <div className={styles.weakList}>
            {WEAK_TOPICS.map((t, i) => (
              <div key={i} className={styles.weakItem}>
                <div className={styles.weakHeader}>
                  <span className={styles.weakName}>{t.topic}</span>
                  <span className={styles.weakScore} style={{ color: scoreColor(t.avg) }}>Avg: {t.avg}%</span>
                </div>
                <p className={styles.weakDesc}>{t.desc}</p>
                <button className={styles.quizBtn}><Sparkles size={12} /> Create Practice Quiz</button>
              </div>
            ))}
          </div>
        </div>

        {/* Roadmap */}
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            <Sparkles size={16} style={{ color: 'var(--accent)' }} /> AI Improvement Roadmap
          </h3>
          <div className={styles.roadmap}>
            {ROADMAP.map((r, i) => (
              <div key={i} className={styles.roadmapItem}>
                <div className={styles.roadmapTimeline}>
                  <div className={`${styles.roadmapDot} ${r.status === 'in_progress' ? styles.roadmapActive : ''}`}>{i + 1}</div>
                  {i < ROADMAP.length - 1 && <div className={styles.roadmapLine} />}
                </div>
                <div className={styles.roadmapContent}>
                  <span className={styles.roadmapWeek}>{r.week}</span>
                  <h4>{r.title}</h4>
                  <p>{r.desc}</p>
                  <span className={`${styles.roadmapStatus} ${r.status === 'in_progress' ? styles.roadmapInProgress : ''}`}>
                    {r.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className={styles.chartCard}>
        <h3 className={styles.chartTitle}><BookOpen size={16} /> Assignment History</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Assignment</th><th>Date</th><th>Score</th><th>Grade</th><th>Status</th></tr></thead>
            <tbody>
              {HISTORY.map((h, i) => (
                <tr key={i} className={styles.row}>
                  <td className={styles.titleCell}>{h.title}</td>
                  <td>{h.date}</td>
                  <td><span className={styles.mono} style={{ color: scoreColor(Math.round((h.score/h.max)*100)) }}>{h.score}/{h.max}</span></td>
                  <td><span className={styles.gradeBadge}>{h.grade}</span></td>
                  <td><span className={styles.statusBadge}>{h.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
