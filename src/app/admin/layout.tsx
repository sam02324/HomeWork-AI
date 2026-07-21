import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { requireAdminLayout } from '@/lib/admin/auth';
import { AdminNav } from './admin-nav';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Owner Console | GradeAI',
  description: 'Private GradeAI administration console.',
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminLayout();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link href="/admin" className={styles.brand}>
          <span className={styles.brandMark}><Zap size={17} /></span>
          <span>
            <strong>GradeAI</strong>
            <small>Owner console</small>
          </span>
        </Link>

        <div className={styles.securityBadge}>
          <ShieldCheck size={16} />
          Clerk role protected
        </div>

        <AdminNav />

        <div className={styles.sidebarFooter}>
          <Link href="/dashboard">
            <ArrowLeft size={16} />
            Teacher dashboard
          </Link>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <span className={styles.eyebrow}>Private administration</span>
            <strong>Owner access only</strong>
          </div>
          <div className={styles.topbarStatus}>
            <span />
            Role verified server-side
          </div>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
