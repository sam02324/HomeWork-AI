'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { 
  Search, 
  Home, 
  BookOpen, 
  FileText, 
  PlusCircle, 
  BarChart2, 
  Settings, 
  BookMarked 
} from 'lucide-react';
import styles from './CommandPalette.module.css';
import { useClassrooms, useAssignments } from '@/lib/api-client';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { data: classrooms } = useClassrooms();
  const { data: assignments } = useAssignments();

  // Toggle the menu when ⌘K is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [setOpen]);

  const handleSelect = (route: string) => {
    setOpen(false);
    router.push(route);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => setOpen(false)}>
      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <Command className={styles.command} loop>
          <div className={styles.inputWrapper}>
            <Search className={styles.searchIcon} />
            <Command.Input 
              className={styles.input}
              placeholder="Search for pages, classrooms, or assignments..." 
              autoFocus
            />
          </div>

          <Command.List className={styles.list}>
            <Command.Empty className={styles.empty}>No results found.</Command.Empty>

            <Command.Group heading="Quick Links" className={styles.groupHeading}>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard')}>
                <Home className={styles.itemIcon} />
                Dashboard
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/assignments')}>
                <FileText className={styles.itemIcon} />
                Assignments
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/assignments/new')}>
                <PlusCircle className={styles.itemIcon} />
                New Assignment
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/classrooms')}>
                <BookOpen className={styles.itemIcon} />
                Classrooms
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/analytics')}>
                <BarChart2 className={styles.itemIcon} />
                Analytics
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/knowledge')}>
                <BookMarked className={styles.itemIcon} />
                Knowledge Base
              </Command.Item>
              <Command.Item className={styles.item} onSelect={() => handleSelect('/dashboard/settings')}>
                <Settings className={styles.itemIcon} />
                Settings
              </Command.Item>
            </Command.Group>

            {classrooms && classrooms.length > 0 && (
              <Command.Group heading="Classrooms" className={styles.groupHeading}>
                {classrooms.map(c => (
                  <Command.Item 
                    key={`class-${c.id}`} 
                    className={styles.item} 
                    onSelect={() => handleSelect(`/dashboard/classrooms/${c.id}`)}
                  >
                    <BookOpen className={styles.itemIcon} />
                    {c.grade} {c.subject} - {c.name}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {assignments && assignments.length > 0 && (
              <Command.Group heading="Assignments" className={styles.groupHeading}>
                {assignments.map(a => (
                  <Command.Item 
                    key={`assign-${a.id}`} 
                    className={styles.item} 
                    onSelect={() => handleSelect(`/dashboard/assignments/${a.id}`)}
                  >
                    <FileText className={styles.itemIcon} />
                    {a.title}
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
