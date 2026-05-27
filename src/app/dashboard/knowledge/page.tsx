'use client';

import { BookOpen, Sparkles, Upload, FileText, Globe } from 'lucide-react';
import styles from './page.module.css';

export default function KnowledgeBasePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Knowledge Base</h1>
        <p className={styles.subtitle}>Upload reference materials to improve AI grading accuracy</p>
      </div>

      {/* Coming Soon Banner */}
      <div className={styles.comingSoon}>
        <div className={styles.comingSoonIcon}>
          <Sparkles size={32} />
        </div>
        <h2>Coming Soon</h2>
        <p>
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
              <div key={i} className={styles.featureCard}>
                <div className={styles.featureIcon}><Icon size={20} /></div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            );
          })}
        </div>

        <button className={styles.notifyBtn}>
          <Sparkles size={14} />
          Notify me when it's ready
        </button>
      </div>
    </div>
  );
}
