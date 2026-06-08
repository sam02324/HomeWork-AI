'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Bot, User, FileText, Loader2, Save } from 'lucide-react';
import { useAssignment, useAssignmentSubmissions } from '@/lib/api-client';
import styles from './page.module.css';

export default function InteractiveReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const subId = params.subId as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [overrideScore, setOverrideScore] = useState('');
  const [teacherNote, setTeacherNote] = useState('');

  // 1. Fetch Assignment Details
  const { data: assignmentData, error: assignmentError, isLoading: assignmentLoading } = useAssignment(id);

  // 2. Fetch Submissions
  const { data: submissionsData, error: submissionsError, isLoading: submissionsLoading } = useAssignmentSubmissions(id);

  const submission = submissionsData?.find((s: any) => s.id === subId);
  const grade = submission?.grade;

  // 3. Setup AI Chat
  const [messages, setMessages] = useState<any[]>((grade?.chatHistory as any[]) || []);
  const [input, setInput] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Sync initial messages once grade is loaded
  useEffect(() => {
    if (grade?.chatHistory) {
      setMessages(grade.chatHistory);
    }
  }, [grade]);

  const handleInputChange = (e: any) => setInput(e.target.value);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!input.trim() || isLoadingChat) return;

    const userMessage = { role: 'user', content: input };
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

      let assistantMessage = { role: 'assistant', content: '' };
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

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load override states if present
  useEffect(() => {
    if (grade) {
      setOverrideScore(grade.teacherOverrideScore ? grade.teacherOverrideScore.toString() : grade.totalScore);
      setTeacherNote(grade.teacherNote || '');
    }
  }, [grade]);

  // Handle saving manual score override
  const handleSaveOverride = async () => {
    if (!grade) return;
    try {
      const res = await fetch(`/api/grades/${grade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherOverrideScore: parseFloat(overrideScore),
          teacherNote,
          reviewedByTeacher: true
        })
      });
      if (res.ok) alert('Score updated successfully');
      else alert('Failed to update score');
    } catch (e) {
      console.error(e);
      alert('Error saving score');
    }
  };

  if (assignmentError) {
    return <div className={styles.error}>Error loading assignment: {String(assignmentError)}</div>;
  }

  if (submissionsError) {
    return <div className={styles.error}>Error loading submissions: {String(submissionsError)}</div>;
  }

  if (assignmentLoading || submissionsLoading) {
    return <div className={styles.loading}>Loading review...</div>;
  }

  if (!assignmentData || !submissionsData) {
    return <div className={styles.loading}>Initializing data...</div>;
  }

  if (!submission) {
    return <div className={styles.error}>Submission not found</div>;
  }

  const documentUrl = submission.fileUrl 
    || (submission.googleDriveFileId ? `https://drive.google.com/file/d/${submission.googleDriveFileId}/view` : null);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => router.push(`/dashboard/assignments/${id}`)} className={styles.backBtn}>
            <ArrowLeft size={16} /> Back to Assignment
          </button>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>{submission.student?.name}'s Submission</h1>
          </div>
          <p className={styles.subtitle}>Roll No: {submission.student?.rollNumber || 'N/A'}</p>
        </div>
      </div>

      <div className={styles.twoPaneContainer}>
        {/* Left Pane: Document & Score Override */}
        <div className={styles.leftPane}>
          <div className={styles.panelCard}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}><FileText size={18} /> Document Viewer</h3>
              <a href={documentUrl || '#'} target="_blank" rel="noreferrer" className={styles.externalLink}>
                Open in new tab
              </a>
            </div>
            <div className={styles.documentContainer}>
              {documentUrl ? (
                <iframe src={documentUrl} className={styles.iframe} title="Submission Document" />
              ) : (
                <div className={styles.emptyDocument}>
                  <p>No document URL available.</p>
                  {submission.textContent && (
                    <div className={styles.textContentViewer}>
                      <h4>Extracted Text Content:</h4>
                      <pre>{submission.textContent}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.panelCard} style={{ marginTop: '24px' }}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Manual Override</h3>
            </div>
            <div className={styles.overrideForm}>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Final Score (out of {assignmentData.maxScore})</label>
                  <input 
                    type="number" 
                    value={overrideScore} 
                    onChange={e => setOverrideScore(e.target.value)} 
                    className={styles.input}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Teacher Note (Internal)</label>
                  <input 
                    type="text" 
                    value={teacherNote} 
                    onChange={e => setTeacherNote(e.target.value)} 
                    className={styles.input}
                  />
                </div>
              </div>
              <button onClick={handleSaveOverride} className={styles.saveBtn}>
                <Save size={14} /> Save Override
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: AI Chat */}
        <div className={styles.rightPane}>
          <div className={styles.panelCard} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}><Bot size={18} /> Grading Assistant</h3>
              <div className={styles.scoreBadge}>
                AI Score: {grade?.totalScore} / {assignmentData.maxScore}
              </div>
            </div>

            <div className={styles.chatContainer}>
              {/* AI Rationale (Initial context) */}
              {grade?.aiRationale && messages.length === 0 && (
                <div className={styles.message + ' ' + styles.messageAssistant}>
                  <div className={styles.messageIcon}><Bot size={16} /></div>
                  <div className={styles.messageContent}>
                    <strong>Grading Rationale:</strong>
                    <p style={{ whiteSpace: 'pre-wrap', marginTop: '8px' }}>{grade.aiRationale}</p>
                  </div>
                </div>
              )}

              {/* Chat Messages */}
              {messages.map((m, idx) => (
                <div key={idx} className={`${styles.message} ${m.role === 'user' ? styles.messageUser : styles.messageAssistant}`}>
                  <div className={styles.messageIcon}>
                    {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className={styles.messageContent}>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{m.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className={styles.chatInputForm}>
              <input
                className={styles.chatInput}
                value={input}
                placeholder="Ask about the grade, e.g. 'Why did you deduct points for X?'"
                onChange={handleInputChange}
              />
              <button type="submit" className={styles.chatSubmitBtn} disabled={!input.trim()}>
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
