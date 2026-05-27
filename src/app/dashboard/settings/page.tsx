'use client';

import { useState } from 'react';
import {
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Globe,
  ChevronRight,
  Camera,
  Mail,
  Phone,
  MapPin,
  Check,
  ExternalLink,
} from 'lucide-react';
import styles from './page.module.css';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your account, organization, and preferences</p>
      </div>

      <div className={styles.layout}>
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
          {/* Profile */}
          {activeTab === 'profile' && (
            <div className={styles.section} key="profile">
              <h2 className={styles.sectionTitle}>Profile Information</h2>
              <p className={styles.sectionDesc}>Update your personal details and teaching profile</p>

              <div className={styles.avatarSection}>
                <div className={styles.avatar}>
                  <span>RK</span>
                </div>
                <div className={styles.avatarActions}>
                  <button className={styles.avatarBtn}>
                    <Camera size={14} />
                    Change Photo
                  </button>
                  <p className={styles.avatarHint}>JPG or PNG, max 2MB</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Full Name</label>
                  <input className={styles.input} defaultValue="Rajesh Kumar" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Display Name</label>
                  <input className={styles.input} defaultValue="Rajesh Sir" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Mail size={14} /> Email
                  </label>
                  <input className={styles.input} defaultValue="rajesh.kumar@allencareer.in" type="email" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Phone size={14} /> Phone
                  </label>
                  <input className={styles.input} defaultValue="+91 98765 43210" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Subject Expertise</label>
                  <input className={styles.input} defaultValue="Physics" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <MapPin size={14} /> Location
                  </label>
                  <input className={styles.input} defaultValue="Kota, Rajasthan" />
                </div>
              </div>

              <div className={styles.formGroup} style={{ marginTop: 20 }}>
                <label className={styles.label}>Bio</label>
                <textarea
                  className={styles.textarea}
                  rows={3}
                  defaultValue="Senior Physics Teacher with 12+ years of experience in IIT-JEE coaching. Specializing in Mechanics and Thermodynamics."
                />
              </div>

              <button className={styles.saveBtn} onClick={handleSave}>
                {saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Organization */}
          {activeTab === 'organization' && (
            <div className={styles.section} key="org">
              <h2 className={styles.sectionTitle}>Organization</h2>
              <p className={styles.sectionDesc}>Manage your coaching institute or school settings</p>

              <div className={styles.orgCard}>
                <div className={styles.orgLogo}>AC</div>
                <div>
                  <h3 className={styles.orgName}>Allen Career Institute</h3>
                  <p className={styles.orgMeta}>Kota, Rajasthan · 45 Teachers · Pro Plan</p>
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Organization Name</label>
                  <input className={styles.input} defaultValue="Allen Career Institute" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    <Globe size={14} /> Website
                  </label>
                  <input className={styles.input} defaultValue="https://allen.ac.in" />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Organization Type</label>
                  <select className={styles.select}>
                    <option>Coaching Institute</option>
                    <option>School</option>
                    <option>College / University</option>
                    <option>Individual Tutor</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Board / Curriculum</label>
                  <select className={styles.select}>
                    <option>CBSE</option>
                    <option>ICSE</option>
                    <option>State Board</option>
                    <option>IB</option>
                    <option>JEE / NEET Prep</option>
                  </select>
                </div>
              </div>

              <button className={styles.saveBtn} onClick={handleSave}>
                {saved ? <><Check size={16} /> Saved!</> : 'Save Changes'}
              </button>
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div className={styles.section} key="billing">
              <h2 className={styles.sectionTitle}>Billing & Plan</h2>
              <p className={styles.sectionDesc}>Manage your subscription and usage</p>

              <div className={styles.planCard}>
                <div className={styles.planHeader}>
                  <div>
                    <span className={styles.planBadge}>Current Plan</span>
                    <h3 className={styles.planName}>Pro Plan</h3>
                    <p className={styles.planPrice}>₹999<span>/month</span></p>
                  </div>
                  <button className={styles.upgradeBtn}>Upgrade to Institute</button>
                </div>

                <div className={styles.usageGrid}>
                  <div className={styles.usageItem}>
                    <div className={styles.usageLabel}>Gradings Used</div>
                    <div className={styles.usageBar}>
                      <div className={styles.usageFill} style={{ width: '68%' }} />
                    </div>
                    <div className={styles.usageText}>1,360 / 2,000</div>
                  </div>
                  <div className={styles.usageItem}>
                    <div className={styles.usageLabel}>Classes</div>
                    <div className={styles.usageBar}>
                      <div className={styles.usageFill} style={{ width: '30%' }} />
                    </div>
                    <div className={styles.usageText}>6 / 20</div>
                  </div>
                  <div className={styles.usageItem}>
                    <div className={styles.usageLabel}>Students</div>
                    <div className={styles.usageBar}>
                      <div className={styles.usageFill} style={{ width: '42%' }} />
                    </div>
                    <div className={styles.usageText}>210 / 500</div>
                  </div>
                </div>
              </div>

              <h3 className={styles.invoiceTitle}>Recent Invoices</h3>
              <div className={styles.invoiceList}>
                {[
                  { date: 'May 1, 2026', amount: '₹999', status: 'Paid' },
                  { date: 'Apr 1, 2026', amount: '₹999', status: 'Paid' },
                  { date: 'Mar 1, 2026', amount: '₹999', status: 'Paid' },
                ].map((inv, i) => (
                  <div key={i} className={styles.invoiceRow}>
                    <span>{inv.date}</span>
                    <span>{inv.amount}</span>
                    <span className={styles.invoicePaid}>{inv.status}</span>
                    <button className={styles.invoiceLink}>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className={styles.section} key="notif">
              <h2 className={styles.sectionTitle}>Notification Preferences</h2>
              <p className={styles.sectionDesc}>Choose what you want to be notified about</p>

              <div className={styles.notifList}>
                {[
                  { label: 'Grading Complete', desc: 'When a batch of assignments finishes grading', default: true },
                  { label: 'New Submissions', desc: 'When students submit assignments', default: true },
                  { label: 'At-Risk Alerts', desc: 'When a student is flagged as at-risk', default: true },
                  { label: 'Weekly Reports', desc: 'Weekly analytics summary for your classes', default: false },
                  { label: 'Product Updates', desc: 'New features and platform updates', default: false },
                ].map((n, i) => (
                  <div key={i} className={styles.notifItem}>
                    <div>
                      <h4>{n.label}</h4>
                      <p>{n.desc}</p>
                    </div>
                    <label className={styles.toggle}>
                      <input type="checkbox" defaultChecked={n.default} />
                      <span className={styles.toggleSlider} />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className={styles.section} key="security">
              <h2 className={styles.sectionTitle}>Security</h2>
              <p className={styles.sectionDesc}>Keep your account safe and secure</p>

              <div className={styles.securityItem}>
                <div>
                  <h4>Password</h4>
                  <p>Last changed 3 months ago</p>
                </div>
                <button className={styles.outlineBtn}>Change Password</button>
              </div>
              <div className={styles.securityItem}>
                <div>
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <button className={styles.outlineBtn}>Enable 2FA</button>
              </div>
              <div className={styles.securityItem}>
                <div>
                  <h4>Active Sessions</h4>
                  <p>2 devices currently logged in</p>
                </div>
                <button className={styles.outlineBtn}>View Sessions</button>
              </div>
              <div className={styles.dangerZone}>
                <h4>Danger Zone</h4>
                <p>Once you delete your account, there is no going back.</p>
                <button className={styles.dangerBtn}>Delete Account</button>
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

              <div className={styles.formGroup} style={{ marginTop: 24 }}>
                <label className={styles.label}>Language</label>
                <select className={styles.select}>
                  <option>English</option>
                  <option>हिन्दी (Hindi)</option>
                  <option>தமிழ் (Tamil)</option>
                  <option>తెలుగు (Telugu)</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
