import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { requireAdminPage } from '@/lib/admin/auth';
import styles from './page.module.css';

const SECURITY_CHECKS = [
  {
    icon: KeyRound,
    title: 'Clerk session claim',
    detail: 'The active session carries metadata.role = admin.',
  },
  {
    icon: ServerCog,
    title: 'Live metadata check',
    detail: 'The server confirms the current role with Clerk before serving protected data.',
  },
  {
    icon: Database,
    title: 'Database is not the gate',
    detail: 'The local role is synchronized for reporting, but cannot grant admin access by itself.',
  },
];

const OPERATIONS = [
  { label: 'User and account overview', href: '/admin/users' },
  { label: 'Usage and cost monitoring', href: '/admin/usage' },
  { label: 'System health', href: '/admin/health' },
  { label: 'Manual account actions and audit log', href: '/admin/accounts' },
  { label: 'Content moderation', href: '/admin/moderation' },
  { label: 'Sentry monitoring', href: '/admin/monitoring' },
];

export default async function AdminPage() {
  const admin = await requireAdminPage();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}><LockKeyhole size={14} /> All seven stages live</span>
          <h1>Admin control center</h1>
          <p>
            A separate owner-only surface for operating GradeAI. Every page and API
            resource enforces the same Clerk role boundary before accessing data.
          </p>
        </div>
        <div className={styles.identityCard}>
          <span>Verified administrator</span>
          <strong>{admin.name}</strong>
          <small>{admin.email}</small>
          <div><ShieldCheck size={15} /> Clerk metadata: admin</div>
        </div>
      </section>

      <section className={styles.grid} aria-label="Access checks">
        {SECURITY_CHECKS.map((check) => {
          const Icon = check.icon;
          return (
            <article className={styles.checkCard} key={check.title}>
              <span className={styles.icon}><Icon size={19} /></span>
              <div>
                <h2>{check.title}</h2>
                <p>{check.detail}</p>
              </div>
              <CheckCircle2 className={styles.check} size={18} />
            </article>
          );
        })}
      </section>

      <section className={styles.roadmap}>
        <div>
          <span className={styles.sectionLabel}>Operations map</span>
          <h2>Security, margins, support and monitoring.</h2>
          <p>
            Usage costs are snapshotted per call. Account and moderation mutations are
            auditable. Provider health and Sentry diagnostics stay owner-only.
          </p>
          <Link href="/admin/users" className={styles.verifyLink}>
            <Users size={15} /> Open user overview <ArrowRight size={15} />
          </Link>
        </div>
        <ol>
          {OPERATIONS.map((stage, index) => (
            <li key={stage.href}>
              <span>{String(index + 2).padStart(2, '0')}</span>
              <Link href={stage.href}>{stage.label}</Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
