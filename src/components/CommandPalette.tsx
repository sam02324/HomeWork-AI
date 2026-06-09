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
  BookMarked,
  Users,
  CheckCircle,
} from 'lucide-react';
import styles from './CommandPalette.module.css';
import { useClassrooms, useAssignments, useAllStudents, useAllSubmissions } from '@/lib/api-client';

interface CommandPaletteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export function CommandPalette({ open, setOpen }: CommandPaletteProps) {
  const router = useRouter();
  const { data: classrooms } = useClassrooms();
  const { data: assignments } = useAssignments();
  const { data: students } = useAllStudents();
  const { data: submissions } = useAllSubmissions();

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
              placeholder="Search pages, classrooms, assignments, students, submissions..." 
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

            {students && students.length > 0 && (
              <Command.Group heading="Students" className={styles.groupHeading}>
                {students.map(s => (
                  <Command.Item 
                    key={`student-${s.id}`} 
                    className={styles.item} 
                    onSelect={() => handleSelect(`/dashboard/students/${s.id}`)}
                  >
                    <Users className={styles.itemIcon} />
                    {s.name} ({s.classroomGrade} {s.classroomSubject})
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {submissions && submissions.length > 0 && (
              <Command.Group heading="Submissions" className={styles.groupHeading}>
                {submissions.map(s => (
                  <Command.Item 
                    key={`sub-${s.id}`} 
                    className={styles.item} 
                    onSelect={() => handleSelect(`/dashboard/assignments/${s.assignmentId}/review/${s.id}`)}
                  >
                    <CheckCircle className={styles.itemIcon} />
                    {s.studentName}&apos;s submission - {s.assignmentTitle}
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
