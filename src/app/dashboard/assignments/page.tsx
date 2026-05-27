'use client';

import Link from 'next/link';
import { Plus, Search, Filter } from 'lucide-react';
import styles from './page.module.css';

const ASSIGNMENTS = [
  { id: '1', title: 'Thermodynamics Chapter Test', class: '12th Physics — A', submissions: '28/32', status: 'grading', avg: '—', due: 'May 28, 2026' },
  { id: '2', title: 'Organic Chemistry Worksheet', class: '12th Chemistry — B', submissions: '45/45', status: 'graded', avg: '74%', due: 'May 22, 2026' },
  { id: '3', title: 'Integration Practice Set', class: '12th Maths — A', submissions: '0/32', status: 'published', avg: '—', due: 'May 30, 2026' },
  { id: '4', title: 'Kinematics Weekly Quiz', class: '11th Physics — C', submissions: '38/38', status: 'graded', avg: '82%', due: 'May 20, 2026' },
  { id: '5', title: 'Electromagnetic Induction Test', class: '12th Physics — B', submissions: '25/28', status: 'published', avg: '—', due: 'Jun 2, 2026' },
  { id: '6', title: 'Probability & Statistics', class: '12th Maths — A', submissions: '32/32', status: 'graded', avg: '71%', due: 'May 18, 2026' },
  { id: '7', title: 'Chemical Bonding Quiz', class: '11th Chemistry — C', submissions: '12/38', status: 'published', avg: '—', due: 'Jun 1, 2026' },
  { id: '8', title: 'Wave Optics Assignment', class: '12th Physics — A', submissions: '0/32', status: 'draft', avg: '—', due: '—' },
];

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'statusDraft' },
  published: { label: 'Published', cls: 'statusPublished' },
  grading: { label: 'Grading', cls: 'statusGrading' },
  graded: { label: 'Graded', cls: 'statusGraded' },
};

export default function AssignmentsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>All Assignments</h1>
          <p className={styles.subtitle}>Manage and grade all your assignments</p>
        </div>
        <Link href="/dashboard/assignments/new" className={styles.createBtn}>
          <Plus size={16} /> Create Assignment
        </Link>
      </div>

      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <Search size={16} />
          <input className={styles.searchInput} placeholder="Search assignments..." />
        </div>
        <select className={styles.filterSelect}>
          <option>All Classes</option>
          <option>12th Physics — A</option>
          <option>12th Physics — B</option>
          <option>12th Chemistry — B</option>
          <option>11th Physics — C</option>
          <option>12th Maths — A</option>
        </select>
        <select className={styles.filterSelect}>
          <option>All Status</option>
          <option>Draft</option>
          <option>Published</option>
          <option>Grading</option>
          <option>Graded</option>
        </select>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Class</th>
              <th>Submissions</th>
              <th>Status</th>
              <th>Avg Score</th>
              <th>Due Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ASSIGNMENTS.map((a) => {
              const st = STATUS_MAP[a.status];
              return (
                <tr key={a.id} className={styles.row}>
                  <td className={styles.titleCell}>{a.title}</td>
                  <td className={styles.classCell}>{a.class}</td>
                  <td><span className={styles.mono}>{a.submissions}</span></td>
                  <td>
                    <span className={`${styles.badge} ${styles[st.cls]}`}>
                      {a.status === 'grading' && <span className={styles.pulseDot} />}
                      {st.label}
                    </span>
                  </td>
                  <td><span className={styles.mono}>{a.avg}</span></td>
                  <td className={styles.dateCell}>{a.due}</td>
                  <td>
                    <div className={styles.actions}>
                      {(a.status === 'published' || a.status === 'grading') && (
                        <button className={styles.gradeBtn}>Grade</button>
                      )}
                      <button className={styles.viewBtn}>View</button>
                    </div>
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
