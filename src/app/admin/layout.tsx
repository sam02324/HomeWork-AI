import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  Bug,
  Flag,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  UserCog,
  Users,
  Zap,
} from 'lucide-react';
import { requireAdminLayout } from '@/lib/admin/auth';
import styles from './layout.module.css';

export const metadata: Metadata = {
  title: 'Owner Console | GradeAI',
  description: 'Private GradeAI administration console.',
  robots: { index: false, follow: false },
};

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, available: true },
  { href: '/admin/users', label: 'Users', icon: Users, available: false },
  { href: '/admin/usage', label: 'Usage & costs', icon: Gauge, available: false },
  { href: '/admin/health', label: 'System health', icon: HeartPulse, available: false },
  { href: '/admin/accounts', label: 'Account actions', icon: UserCog, available: false },
  { href: '/admin/moderation', label: 'Moderation', icon: Flag, available: false },
  { href: '/admin/monitoring', label: 'Sentry', icon: Bug, available: false },
];

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

        <nav className={styles.nav} aria-label="Admin navigation">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            if (!item.available) {
              return (
                <span className={styles.navDisabled} key={item.href} aria-disabled="true">
                  <Icon size={17} />
                  <span>{item.label}</span>
                  <small>Planned</small>
                </span>
              );
            }

            return (
              <Link className={styles.navActive} href={item.href} key={item.href}>
                <Icon size={17} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

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
