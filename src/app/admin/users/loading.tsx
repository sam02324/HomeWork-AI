import styles from './page.module.css';

export default function AdminUsersLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading user overview">
      <div className={styles.header}>
        <div style={{ width: 'min(420px, 100%)' }}>
          <div className={styles.loadingLine} style={{ width: 140, marginBottom: 18 }} />
          <div className={styles.loadingLine} style={{ height: 54, marginBottom: 14 }} />
          <div className={styles.loadingLine} style={{ width: '80%' }} />
        </div>
      </div>
      <div className={styles.summaryGrid}>
        {Array.from({ length: 4 }, (_, index) => (
          <div className={styles.summaryCard} key={index}>
            <div className={styles.loadingLine} style={{ width: '100%' }} />
          </div>
        ))}
      </div>
      <div className={styles.panel} style={{ padding: 24 }}>
        {Array.from({ length: 7 }, (_, index) => (
          <div
            className={styles.loadingLine}
            key={index}
            style={{ marginBottom: index === 6 ? 0 : 18, height: 34 }}
          />
        ))}
      </div>
    </div>
  );
}
