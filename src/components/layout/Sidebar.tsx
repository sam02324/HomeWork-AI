'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  GraduationCap,
  ChevronsUpDown,
  Menu,
  X,
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Classrooms', href: '/dashboard/classrooms', icon: Users },
  { label: 'Assignments', href: '/dashboard/assignments', icon: FileText },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen, badge: 'Soon' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className={styles.mobileToggle}
        onClick={toggleMobile}
        aria-label="Toggle sidebar"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay for mobile */}
      <div
        className={`${styles.overlay} ${mobileOpen ? styles.overlayVisible : ''}`}
        onClick={closeMobile}
      />

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ''}`}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <GraduationCap size={20} />
          </div>
          <span className={styles.logoText}>GradeAI</span>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <span className={styles.navLabel}>Main Menu</span>
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={closeMobile}
              >
                <Icon className={styles.navIcon} />
                <span className={styles.navText}>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </Link>
            );
          })}

          <div className={styles.divider} />

          <span className={styles.navLabel}>Preferences</span>
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={closeMobile}
              >
                <Icon className={styles.navIcon} />
                <span className={styles.navText}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className={styles.userSection}>
          <div className={styles.userCard}>
            <div className={styles.userAvatar}>RK</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>Rajesh Kumar</div>
              <div className={styles.userRole}>Physics Teacher</div>
            </div>
            <ChevronsUpDown className={styles.userChevron} />
          </div>
        </div>
      </aside>
    </>
  );
}
