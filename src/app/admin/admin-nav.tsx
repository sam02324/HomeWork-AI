'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
  { href: '/admin/usage', label: 'Usage & costs', icon: Gauge, available: true },
  { href: '/admin/health', label: 'System health', icon: HeartPulse, available: true },
  { href: '/admin/accounts', label: 'Account actions', icon: UserCog, available: true },
  { href: '/admin/moderation', label: 'Moderation', icon: Flag, available: true },
  { href: '/admin/monitoring', label: 'Sentry', icon: Bug, available: true },
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
            {isActive && (
              <motion.span
                className={styles.navIndicator}
                layoutId="admin-nav-indicator"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={17} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
