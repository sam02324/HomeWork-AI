'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  FileText,
  Plus,
  Search,
  BarChart3,
  AlertTriangle,
} from 'lucide-react';
import styles from './page.module.css';

const CLASSROOM = {
  id: '1',
  name: 'Class A',
  subject: 'Physics',
  grade: '12th',
  students: 32,
  avg: 74,
  assignments: 8,
  color: '#4A90D9',
};

const STUDENTS = [
  { id: '1', name: 'Aarav Patel', roll: 1, avg: 92, submissions: 8, status: 'excellent', initials: 'AP' },
  { id: '2', name: 'Ananya Gupta', roll: 2, avg: 42, submissions: 7, status: 'at-risk', initials: 'AG' },
  { id: '3', name: 'Arjun Mehta', roll: 3, avg: 78, submissions: 8, status: 'good', initials: 'AM' },
  { id: '4', name: 'Diya Sharma', roll: 4, avg: 85, submissions: 8, status: 'excellent', initials: 'DS' },
  { id: '5', name: 'Ishaan Reddy', roll: 5, avg: 67, submissions: 6, status: 'average', initials: 'IR' },
  { id: '6', name: 'Kavya Singh', roll: 6, avg: 73, submissions: 8, status: 'good', initials: 'KS' },
  { id: '7', name: 'Nisha Jain', roll: 7, avg: 88, submissions: 8, status: 'excellent', initials: 'NJ' },
  { id: '8', name: 'Priya Sharma', roll: 8, avg: 72, submissions: 7, status: 'good', initials: 'PS' },
  { id: '9', name: 'Rahul Verma', roll: 9, avg: 55, submissions: 5, status: 'average', initials: 'RV' },
  { id: '10', name: 'Rohit Patel', roll: 10, avg: 51, submissions: 6, status: 'at-risk', initials: 'RP' },
  { id: '11', name: 'Shreya Kapoor', roll: 11, avg: 81, submissions: 8, status: 'good', initials: 'SK' },
  { id: '12', name: 'Vikram Nair', roll: 12, avg: 69, submissions: 7, status: 'average', initials: 'VN' },
];

function statusColor(status: string) {
  switch (status) {
    case 'excellent': return { bg: 'var(--score-excellent-bg)', color: 'var(--score-excellent)' };
    case 'good': return { bg: 'var(--score-good-bg)', color: 'var(--score-good)' };
    case 'average': return { bg: 'var(--score-average-bg)', color: 'var(--score-average)' };
    case 'at-risk': return { bg: 'var(--score-poor-bg)', color: 'var(--score-poor)' };
    default: return { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' };
  }
}

export default function ClassroomDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className={styles.page}>
      <Link href="/dashboard/classrooms" className={styles.backLink}>
        <ArrowLeft size={16} /> Back to Classrooms
      </Link>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroColor} style={{ background: CLASSROOM.color }} />
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>{CLASSROOM.grade} {CLASSROOM.subject} — {CLASSROOM.name}</h1>
          <div className={styles.heroStats}>
            <span><Users size={14} /> {CLASSROOM.students} students</span>
            <span><TrendingUp size={14} /> Avg: {CLASSROOM.avg}%</span>
            <span><FileText size={14} /> {CLASSROOM.assignments} assignments</span>
          </div>
        </div>
        <Link href="/dashboard/assignments/new" className={styles.addBtn}>
          <Plus size={16} /> New Assignment
        </Link>
      </div>

      {/* Stats Row */}
      <div className={styles.statsRow}>
        {[
          { label: 'Excellent (≥85)', count: STUDENTS.filter(s => s.status === 'excellent').length, color: 'var(--score-excellent)' },
          { label: 'Good (70-84)', count: STUDENTS.filter(s => s.status === 'good').length, color: 'var(--score-good)' },
          { label: 'Average (50-69)', count: STUDENTS.filter(s => s.status === 'average').length, color: 'var(--score-average)' },
          { label: 'At-Risk (<50)', count: STUDENTS.filter(s => s.status === 'at-risk').length, color: 'var(--score-poor)' },
        ].map((s, i) => (
          <div key={i} className={styles.statMini}>
            <div className={styles.statDot} style={{ background: s.color }} />
            <span className={styles.statCount}>{s.count}</span>
            <span className={styles.statMiniLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input className={styles.searchInput} placeholder="Search students..." />
        </div>
      </div>

      {/* Student Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Roll</th>
              <th>Student</th>
              <th>Average</th>
              <th>Submissions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s) => {
              const sc = statusColor(s.status);
              return (
                <tr key={s.id} className={styles.row}>
                  <td className={styles.rollCell}>{s.roll}</td>
                  <td>
                    <div className={styles.studentCell}>
                      <div className={styles.studentAvatar} style={{ background: `${CLASSROOM.color}22`, color: CLASSROOM.color }}>{s.initials}</div>
                      <span className={styles.studentName}>{s.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={styles.avgScore} style={{ color: sc.color }}>{s.avg}%</span>
                  </td>
                  <td><span className={styles.mono}>{s.submissions}/{CLASSROOM.assignments}</span></td>
                  <td>
                    <span className={styles.statusBadge} style={{ background: sc.bg, color: sc.color }}>
                      {s.status === 'at-risk' && <AlertTriangle size={10} />}
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/dashboard/students/${s.id}`} className={styles.viewBtn}>
                      <BarChart3 size={13} /> View Analytics
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
