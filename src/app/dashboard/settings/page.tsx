'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Shield,
  Palette,
  ChevronRight,
  Check,
  Link2,
} from 'lucide-react';
import styles from './page.module.css';
import { Reveal } from '@/components/motion/Reveal';
import { useClerk, useUser } from '@clerk/nextjs';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';

const TABS = [
  { id: 'account', label: 'Account', icon: User },
  { id: 'access', label: 'MVP Access', icon: Check },
  { id: 'integrations', label: 'Integrations', icon: Link2 },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'data', label: 'Data & Privacy', icon: Shield },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [saved, setSaved] = useState(false);
  const { user } = useUser();
  const { openUserProfile } = useClerk();
  
  const fullName = user?.fullName || user?.firstName || 'Teacher';
  const initials = fullName.substring(0, 2).toUpperCase();

  const [chosenFolder, setChosenFolder] = useState<string | null>(null);
  const [savingFolder, setSavingFolder] = useState(false);

  // Fetch Drive folders only while the Integrations tab is open.
  const {
    data: folderData,
    isLoading: loadingFolders,
    error: folderError,
  } = useQuery({
    queryKey: ['google-folders'],
    queryFn: async () => {
      const res = await fetch(`/api/google-folders?t=${Date.now()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to fetch folders');
      }
      const json = await res.json();
      return (json.data ?? { folders: [] }) as {
        folders: { id: string; name: string }[];
        currentSyncFolderId?: string;
      };
    },
    enabled: activeTab === 'integrations',
  });

  const folders = folderData?.folders ?? [];
  const selectedFolder = chosenFolder ?? folderData?.currentSyncFolderId ?? '';
  const fetchError = folderError ? (folderError as Error).message : null;

  async function handleSaveFolder() {
    setSavingFolder(true);
    const folder = folders.find(f => f.id === selectedFolder);
    await fetch('/api/settings/sync-folder', {
      method: 'POST',
      body: JSON.stringify({ folderId: selectedFolder, folderName: folder?.name }),
      headers: { 'Content-Type': 'application/json' }
    });
    setSavingFolder(false);
    handleSave();
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Reveal className={styles.page}>
      <div className={styles.header} data-reveal>
        <span className="page-eyebrow">Settings</span>
        <h1 className="page-title">
          Account <em className="serif-accent">settings</em>
        </h1>
        <p className={styles.subtitle}>Manage your account, organization, and preferences</p>
      </div>

      <div className={styles.layout} data-reveal>
        {/* Sidebar Tabs */}
        <nav className={styles.tabs}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
                <ChevronRight size={14} className={styles.tabArrow} />
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className={styles.content}>
          {/* Account */}
          {activeTab === 'account' && (
            <div className={styles.section} key="account">
              <h2 className={styles.sectionTitle}>Account</h2>
              <p className={styles.sectionDesc}>These details come from your signed-in account.</p>

              <div className={styles.avatarSection}>
                <div className={styles.avatar}><span>{initials}</span></div>
                <div>
                  <h3 className={styles.planName}>{fullName}</h3>
                  <p className={styles.sectionDesc}>{user?.primaryEmailAddress?.emailAddress || 'No email available'}</p>
                </div>
              </div>

              <button className={styles.saveBtn} onClick={() => openUserProfile()}>
                Manage account details
              </button>
            </div>
          )}

          {/* MVP access */}
          {activeTab === 'access' && (
            <div className={styles.section} key="access">
              <h2 className={styles.sectionTitle}>MVP Access</h2>
              <p className={styles.sectionDesc}>GradeAI does not currently have billing, subscriptions, invoices, or application-enforced usage tiers.</p>

              <div className={styles.planCard}>
                <div className={styles.planHeader}>
                  <div>
                    <span className={styles.planBadge}>Current access</span>
                    <h3 className={styles.planName}>GradeAI MVP</h3>
                    <p className={styles.planPrice}>Early access</p>
                  </div>
                </div>
                <p className={styles.sectionDesc}>
                  Use the current classroom, assignment, sync, grading, review, export, and analytics features while the product is being validated.
                </p>
              </div>
            </div>
          )}

          {/* Integrations */}
          {activeTab === 'integrations' && (
            <div className={styles.section} key="integrations">
              <h2 className={styles.sectionTitle}>Integrations</h2>
              <p className={styles.sectionDesc}>Manage your connected apps and sync preferences.</p>

              <div className={styles.formGroup} style={{ marginTop: 20 }}>
                <label className={styles.label} htmlFor="sync-folder">Target Sync Folder (Google Drive)</label>
                <p className={styles.sectionDesc} style={{ fontSize: '0.85rem', marginBottom: 12 }}>
                  GradeAI will only automatically sync Google Forms and Sheets that are inside this specific folder.
                  If you leave this blank, it will scan your entire Google Drive.
                </p>
                {fetchError && (
                  <div className={styles.integrationError} role="alert">
                    <strong>Google API Error:</strong> {fetchError}
                    <p>You may need to <a href="/api/auth/google">reconnect your Google account</a> to update permissions.</p>
                  </div>
                )}
                {loadingFolders ? (
                  <Skeleton height="var(--control-height)" radius="var(--radius-sm)" />
                ) : (
                  <Select
                    id="sync-folder"
                    className={styles.selectControl}
                    value={selectedFolder}
                    onValueChange={setChosenFolder}
                    options={[
                      { value: '', label: 'Scan entire Drive' },
                      ...folders.map((folder) => ({ value: folder.id, label: folder.name })),
                    ]}
                  />
                )}
              </div>

              <button 
                className={`${styles.saveBtn} ${saved ? styles.saveBtnSaved : ''}`}
                onClick={handleSaveFolder} 
                disabled={savingFolder || loadingFolders}
              >
                {saved ? <><Check size={16} /> Saved!</> : 'Save Sync Settings'}
              </button>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className={styles.section} key="security">
              <h2 className={styles.sectionTitle}>Security</h2>
              <p className={styles.sectionDesc}>Authentication and session security are managed by your account provider.</p>

              <div className={styles.securityItem}>
                <div>
                  <h4>Account security</h4>
                  <p>Manage your password, multi-factor authentication, signed-in devices, and account deletion from the secure account panel.</p>
                </div>
                <button className={styles.outlineBtn} onClick={() => openUserProfile()}>Open account security</button>
              </div>
            </div>
          )}

          {/* Appearance */}
          {activeTab === 'appearance' && (
            <div className={styles.section} key="appearance">
              <h2 className={styles.sectionTitle}>Appearance</h2>
              <p className={styles.sectionDesc}>Customize how GradeAI looks and feels</p>

              <div className={styles.themeSelector}>
                <h4>Theme</h4>
                <div className={styles.themeOptions}>
                  <button
                    className={`${styles.themeOption} ${styles.themeOptionActive}`}
                    onClick={() => document.documentElement.setAttribute('data-theme', 'dark')}
                  >
                    <div className={styles.themePreviewDark} />
                    <span>Dark</span>
                  </button>
                  <button
                    className={styles.themeOption}
                    onClick={() => document.documentElement.setAttribute('data-theme', 'light')}
                  >
                    <div className={styles.themePreviewLight} />
                    <span>Light</span>
                  </button>
                </div>
              </div>

              <p className={styles.sectionDesc} style={{ marginTop: 24 }}>English is the only interface language currently implemented.</p>
            </div>
          )}

          {activeTab === 'data' && (
            <div className={styles.tabContent}>
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Data Management</h3>
                <p className={styles.sectionDesc}>Manage your account data and privacy settings.</p>

                <div className={styles.formGroup} style={{ marginTop: '24px' }}>
                  <div style={{ padding: '20px', border: '1px solid var(--danger-color, #ef4444)', borderRadius: '8px', background: '#fef2f2' }}>
                    <h4 style={{ color: 'var(--danger-color, #ef4444)', margin: '0 0 8px 0' }}>Wipe All Data</h4>
                    <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#7f1d1d' }}>
                      This will permanently delete all your classrooms, students, assignments, submissions, and grades. 
                      This action cannot be undone.
                    </p>
                    <button
                      onClick={async () => {
                        const confirm1 = window.confirm("Are you ABSOLUTELY sure? This will delete EVERYTHING.");
                        if (!confirm1) return;
                        const confirm2 = window.prompt("Type 'DELETE' to confirm wiping all data:");
                        if (confirm2 === 'DELETE') {
                          try {
                            const res = await fetch('/api/settings/wipe-data', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ confirm: 'DELETE ALL MY DATA' }),
                            });
                            if (res.ok) {
                              alert('All data has been wiped successfully.');
                              window.location.reload();
                            } else {
                              alert('Failed to wipe data.');
                            }
                          } catch {
                            alert('An error occurred.');
                          }
                        }
                      }}
                      className={styles.btnDanger}
                      style={{
                        background: 'var(--danger-color, #ef4444)',
                        color: 'white',
                        border: 'none',
                        padding: '10px 20px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '500'
                      }}
                    >
                      Wipe All Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}
