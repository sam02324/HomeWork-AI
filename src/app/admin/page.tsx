import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Database,
  KeyRound,
  LockKeyhole,
  ServerCog,
  ShieldCheck,
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

const NEXT_STAGES = [
  'User and account overview',
  'Usage and cost monitoring',
  'System health',
  'Manual account actions and audit log',
  'Content moderation',
  'Sentry monitoring',
];

export default async function AdminPage() {
  const admin = await requireAdminPage();

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div>
          <span className={styles.kicker}><LockKeyhole size={14} /> Stage 1 complete</span>
          <h1>Admin control center</h1>
          <p>
            A separate owner-only surface for operating GradeAI. Every page and API
            resource will enforce the same Clerk role boundary before accessing data.
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
          <span className={styles.sectionLabel}>Build sequence</span>
          <h2>Security boundary first. Operations next.</h2>
          <p>
            Later stages remain disabled until their database models and server APIs are
            implemented. This prevents placeholder controls from implying capabilities that
            do not exist yet.
          </p>
          <Link href="/api/admin/session" className={styles.verifyLink}>
            Verify admin API guard <ArrowRight size={15} />
          </Link>
        </div>
        <ol>
          {NEXT_STAGES.map((stage, index) => (
            <li key={stage}>
              <span>{String(index + 2).padStart(2, '0')}</span>
              {stage}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
