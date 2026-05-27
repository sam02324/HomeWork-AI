'use client';

import Link from 'next/link';
import { Plus, Users, BookOpen, TrendingUp, ChevronRight } from 'lucide-react';
import styles from './page.module.css';

const CLASSROOMS = [
  { id: '1', name: 'Class A', subject: 'Physics', grade: '12th', students: 32, avg: 74, assignments: 8, color: '#4A90D9' },
  { id: '2', name: 'Class B', subject: 'Physics', grade: '12th', students: 28, avg: 68, assignments: 8, color: '#7C5CFC' },
  { id: '3', name: 'Class B', subject: 'Chemistry', grade: '12th', students: 45, avg: 71, assignments: 6, color: '#22C55E' },
  { id: '4', name: 'Class C', subject: 'Physics', grade: '11th', students: 38, avg: 76, assignments: 5, color: '#F59E0B' },
  { id: '5', name: 'Class D', subject: 'Physics', grade: '11th', students: 35, avg: 69, assignments: 5, color: '#EF4444' },
  { id: '6', name: 'Class A', subject: 'Maths', grade: '12th', students: 32, avg: 78, assignments: 7, color: '#06B6D4' },
];

export default function ClassroomsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Classrooms</h1>
          <p className={styles.subtitle}>Manage your classes, students, and assignments</p>
        </div>
        <button className={styles.createBtn}><Plus size={16} /> Create Classroom</button>
      </div>

      <div className={styles.grid}>
        {CLASSROOMS.map((c) => (
          <Link key={c.id} href={`/dashboard/classrooms/${c.id}`} className={styles.card}>
            <div className={styles.cardBorder} style={{ background: c.color }} />
            <div className={styles.cardBody}>
              <div className={styles.cardHeader}>
                <div className={styles.subjectIcon} style={{ background: `${c.color}20`, color: c.color }}>
                  <BookOpen size={18} />
                </div>
                <ChevronRight size={16} className={styles.cardArrow} />
              </div>
              <h3 className={styles.cardTitle}>{c.grade} {c.subject}</h3>
              <p className={styles.cardClass}>{c.name}</p>
              <div className={styles.cardStats}>
                <div className={styles.cardStat}>
                  <Users size={13} />
                  <span>{c.students}</span>
                </div>
                <div className={styles.cardStat}>
                  <TrendingUp size={13} />
                  <span>Avg: {c.avg}%</span>
                </div>
                <div className={styles.cardStat}>
                  <BookOpen size={13} />
                  <span>{c.assignments} assignments</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
