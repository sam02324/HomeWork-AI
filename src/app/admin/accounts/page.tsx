import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Search, ShieldAlert, UserCog, WalletCards } from 'lucide-react';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/admin/auth';
import { getAdminAccounts } from '@/lib/admin/accounts';
import { adminAccountQuerySchema, type AdminAccountQuery } from '@/lib/validations';
import styles from '../admin-operations.module.css';

export const metadata: Metadata = { title: 'Account Actions | GradeAI Owner Console' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
function href(query: AdminAccountQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status !== 'all') params.set('status', query.status);
  if (page > 1) params.set('page', String(page));
  return `/admin/accounts${params.size ? `?${params}` : ''}`;
}

export default async function AdminAccountsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdminPage();
  const raw = await searchParams;
  const parsed = adminAccountQuerySchema.safeParse(
    Object.fromEntries(Object.entries(raw)
      .map(([key, value]) => [key, first(value)])
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  );
  if (!parsed.success) redirect('/admin/accounts');

  const result = await getAdminAccounts(parsed.data);
  if (result.pagination.page !== parsed.data.page) redirect(href(parsed.data, result.pagination.page));

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.kicker}>Stage 5 - Owner actions</span>
          <h1>Account controls</h1>
          <p>Suspend access through Clerk, adjust plan/credits/quota, inspect support data and audit every mutation.</p>
        </div>
      </header>

      <div className={styles.warningNote}><ShieldAlert size={14} /> Suspension calls Clerk first, then atomically commits local state and its audit event. A failed database commit triggers a Clerk rollback.</div>

      <section className={styles.panel}>
        <form className={styles.filterForm} action="/admin/accounts" method="get">
          <div className={styles.field}><label htmlFor="account-search">Search</label><input id="account-search" name="q" type="search" defaultValue={result.filters.q} placeholder="Name or email" maxLength={100} /></div>
          <div className={styles.field}><label htmlFor="account-status">Status</label><select id="account-status" name="status" defaultValue={result.filters.status}><option value="all">All accounts</option><option value="active">Active</option><option value="suspended">Suspended</option></select></div>
          <button className={styles.button} type="submit"><Search size={14} /> Filter</button>
          <Link className={styles.buttonGhost} href="/admin/accounts">Clear</Link>
        </form>

        {result.users.length ? (
          <div className={styles.tableScroll}><table>
            <thead><tr><th>User</th><th>Status</th><th>Plan</th><th>Credits</th><th>Monthly quota</th><th>Support</th></tr></thead>
            <tbody>{result.users.map((user) => (
              <tr key={user.id}>
                <td className={styles.identity}><strong>{user.name}</strong><small>{user.email}</small></td>
                <td><span className={user.accountStatus === 'active' ? styles.statusHealthy : styles.statusDown}>{user.accountStatus}</span></td>
                <td><span className={styles.badge}>{user.accountPlan.replaceAll('_', ' ')}</span></td>
                <td><WalletCards size={13} /> {user.submissionCredits}</td>
                <td>{user.monthlySubmissionQuota ?? 'Unlimited / unset'}</td>
                <td><Link className={styles.buttonGhost} href={`/admin/accounts/${user.id}`}><UserCog size={13} /> Open</Link></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <div className={styles.empty}><UserCog size={24} /><h2>No accounts match</h2><p>Clear the filters and try again.</p></div>}

        <nav className={styles.pagination} aria-label="Account pages">
          {result.pagination.page > 1 ? <Link href={href(parsed.data, result.pagination.page - 1)}><ChevronLeft size={13} /> Previous</Link> : <span />}
          <span className={styles.mono}>Page {result.pagination.page} / {result.pagination.totalPages} - {result.pagination.totalItems} users</span>
          {result.pagination.page < result.pagination.totalPages ? <Link href={href(parsed.data, result.pagination.page + 1)}>Next <ChevronRight size={13} /></Link> : <span />}
        </nav>
      </section>
    </div>
  );
}
