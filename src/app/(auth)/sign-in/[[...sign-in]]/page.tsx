import { SignIn } from '@clerk/nextjs';
import { Zap } from 'lucide-react';
import styles from './page.module.css';

export default function SignInPage() {
  return (
    <div className={styles.page}>
      <div className={`${styles.aurora} ${styles.auroraA}`} aria-hidden="true" />
      <div className={`${styles.aurora} ${styles.auroraB}`} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.brand}>
        <Zap size={26} className={styles.brandIcon} />
        <span>
          Grade<em className={styles.brandAccent}>AI</em>
        </span>
      </div>

      <div className={styles.card}>
        <SignIn
          appearance={{
            variables: {
              colorPrimary: 'hsl(350, 80%, 55%)',
            },
          }}
        />
      </div>

      <p className={styles.tagline}>Grade smarter. Teach more.</p>
    </div>
  );
}
