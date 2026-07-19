'use client';

import { usePathname } from 'next/navigation';
import { Search, Sun, Moon } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useTheme } from '@/components/providers/ThemeProvider';
import styles from './Topbar.module.css';

const breadcrumbMap: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/classrooms': 'Classrooms',
  '/dashboard/assignments': 'Assignments',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/knowledge': 'Knowledge Base',
  '/dashboard/settings': 'Settings',
};

function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  const crumbs: { label: string; href: string }[] = [];

  if (pathname === '/dashboard') {
    crumbs.push({ label: 'Dashboard', href: '/dashboard' });
    return crumbs;
  }

  crumbs.push({ label: 'Dashboard', href: '/dashboard' });

  const match = breadcrumbMap[pathname];
  if (match) {
    crumbs.push({ label: match, href: pathname });
  } else {
    // Try to build from path segments
    const segments = pathname.replace('/dashboard/', '').split('/');
    let currentPath = '/dashboard';
    for (const seg of segments) {
      currentPath += `/${seg}`;
      const segLabel = breadcrumbMap[currentPath] || seg.charAt(0).toUpperCase() + seg.slice(1);
      crumbs.push({ label: segLabel, href: currentPath });
    }
  }

  return crumbs;
}

export function Topbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const breadcrumbs = getBreadcrumbs(pathname);
  const fullName = user?.fullName || user?.firstName || 'Teacher';
  const initials = fullName.substring(0, 2).toUpperCase();

  return (
    <header className={styles.topbar}>
      {/* Left: Breadcrumbs */}
      <div className={styles.left}>
        <div className={styles.breadcrumb}>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {i > 0 && <span className={styles.breadcrumbSeparator}>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <span className={styles.breadcrumbInactive}>{crumb.label}</span>
              ) : (
                <span>{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Center: Command palette trigger */}
      <div className={styles.center}>
        <button className={styles.searchTrigger} type="button">
          <Search className={styles.searchIcon} />
          <span className={styles.searchPlaceholder}>Search students, assignments...</span>
          <span className={styles.searchShortcut}>
            <span className={styles.kbd}>⌘</span>
            <span className={styles.kbd}>K</span>
          </span>
        </button>
      </div>

      {/* Right: Actions */}
      <div className={styles.right}>
        {/* Theme toggle */}
        <button className={styles.iconBtn} type="button" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <Sun className={styles.iconBtnIcon} />
          ) : (
            <Moon className={styles.iconBtnIcon} />
          )}
        </button>

        {/* User avatar */}
        <div className={styles.avatarBtn} aria-label={`Signed in as ${fullName}`}>
          <div className={styles.avatar}>{initials}</div>
          <span className={styles.avatarName}>{fullName}</span>
        </div>
      </div>
    </header>
  );
}
