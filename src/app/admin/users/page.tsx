import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  GraduationCap,
  Search,
  School,
  UsersRound,
} from 'lucide-react';
import { requireAdminPage } from '@/lib/admin/auth';
import {
  getAdminUserOverview,
  type AccountPlan,
  type AdminUserOverviewResult,
} from '@/lib/admin/user-overview';
import { adminUserQuerySchema, type AdminUserQuery } from '@/lib/validations';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'Users | GradeAI Owner Console',
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const PLAN_LABELS: Record<AccountPlan, string> = {
  unassigned: 'Not assigned',
  subscription: 'Subscription',
  pay_per_submission: 'Per submission',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatLastActive(value: string | null) {
  if (!value) return 'Never';

  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return formatDate(value);
}

function usersHref(filters: AdminUserQuery, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.plan !== 'all') params.set('plan', filters.plan);
  if (filters.role !== 'all') params.set('role', filters.role);
  if (filters.limit !== 25) params.set('limit', String(filters.limit));
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/users?${query}` : '/admin/users';
}

function SummaryCards({ summary }: Pick<AdminUserOverviewResult, 'summary'>) {
  const cards = [
    { label: 'Signed-up users', value: summary.totalUsers, icon: UsersRound },
    { label: 'Active in 30 days', value: summary.activeLast30Days, icon: Activity },
    { label: 'Subscriptions', value: summary.subscriptionUsers, icon: CreditCard },
    {
      label: 'Per submission',
      value: summary.payPerSubmissionUsers,
      icon: BookOpenCheck,
    },
  ];

  return (
    <section className={styles.summaryGrid} aria-label="Account summary">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article className={styles.summaryCard} key={card.label}>
            <span className={styles.summaryIcon}><Icon size={18} /></span>
            <strong>{card.value}</strong>
            <span>{card.label}</span>
          </article>
        );
      })}
    </section>
  );
}

export default async function AdminUsersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();

  const rawParams = await searchParams;
  const parsed = adminUserQuerySchema.safeParse(
    Object.fromEntries(
      Object.entries(rawParams)
        .map(([key, value]) => [key, firstValue(value)])
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    )
  );

  if (!parsed.success) redirect('/admin/users');

  const result = await getAdminUserOverview(parsed.data);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 2 - Account overview</span>
          <h1>Users</h1>
          <p>Clerk identities merged with GradeAI account activity and ownership totals.</p>
        </div>
        <div className={styles.unassignedNote}>
          <strong>{result.summary.unassignedUsers}</strong>
          <span>plans not assigned</span>
        </div>
      </header>

      <SummaryCards summary={result.summary} />

      <section className={styles.panel}>
        <form className={styles.filters} action="/admin/users" method="get">
          <label className={styles.searchField}>
            <Search size={16} aria-hidden="true" />
            <span className={styles.srOnly}>Search users</span>
            <input
              type="search"
              name="q"
              defaultValue={result.filters.q}
              placeholder="Search name or email"
              maxLength={100}
            />
          </label>

          <label>
            <span>Plan</span>
            <select name="plan" defaultValue={result.filters.plan}>
              <option value="all">All plans</option>
              <option value="subscription">Subscription</option>
              <option value="pay_per_submission">Per submission</option>
              <option value="unassigned">Not assigned</option>
            </select>
          </label>

          <label>
            <span>Role</span>
            <select name="role" defaultValue={result.filters.role}>
              <option value="all">All roles</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button type="submit">Apply filters</button>
          <Link href="/admin/users">Clear</Link>
        </form>

        <div className={styles.resultsMeta}>
          <span>
            {result.pagination.totalItems} account{result.pagination.totalItems === 1 ? '' : 's'}
          </span>
          <span>Page {result.pagination.page} of {result.pagination.totalPages}</span>
        </div>

        {result.users.length === 0 ? (
          <div className={styles.emptyState}>
            <UsersRound size={28} />
            <h2>No users match these filters</h2>
            <p>Clear the search or choose a different plan and role.</p>
            <Link href="/admin/users">Reset filters</Link>
          </div>
        ) : (
          <div className={styles.tableScroll}>
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Plan</th>
                  <th>Signed up</th>
                  <th>Last active</th>
                  <th>GradeAI activity</th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className={styles.identity}>
                        <span className={styles.avatar} aria-hidden="true">
                          {user.name.slice(0, 1).toLocaleUpperCase('en-IN')}
                        </span>
                        <span>
                          <strong>{user.name}</strong>
                          <small>{user.email || 'No email address'}</small>
                        </span>
                      </div>
                    </td>
                    <td><span className={`${styles.badge} ${styles[user.role]}`}>{user.role}</span></td>
                    <td>
                      <span className={`${styles.planBadge} ${styles[user.plan]}`}>
                        {PLAN_LABELS[user.plan]}
                      </span>
                    </td>
                    <td><time dateTime={user.createdAt}>{formatDate(user.createdAt)}</time></td>
                    <td>
                      <time dateTime={user.lastActiveAt ?? undefined}>
                        {formatLastActive(user.lastActiveAt)}
                      </time>
                    </td>
                    <td>
                      <div className={styles.counts}>
                        <span title="Classrooms"><School size={14} /> {user.counts.classrooms}</span>
                        <span title="Students"><GraduationCap size={14} /> {user.counts.students}</span>
                        <span title="Assignments"><BookOpenCheck size={14} /> {user.counts.assignments}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav className={styles.pagination} aria-label="Users pagination">
          {result.pagination.hasPreviousPage ? (
            <Link href={usersHref(result.filters, result.pagination.page - 1)}>
              <ChevronLeft size={15} /> Previous
            </Link>
          ) : <span />}
          {result.pagination.hasNextPage ? (
            <Link href={usersHref(result.filters, result.pagination.page + 1)}>
              Next <ChevronRight size={15} />
            </Link>
          ) : <span />}
        </nav>
      </section>
    </div>
  );
}
