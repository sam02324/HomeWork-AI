'use client';

import Link from 'next/link';
import { ClipboardList, FileText, SlidersHorizontal } from 'lucide-react';
import styles from './page.module.css';
import { Reveal } from '@/components/motion/Reveal';

export default function KnowledgeBasePage() {
  return (
    <Reveal className={styles.page}>
      <div className={styles.header} data-reveal>
        <span className="page-eyebrow">Knowledge Base</span>
        <h1 className="page-title">
          Teach the AI <em className="serif-accent">your way</em>
        </h1>
        <p className={styles.subtitle}>Use assignment-level context while the reusable library is not available</p>
      </div>

      {/* Coming Soon Banner */}
      <div className={styles.comingSoon}>
        {/* Bespoke illustration: open book with orbiting knowledge nodes */}
        <div className={styles.illustration} data-reveal aria-hidden="true">
          <svg viewBox="0 0 180 150" width="180" height="150" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="kbGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="hsl(350, 80%, 55%)" stopOpacity="0.28" />
                <stop offset="100%" stopColor="hsl(350, 80%, 55%)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="kbBook" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="hsl(350, 80%, 58%)" />
                <stop offset="100%" stopColor="hsl(25, 95%, 55%)" />
              </linearGradient>
            </defs>

            <circle cx="90" cy="75" r="70" fill="url(#kbGlow)" />

            {/* orbit rings */}
            <ellipse cx="90" cy="75" rx="78" ry="30" fill="none" stroke="hsla(0,0%,100%,0.14)" strokeWidth="1" strokeDasharray="3 5" transform="rotate(-14 90 75)" />
            <ellipse cx="90" cy="75" rx="62" ry="42" fill="none" stroke="hsla(0,0%,100%,0.09)" strokeWidth="1" transform="rotate(18 90 75)" />

            {/* orbiting nodes (groups spin, transform-only) */}
            <g className={styles.orbitA}>
              <circle cx="164" cy="62" r="4" fill="hsl(350, 80%, 60%)" />
              <circle cx="22" cy="92" r="2.5" fill="hsl(25, 95%, 60%)" />
            </g>
            <g className={styles.orbitB}>
              <circle cx="90" cy="20" r="3" fill="hsl(255, 70%, 65%)" />
              <circle cx="132" cy="118" r="2" fill="hsla(0, 0%, 100%, 0.7)" />
            </g>

            {/* open book */}
            <g>
              <path
                d="M90 52 C78 44 62 42 50 45 L50 96 C62 93 78 95 90 103 C102 95 118 93 130 96 L130 45 C118 42 102 44 90 52 Z"
                fill="hsl(225, 22%, 12%)" stroke="url(#kbBook)" strokeWidth="2.5" strokeLinejoin="round"
              />
              <path d="M90 52 L90 103" stroke="url(#kbBook)" strokeWidth="2" />
              <path d="M58 58 C66 56 76 57 83 61 M58 68 C66 66 76 67 83 71 M58 78 C66 76 76 77 83 81" stroke="hsla(0,0%,100%,0.35)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              <path d="M122 58 C114 56 104 57 97 61 M122 68 C114 66 104 67 97 71" stroke="hsla(0,0%,100%,0.35)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <h2 data-reveal>Not included in the current MVP</h2>
        <p data-reveal>
          A reusable document library is not implemented yet. For now, add the context needed for grading directly to each assignment.
        </p>

        <div className={styles.featureGrid}>
          {[
            { icon: ClipboardList, title: 'Assignment Rubric', desc: 'Define weighted criteria and scoring levels for the assignment.' },
            { icon: FileText, title: 'Reference Answers', desc: 'Paste the answer key or expected responses into the assignment.' },
            { icon: SlidersHorizontal, title: 'Grading Instructions', desc: 'Add assignment-specific rules and choose the grading strictness.' },
          ].map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className={styles.featureCard} data-reveal>
                <div className={styles.featureIcon}><Icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>

        <Link href="/dashboard/assignments/new" className={styles.notifyBtn} data-reveal>
          Create an assignment
        </Link>
      </div>
    </Reveal>
  );
}
