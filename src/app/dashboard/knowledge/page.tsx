'use client';

import { BookOpen, Sparkles, Upload, FileText, Globe } from 'lucide-react';
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
        <p className={styles.subtitle}>Upload reference materials to improve AI grading accuracy</p>
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

        <h2 data-reveal>Coming Soon</h2>
        <p data-reveal>
          The Knowledge Base will let you upload textbooks, syllabi, previous papers, and marking schemes.
          The AI will use this context to grade more accurately and align with your teaching style.
        </p>

        <div className={styles.featureGrid}>
          {[
            { icon: Upload, title: 'Upload Materials', desc: 'Upload PDFs, images, and text documents to create your reference library' },
            { icon: BookOpen, title: 'RAG-Aware Grading', desc: 'AI retrieves relevant sections from your materials before grading each answer' },
            { icon: FileText, title: 'Syllabus Alignment', desc: 'Map your curriculum so AI understands what topics students should know' },
            { icon: Globe, title: 'Board-Specific', desc: 'Pre-loaded knowledge for CBSE, ICSE, State Boards, JEE, and NEET patterns' },
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

        <button className={styles.notifyBtn} data-reveal>
          <Sparkles size={14} />
          Notify me when it&apos;s ready
        </button>
      </div>
    </Reveal>
  );
}
