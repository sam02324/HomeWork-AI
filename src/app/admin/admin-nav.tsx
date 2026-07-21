'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bug,
  Flag,
  Gauge,
  HeartPulse,
  LayoutDashboard,
  UserCog,
  Users,
} from 'lucide-react';
import styles from './layout.module.css';

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, available: true },
  { href: '/admin/users', label: 'Users', icon: Users, available: true },
  { href: '/admin/usage', label: 'Usage & costs', icon: Gauge, available: false },
  { href: '/admin/health', label: 'System health', icon: HeartPulse, available: false },
  { href: '/admin/accounts', label: 'Account actions', icon: UserCog, available: false },
  { href: '/admin/moderation', label: 'Moderation', icon: Flag, available: false },
  { href: '/admin/monitoring', label: 'Sentry', icon: Bug, available: false },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label="Admin navigation">
      {ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        if (!item.available) {
          return (
            <span className={styles.navDisabled} key={item.href} aria-disabled="true">
              <Icon size={17} />
              <span>{item.label}</span>
              <small>Planned</small>
            </span>
          );
        }

        const isActive =
          item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);

        return (
          <Link
            className={isActive ? styles.navActive : styles.navLink}
            href={item.href}
            key={item.href}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
