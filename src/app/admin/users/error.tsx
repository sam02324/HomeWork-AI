'use client';

import styles from './page.module.css';

export default function AdminUsersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className={styles.statePanel}>
      <h1>Could not load the user overview</h1>
      <p>The admin guard remains active. Retry the Clerk and database request.</p>
      <button type="button" onClick={reset}>Retry</button>
    </div>
  );
}
