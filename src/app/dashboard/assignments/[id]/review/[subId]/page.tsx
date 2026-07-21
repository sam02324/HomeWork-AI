'use client';

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Bot, Save, Sparkles } from 'lucide-react';
import { useAssignment, useAssignmentSubmissions } from '@/lib/api-client';
import { Reveal } from '@/components/motion/Reveal';
import { ReportContent } from './report-content';
import styles from './page.module.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Inline markdown-lite: **bold** and `code` spans. */
function renderInline(text: string, keyBase: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={`${keyBase}-${i}`}>{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

/**
 * Dependency-free markdown-lite renderer for chat bubbles. The assistant
 * replies with headings, bullets, and bold — without this they render as
 * raw `**` / `##` / `-` noise in a single paragraph.
 */
function MessageBody({ content }: { content: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: ReactNode[] } | null = null;

  const flushList = (key: string) => {
    if (!list) return;
    blocks.push(
      list.ordered ? <ol key={key}>{list.items}</ol> : <ul key={key}>{list.items}</ul>
    );
    list = null;
  };

  content.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.+)/);
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)/);
    const heading = line.match(/^#{1,4}\s+(.+)/);

    if (bullet || ordered) {
      const item = (bullet ?? ordered)![1];
      if (!list || list.ordered !== !!ordered) {
        flushList(`l-${i}`);
        list = { ordered: !!ordered, items: [] };
      }
      list.items.push(<li key={`i-${i}`}>{renderInline(item, `i-${i}`)}</li>);
      return;
    }

    flushList(`l-${i}`);
    if (!line.trim()) return; // blank line = paragraph break
    if (heading) {
      blocks.push(
        <p key={`h-${i}`} className={styles.msgHeading}>{renderInline(heading[1], `h-${i}`)}</p>
      );
      return;
    }
    blocks.push(<p key={`p-${i}`}>{renderInline(line, `p-${i}`)}</p>);
  });
  flushList('l-end');

  return <>{blocks}</>;
}

export default function InteractiveReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const subId = params.subId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [overrideScore, setOverrideScore] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // 1. Fetch Assignment Details
  const { data: assignmentData, error: assignmentError, isLoading: assignmentLoading } = useAssignment(id);

  // 2. Fetch Submissions
  const { data: submissionsData, error: submissionsError, isLoading: submissionsLoading } = useAssignmentSubmissions(id);

  const submission = submissionsData?.find((s) => s.id === subId);
  const grade = submission?.grade;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [syncedGradeId, setSyncedGradeId] = useState<string | null>(null);

  // Initialize chat + override fields from the fetched grade. Render-time
  // adjustment (guarded by grade id) instead of an effect — re-syncs only
  // when a different grade arrives, never clobbers in-flight local state.
  if (grade && grade.id !== syncedGradeId) {
    setSyncedGradeId(grade.id);
    setMessages((grade.chatHistory as ChatMessage[]) || []);
    setOverrideScore(grade.teacherOverrideScore?.toString() ?? grade.totalScore);
    setTeacherNote(grade.teacherNote || '');
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => setInput(e.target.value);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoadingChat(true);

    try {
      const res = await fetch(`/api/assignments/${id}/submissions/${subId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });

      if (!res.ok) throw new Error('Chat failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
      setMessages([...newMessages, assistantMessage]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        assistantMessage.content += chunk;
        setMessages([...newMessages, { ...assistantMessage }]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingChat(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle saving manual score override
  const handleSaveOverride = async () => {
    if (!grade) return;
    const score = parseFloat(overrideScore);
    if (!Number.isFinite(score)) {
      // Empty/invalid score field — surface the error state instead of a 400.
      setSaveState('error');
      setTimeout(() => setSaveState('idle'), 2500);
      return;
    }
    setSaveState('saving');
    try {
      const res = await fetch(`/api/grades/${grade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherOverrideScore: score,
          teacherNote,
          reviewedByTeacher: true
        })
      });
      setSaveState(res.ok ? 'saved' : 'error');
    } catch (e) {
      console.error(e);
      setSaveState('error');
    } finally {
      setTimeout(() => setSaveState('idle'), 2500);
    }
  };

  if (assignmentError) {
    return <div className={styles.error}>Error loading assignment: {String(assignmentError)}</div>;
  }

  if (submissionsError) {
    return <div className={styles.error}>Error loading submissions: {String(submissionsError)}</div>;
  }

  if (assignmentLoading || submissionsLoading) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingOrb} />
        Loading review
      </div>
    );
  }

  if (!assignmentData || !submissionsData) {
    return (
      <div className={styles.loading}>
        <span className={styles.loadingOrb} />
        Initializing data
      </div>
    );
  }

  if (!submission) {
    return <div className={styles.error}>Submission not found</div>;
  }

  const maxScore = Number(assignmentData.maxScore) || 100;
  const displayScore = Number(grade?.teacherOverrideScore ?? grade?.totalScore ?? 0);
  const scorePct = Math.max(0, Math.min(100, (displayScore / maxScore) * 100));
  const showTyping =
    isLoadingChat && (messages.length === 0 || messages[messages.length - 1]?.role !== 'assistant' || !messages[messages.length - 1]?.content);

  return (
    <Reveal className={styles.page}>
      {/* ── Header ── */}
      <div className={styles.header} data-reveal>
        <div className={styles.headerLeft}>
          <button onClick={() => router.push(`/dashboard/assignments/${id}`)} className={styles.backBtn}>
            <ArrowLeft size={15} /> Assignment Overview
          </button>
          <span className="page-eyebrow">Submission Review</span>
          <h1 className="page-title">
            <em className="serif-accent">{submission.student?.name || 'Student'}</em>
          </h1>
          <p className="page-sub">
            {assignmentData.title} · Roll No: {submission.student?.rollNumber || 'N/A'}
          </p>
          <ReportContent submissionId={subId} />
        </div>

        <div className={styles.scoreCard}>
          <div className={styles.scoreRing}>
            <svg viewBox="0 0 36 36">
              <path
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                fill="none" stroke="var(--bg-tertiary)" strokeWidth="3"
              />
              <path
                className={styles.ringProgress}
                d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831"
                fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${scorePct}, 100`}
              />
            </svg>
            <div className={styles.scoreRingText}>
              <span className={styles.scoreValue}>{displayScore}</span>
              <span className={styles.scoreMax}>/ {maxScore}</span>
            </div>
          </div>
          <span className={styles.scoreCaption}>
            {grade?.teacherOverrideScore != null ? 'Teacher override' : 'AI score'}
          </span>
        </div>
      </div>

      {/* ── Manual Override ── */}
      <div className={styles.overridePanel} data-reveal>
        <div className={styles.overrideFields}>
          <div className={styles.formGroup}>
            <label>Final Score <span className={styles.labelHint}>out of {maxScore}</span></label>
            <input
              type="number"
              value={overrideScore}
              onChange={e => setOverrideScore(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={`${styles.formGroup} ${styles.formGroupWide}`}>
            <label>Teacher Note <span className={styles.labelHint}>internal</span></label>
            <input
              type="text"
              value={teacherNote}
              onChange={e => setTeacherNote(e.target.value)}
              className={styles.input}
              placeholder="Visible only to you"
            />
          </div>
          <button onClick={handleSaveOverride} className={styles.saveBtn} disabled={saveState === 'saving'}>
            <Save size={14} />
            {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : saveState === 'error' ? 'Retry' : 'Save Override'}
          </button>
        </div>
      </div>

      {/* ── Grading Assistant ── */}
      <div className={styles.chatPanel} data-reveal>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderTitle}>
            <span className={styles.botChip}><Bot size={15} /></span>
            <div>
              <h3>Grading Assistant</h3>
              <span className={styles.chatHeaderSub}>Ask why points were deducted, or request a re-evaluation</span>
            </div>
          </div>
          <div className={styles.scoreBadge}>
            <Sparkles size={12} />
            AI {grade?.totalScore} / {maxScore}
          </div>
        </div>

        <div className={styles.chatContainer}>
          {/* AI Feedback (initial context) */}
          {grade?.feedback && messages.length === 0 && (
            <div className={styles.feedbackCard}>
              <span className={styles.feedbackTag}>AI Feedback</span>
              <p className={styles.feedbackBody}>{grade.feedback}</p>
              {grade.strengths && grade.strengths.length > 0 && (
                <div className={styles.feedbackSection}>
                  <span className={`${styles.feedbackLabel} ${styles.feedbackLabelGood}`}>Strengths</span>
                  <ul>
                    {grade.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {grade.improvements && grade.improvements.length > 0 && (
                <div className={styles.feedbackSection}>
                  <span className={`${styles.feedbackLabel} ${styles.feedbackLabelWarn}`}>Areas for Improvement</span>
                  <ul>
                    {grade.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Chat messages */}
          {messages.map((m, idx) => (
            <div key={idx} className={`${styles.message} ${m.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
              {m.role !== 'user' && <span className={styles.botChip}><Bot size={14} /></span>}
              <div className={styles.messageContent}>
                <MessageBody content={m.content} />
                {isLoadingChat && m.role === 'assistant' && idx === messages.length - 1 && m.content && (
                  <span className={styles.caret} aria-hidden="true" />
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator while waiting for the stream */}
          {showTyping && (
            <div className={`${styles.message} ${styles.messageAssistant}`}>
              <span className={styles.botChip}><Bot size={14} /></span>
              <div className={`${styles.messageContent} ${styles.typing}`}>
                <span /><span /><span />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className={styles.chatInputForm}>
          <input
            className={styles.chatInput}
            value={input}
            placeholder="Ask about this grade — e.g. 'Why did you deduct points for Q3?'"
            onChange={handleInputChange}
          />
          <button type="submit" className={styles.chatSubmitBtn} disabled={!input.trim() || isLoadingChat} aria-label="Send">
            <Send size={16} />
          </button>
        </form>
      </div>
    </Reveal>
  );
}
