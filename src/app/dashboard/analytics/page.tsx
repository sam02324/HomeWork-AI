'use client';

import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Users, FileText, TrendingUp, Clock, AlertTriangle } from 'lucide-react';
import styles from './page.module.css';

const STATS = [
  { label: 'Total Students', value: '210', icon: Users, color: 'var(--accent)' },
  { label: 'Total Assignments', value: '39', icon: FileText, color: 'hsl(280,65%,60%)' },
  { label: 'Overall Average', value: '73.2%', icon: TrendingUp, color: 'var(--score-good)' },
  { label: 'Time Saved', value: '48 hrs', icon: Clock, color: 'var(--success)' },
];

const DISTRIBUTION = [
  { range: '0-20', count: 5 }, { range: '20-40', count: 18 },
  { range: '40-60', count: 42 }, { range: '60-80', count: 87 },
  { range: '80-100', count: 58 },
];

const CLASS_TRENDS = [
  { name: 'Test 1', '12th Phy-A': 72, '12th Chem-B': 68, '11th Phy-C': 75 },
  { name: 'Test 2', '12th Phy-A': 74, '12th Chem-B': 71, '11th Phy-C': 73 },
  { name: 'Test 3', '12th Phy-A': 69, '12th Chem-B': 65, '11th Phy-C': 78 },
  { name: 'Test 4', '12th Phy-A': 78, '12th Chem-B': 72, '11th Phy-C': 76 },
  { name: 'Test 5', '12th Phy-A': 75, '12th Chem-B': 74, '11th Phy-C': 74 },
  { name: 'Test 6', '12th Phy-A': 80, '12th Chem-B': 70, '11th Phy-C': 79 },
  { name: 'Test 7', '12th Phy-A': 77, '12th Chem-B': 73, '11th Phy-C': 77 },
  { name: 'Test 8', '12th Phy-A': 82, '12th Chem-B': 75, '11th Phy-C': 80 },
];

const WEAK_TOPICS = [
  { topic: 'Electrostatics', percent: 38 },
  { topic: 'Thermodynamics', percent: 45 },
  { topic: 'Organic Chemistry', percent: 48 },
  { topic: 'Integration', percent: 52 },
  { topic: 'Modern Physics', percent: 55 },
];

const RISK_SUMMARY = [
  { level: 'Critical', count: 3, color: 'var(--error)' },
  { level: 'High', count: 8, color: 'hsl(25,95%,53%)' },
  { level: 'Medium', count: 15, color: 'var(--warning)' },
  { level: 'Low', count: 184, color: 'var(--success)' },
];

export default function AnalyticsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Analytics Overview</h1>
        <p className={styles.subtitle}>Performance insights across all your classes</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className={styles.statCard}>
              <div className={styles.statIcon} style={{ background: `${s.color}15`, color: s.color }}><Icon size={18} /></div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Score Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={DISTRIBUTION}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="range" tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }} />
              <Bar dataKey="count" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Class Average Trends</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={CLASS_TRENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <YAxis domain={[50, 100]} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-tertiary)', border: '1px solid var(--glass-border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
              <Line type="monotone" dataKey="12th Phy-A" stroke="hsl(217,91%,60%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="12th Chem-B" stroke="hsl(152,69%,46%)" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="11th Phy-C" stroke="hsl(280,65%,60%)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top 5 Weak Topics (Across All Classes)</h3>
          <div className={styles.weakList}>
            {WEAK_TOPICS.map((t, i) => (
              <div key={i} className={styles.weakItem}>
                <div className={styles.weakLabel}>
                  <span className={styles.weakRank}>#{i + 1}</span>
                  <span>{t.topic}</span>
                </div>
                <div className={styles.weakBarWrap}>
                  <div className={styles.weakBar}>
                    <div className={styles.weakFill} style={{ width: `${t.percent}%`, background: t.percent < 50 ? 'var(--error)' : 'var(--warning)' }} />
                  </div>
                  <span className={styles.weakPercent}>{t.percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>
            <AlertTriangle size={16} style={{ color: 'var(--warning)' }} /> At-Risk Students Summary
          </h3>
          <div className={styles.riskSummary}>
            {RISK_SUMMARY.map((r, i) => (
              <div key={i} className={styles.riskRow}>
                <div className={styles.riskDot} style={{ background: r.color }} />
                <span className={styles.riskLevel}>{r.level}</span>
                <div className={styles.riskBarWrap}>
                  <div className={styles.riskBar}>
                    <div className={styles.riskFill} style={{ width: `${(r.count / 210) * 100}%`, background: r.color }} />
                  </div>
                </div>
                <span className={styles.riskCount}>{r.count}</span>
              </div>
            ))}
          </div>
          <div className={styles.riskTotal}>
            <span>Total Students</span>
            <strong>210</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
