'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  GraduationCap,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import styles from './Sidebar.module.css';
import { useUser, useClerk } from '@clerk/nextjs';

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
  const { user } = useUser();
  const { signOut } = useClerk();

  // Sliding active pill: tweens behind the nav items on route change.
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const pillInitialized = useRef(false);

  useGSAP(
    () => {
      const nav = navRef.current;
      const pill = pillRef.current;
      if (!nav || !pill) return;
      const active = nav.querySelector<HTMLElement>(`.${styles.navItemActive}`);
      if (!active) {
        gsap.set(pill, { autoAlpha: 0 });
        pillInitialized.current = false;
        return;
      }
      const target = { y: active.offsetTop, height: active.offsetHeight };
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!pillInitialized.current || reduce) {
        // First paint (or reduced motion): place it, don't animate.
        gsap.set(pill, { ...target, autoAlpha: 1, scaleY: 1 });
        pillInitialized.current = true;
        return;
      }
      // Slide with a slight stretch while travelling, then settle.
      gsap.timeline()
        .to(pill, { scaleY: 1.2, duration: 0.15, ease: 'power2.in' }, 0)
        .to(pill, { ...target, autoAlpha: 1, duration: 0.45, ease: 'power3.out' }, 0)
        .to(pill, { scaleY: 1, duration: 0.3, ease: 'power2.out' }, 0.15);
    },
    { scope: navRef, dependencies: [pathname] }
  );
  
  const fullName = user?.fullName || user?.firstName || 'Teacher';
  const initials = fullName.substring(0, 2).toUpperCase();

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
        <nav className={styles.nav} ref={navRef}>
          <div className={styles.navPill} ref={pillRef} aria-hidden="true" />
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
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{fullName}</div>
              <div className={styles.userRole}>Teacher</div>
            </div>
            <button 
              onClick={() => signOut({ redirectUrl: '/' })} 
              className={styles.logoutButton}
              title="Log out"
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '4px' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
