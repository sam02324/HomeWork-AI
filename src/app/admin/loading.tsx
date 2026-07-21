import styles from './admin-operations.module.css';

export default function AdminLoading() {
  return (
    <div className={styles.page} aria-busy="true" aria-label="Loading owner console">
      <div className={styles.loadingHero}>
        <div className={styles.loadingLine} />
        <div className={styles.loadingLine} />
        <div className={styles.loadingLine} />
      </div>
      <div className={styles.summaryGrid}>
        {Array.from({ length: 4 }, (_, index) => <div className={styles.summaryCard} key={index}><div className={styles.loadingLine} /></div>)}
      </div>
      <div className={`${styles.panel} ${styles.panelBody}`}>
        {Array.from({ length: 7 }, (_, index) => <div className={styles.loadingLine} key={index} />)}
      </div>
    </div>
  );
}
