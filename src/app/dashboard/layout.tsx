'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  Zap,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import styles from './layout.module.css';
import { useUser, useClerk } from '@clerk/nextjs';
import { CommandPalette } from '@/components/CommandPalette';
import { Tilt } from '@/components/motion/Tilt';
import { isAdminRole } from '@/lib/auth/roles';
import { useTheme } from '@/components/providers/ThemeProvider';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/classrooms', label: 'Classrooms', icon: Users },
  { href: '/dashboard/assignments', label: 'Assignments', icon: FileText },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/knowledge', label: 'Knowledge Base', icon: BookOpen, badge: 'Soon' },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

const ADMIN_NAV_ITEM = { href: '/admin', label: 'Owner Console', icon: ShieldCheck, badge: 'Admin' };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const isAdmin = isAdminRole(user?.publicMetadata.role);
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  // Search/Command palette state
  const [searchOpen, setSearchOpen] = useState(false);
  
  const fullName = user?.fullName || user?.firstName || 'Teacher';
  const initials = fullName.substring(0, 2).toUpperCase();

  // Zero-setup background auto-sync
  useEffect(() => {
    // Fire and forget, no need to await or block UI
    fetch('/api/sync-all').catch(err => console.error('Background sync failed:', err));
  }, []);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  const SEARCH_HINTS = [
    'Search anything…',
    'Find a student…',
    'Jump to an assignment…',
    'Open a classroom…',
  ];

  return (
      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarHeader}>
            <Link href="/" className={styles.logo}>
              <Zap size={20} className={styles.logoIcon} />
              <span>GradeAI</span>
            </Link>
            <button className={styles.closeSidebar} onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className={styles.nav}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.navItem} ${active ? styles.navActive : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                  {active && <div className={styles.navIndicator} />}
                </Link>
              );
            })}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.userCard}>
              <div className={styles.userAvatar}>{initials}</div>
              <div className={styles.userInfo}>
                <div className={styles.userName}>{fullName}</div>
                <div className={styles.userRole}>{isAdmin ? 'Owner admin' : 'Teacher'}</div>
              </div>
              <button
                onClick={() => signOut({ redirectUrl: '/' })}
                title="Log out"
                className={styles.logoutBtn}
              >
                <LogOut size={16} className={styles.logoutIcon} />
              </button>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebarOpen(false)} />}

        {/* ── Main Area ── */}
        <div className={styles.main}>
          {/* Topbar */}
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuBtn} onClick={() => setSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <div className={styles.breadcrumb}>
                {pathname === '/dashboard' && <span>Dashboard</span>}
                {pathname.startsWith('/dashboard/classrooms') && (
                  <>
                    <Link href="/dashboard/classrooms">Classrooms</Link>
                    {pathname !== '/dashboard/classrooms' && (
                      <><ChevronRight size={14} /><span>Class Detail</span></>
                    )}
                  </>
                )}
                {pathname.startsWith('/dashboard/assignments') && (
                  <>
                    <Link href="/dashboard/assignments">Assignments</Link>
                    {pathname.includes('/new') && (
                      <><ChevronRight size={14} /><span>New Assignment</span></>
                    )}
                  </>
                )}
                {pathname.startsWith('/dashboard/analytics') && <span>Analytics</span>}
                {pathname.startsWith('/dashboard/knowledge') && <span>Knowledge Base</span>}
                {pathname.startsWith('/dashboard/settings') && <span>Settings</span>}
                {pathname.startsWith('/dashboard/students') && (
                  <>
                    <Link href="/dashboard/classrooms">Students</Link>
                    <ChevronRight size={14} />
                    <span>Analytics</span>
                  </>
                )}
              </div>
            </div>

            <div className={styles.topbarCenter}>
              <Tilt className={styles.searchTilt} max={6}>
                <div className={styles.searchBar} onClick={() => setSearchOpen(true)}>
                  <Search size={16} />
                  <div className={styles.searchCycle} aria-label="Search">
                    {SEARCH_HINTS.map((hint, i) => (
                      <span
                        key={i}
                        className={styles.searchHint}
                        style={{ animationDelay: `${i * 3}s` }}
                      >
                        {hint}
                      </span>
                    ))}
                  </div>
                  <kbd>⌘K</kbd>
                </div>
              </Tilt>
            </div>

            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle theme">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <div className={styles.topbarAvatar}>{initials}</div>
            </div>
          </header>

          {/* Content */}
          <main className={styles.content}>
            {children}
          </main>
          
          <CommandPalette open={searchOpen} setOpen={setSearchOpen} />
        </div>
      </div>
  );
}
