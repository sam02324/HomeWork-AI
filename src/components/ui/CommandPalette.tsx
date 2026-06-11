'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  FileText,
  Users,
  LayoutDashboard,
  BarChart3,
  Settings,
  Plus,
  CornerDownLeft,
} from 'lucide-react';
import { useClassrooms, useAssignments } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/useDebounce';
import styles from './CommandPalette.module.css';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  action: () => void;
}

/** Lightweight fuzzy score: rewards subsequence matches, earlier = better. 0 = no match. */
function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t.includes(q)) return 100 - t.indexOf(q); // direct substring wins
  let qi = 0;
  let score = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      score += 1;
      qi++;
    }
  }
  return qi === q.length ? score : 0;
}

/** ⌘K command palette: fuzzy search assignments/classrooms + quick actions, full keyboard nav. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 120);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only fetch list data while the palette is open.
  const { data: classrooms } = useClassrooms();
  const { data: assignments } = useAssignments();

  // Reset state whenever it opens, and focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Focus after the enter animation paint.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };

    const quickActions: Command[] = [
      { id: 'qa-new', label: 'Create assignment', hint: 'Action', icon: <Plus size={16} />, action: go('/dashboard/assignments/new') },
      { id: 'qa-dash', label: 'Go to Dashboard', hint: 'Navigate', icon: <LayoutDashboard size={16} />, action: go('/dashboard') },
      { id: 'qa-classrooms', label: 'Go to Classrooms', hint: 'Navigate', icon: <Users size={16} />, action: go('/dashboard/classrooms') },
      { id: 'qa-assignments', label: 'Go to Assignments', hint: 'Navigate', icon: <FileText size={16} />, action: go('/dashboard/assignments') },
      { id: 'qa-analytics', label: 'Go to Analytics', hint: 'Navigate', icon: <BarChart3 size={16} />, action: go('/dashboard/analytics') },
      { id: 'qa-settings', label: 'Go to Settings', hint: 'Navigate', icon: <Settings size={16} />, action: go('/dashboard/settings') },
    ];

    const classroomCmds: Command[] = (classrooms ?? []).map((c) => ({
      id: `class-${c.id}`,
      label: c.name,
      hint: `Classroom · ${c.subject}`,
      icon: <Users size={16} />,
      action: go(`/dashboard/classrooms/${c.id}`),
    }));

    const assignmentCmds: Command[] = (assignments ?? []).map((a) => ({
      id: `asgn-${a.id}`,
      label: a.title,
      hint: `Assignment · ${a.subject}`,
      icon: <FileText size={16} />,
      action: go(`/dashboard/assignments/${a.id}`),
    }));

    return [...quickActions, ...classroomCmds, ...assignmentCmds];
  }, [classrooms, assignments, router, onClose]);

  const filtered = useMemo(() => {
    if (!debounced.trim()) return commands;
    return commands
      .map((c) => ({ c, score: fuzzyScore(debounced, c.label + ' ' + (c.hint ?? '')) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);
  }, [commands, debounced]);

  // Keep the active index in range as the list shrinks.
  useEffect(() => {
    setActive((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      filtered[active]?.action();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
        >
          <motion.div
            className={styles.palette}
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.searchRow}>
              <Search size={18} className={styles.searchIcon} />
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="Search assignments, classrooms, or actions…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
              />
              <kbd className={styles.kbd}>Esc</kbd>
            </div>

            <div className={styles.list}>
              {filtered.length === 0 && <div className={styles.empty}>No results for “{query}”</div>}
              {filtered.map((c, i) => (
                <button
                  key={c.id}
                  className={`${styles.item} ${i === active ? styles.itemActive : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => c.action()}
                >
                  <span className={styles.itemIcon}>{c.icon}</span>
                  <span className={styles.itemLabel}>{c.label}</span>
                  {c.hint && <span className={styles.itemHint}>{c.hint}</span>}
                  {i === active && <CornerDownLeft size={14} className={styles.enterIcon} />}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
