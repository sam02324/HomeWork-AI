'use client';

import { useState, useEffect } from 'react';
import {
  Brain,
  ClipboardList,
  PenTool,
  BarChart3,
  MessageSquare,
  Layers,
  ArrowRight,
  Play,
  Check,
  Star,
  Zap,
  Shield,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import styles from './page.module.css';

/* ═══ Animated Counter ═══ */
function Counter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 2000;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end]);
  return <>{count.toLocaleString()}{suffix}</>;
}

/* ═══ Data ═══ */
const FEATURES = [
  { icon: Brain, title: 'AI-Powered Grading', desc: 'Auto-grade essays, short answers, and problem sets with Claude AI. Detailed mistake analysis and improvement suggestions.' },
  { icon: ClipboardList, title: 'Custom Rubrics', desc: 'Build detailed rubrics with weighted criteria, grading strictness levels, and point-based scoring systems.' },
  { icon: PenTool, title: 'Handwriting Recognition', desc: 'Upload handwritten assignments — our OCR reads and grades them automatically. Works with Hindi and English.' },
  { icon: BarChart3, title: 'Student Analytics', desc: 'Track performance trends, detect weak topics, predict struggling students, and generate improvement roadmaps.' },
  { icon: MessageSquare, title: 'Instant Feedback', desc: 'Every submission gets detailed feedback — mistake explanations, concept gaps, and actionable tips.' },
  { icon: Layers, title: 'Batch Grading', desc: 'Grade 30+ submissions in minutes. Upload once, get all results with a single click.' },
];

const STEPS = [
  { num: '01', title: 'Upload & Configure', desc: 'Upload assignments, set your rubric, add reference answers, and choose grading strictness.' },
  { num: '02', title: 'AI Grades Instantly', desc: 'Claude AI grades each submission with detailed feedback, score breakdowns, and concept analysis.' },
  { num: '03', title: 'Review & Improve', desc: 'Review results, override if needed, and track student analytics to drive improvement.' },
];

const PRICING = [
  {
    name: 'Free',
    price: '₹0',
    period: '/month',
    desc: 'For individual tutors trying it out',
    features: ['50 gradings/month', '1 classroom', '20 students', 'Basic analytics', 'PDF & text submissions'],
    cta: 'Start Free',
    popular: false,
  },
  {
    name: 'Pro',
    price: '₹999',
    period: '/month',
    desc: 'For teachers & small coaching centres',
    features: ['2,000 gradings/month', '20 classrooms', '500 students', 'Full analytics & heatmaps', 'RAG-aware grading', 'Rubric templates', 'Handwriting recognition', 'Priority support'],
    cta: 'Start 14-Day Trial',
    popular: true,
  },
  {
    name: 'Institute',
    price: '₹4,999',
    period: '/month',
    desc: 'For coaching institutes & schools',
    features: ['10,000 gradings/month', 'Unlimited classrooms', '2,000 students', 'API access', 'White-label option', 'Dedicated support', 'Custom AI tuning', 'SSO & admin panel'],
    cta: 'Contact Sales',
    popular: false,
  },
];

const TESTIMONIALS = [
  { quote: 'Reduced my grading time from 4 hours to 20 minutes daily. The AI feedback is better than what I used to write myself.', name: 'Rajesh Kumar', role: 'Physics Teacher, Allen Career Institute', initials: 'RK' },
  { quote: 'The analytics helped me identify struggling students before they failed. Three students who were at-risk improved by 30% in two months.', name: 'Priya Mehta', role: 'Maths Faculty, FIITJEE', initials: 'PM' },
  { quote: 'Best ₹999 I spend every month. My coaching centre runs smoother and parents love the detailed reports.', name: 'Amit Sharma', role: 'Owner, Sharma Classes Kota', initials: 'AS' },
];

/* ═══ Page ═══ */
export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);

  return (
    <div className={styles.page}>
      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            <Zap size={22} className={styles.logoIcon} />
            <span>GradeAI</span>
          </a>

          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
          </div>

          <div className={styles.navActions}>
            <a href="/dashboard" className={styles.signInBtn}>Sign In</a>
            <a href="/dashboard" className={styles.ctaPrimary}>Start Free <ArrowRight size={14} /></a>
          </div>

          <button className={styles.mobileToggle} onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenu && (
          <div className={styles.mobileNav}>
            <a href="#features" onClick={() => setMobileMenu(false)}>Features</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)}>Pricing</a>
            <a href="/dashboard" className={styles.ctaPrimary}>Start Free</a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.blob1} />
          <div className={styles.blob2} />
          <div className={styles.blob3} />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <Zap size={12} />
            <span>AI-Powered Education Platform</span>
          </div>

          <h1 className={styles.heroTitle}>
            Grade <span className={styles.gradientText}>Smarter.</span><br />
            Teach More.
          </h1>

          <p className={styles.heroSubtitle}>
            AI-powered grading that saves teachers 10+ hours every week.<br />
            Intelligent rubric-based scoring, detailed feedback, and student analytics.
          </p>

          <div className={styles.heroCtas}>
            <a href="/dashboard" className={styles.heroCtaPrimary}>
              <span>Start Grading Free</span>
              <ArrowRight size={16} />
            </a>
            <a href="#how-it-works" className={styles.heroCtaSecondary}>
              <Play size={16} />
              <span>Watch Demo</span>
            </a>
          </div>

          {/* Floating Preview Card */}
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewDots}>
                <span /><span /><span />
              </div>
              <span className={styles.previewTitle}>Grading Result</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewStudent}>
                <div className={styles.previewAvatar}>PS</div>
                <div>
                  <div className={styles.previewName}>Priya Sharma</div>
                  <div className={styles.previewClass}>12th Physics — Thermodynamics Test</div>
                </div>
              </div>
              <div className={styles.previewScoreRow}>
                <div className={styles.previewScoreCircle}>
                  <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                    <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--score-good)" strokeWidth="3" strokeDasharray="82, 100" strokeLinecap="round" />
                  </svg>
                  <span className={styles.previewScoreText}>82%</span>
                </div>
                <div className={styles.previewFeedback}>
                  <div className={styles.previewGrade}>A-</div>
                  <div className={styles.previewTags}>
                    <span className={styles.tagGood}>✓ Strong concepts</span>
                    <span className={styles.tagWarn}>△ Review Carnot cycle</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          {[
            { value: 50000, suffix: '+', label: 'Assignments Graded' },
            { value: 2500, suffix: '+', label: 'Teachers' },
            { value: 95, suffix: '%', label: 'Time Saved' },
            { value: 4.9, suffix: '★', label: 'Rating', isDecimal: true },
          ].map((s, i) => (
            <div key={i} className={styles.statItem}>
              <div className={styles.statValue}>
                {s.isDecimal ? '4.9' : <Counter end={s.value} />}{s.suffix}
              </div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Everything you need to <span className={styles.gradientText}>grade smarter</span></h2>
          <p className={styles.sectionSubtitle}>From upload to analytics — one platform for the entire grading workflow</p>

          <div className={styles.featureGrid}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className={styles.featureCard}>
                  <div className={styles.featureIcon}>
                    <Icon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>How it works</h2>
          <p className={styles.sectionSubtitle}>Three simple steps to transform your grading</p>

          <div className={styles.stepsGrid}>
            {STEPS.map((s, i) => (
              <div key={i} className={styles.stepCard}>
                <div className={styles.stepNum}>{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                {i < STEPS.length - 1 && <ChevronRight size={20} className={styles.stepArrow} />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionSubtitle}>Start free, scale as you grow. No hidden fees.</p>

          <div className={styles.pricingGrid}>
            {PRICING.map((plan, i) => (
              <div key={i} className={`${styles.pricingCard} ${plan.popular ? styles.pricingPopular : ''}`}>
                {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  {plan.price}<span>{plan.period}</span>
                </div>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f, fi) => (
                    <li key={fi}><Check size={14} className={styles.checkIcon} />{f}</li>
                  ))}
                </ul>
                <button className={`${styles.planCta} ${plan.popular ? styles.planCtaPrimary : ''}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={styles.testimonials} id="testimonials">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Loved by teachers across India</h2>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className={styles.testimonialCard}>
                <div className={styles.testimonialStars}>
                  {[...Array(5)].map((_, si) => <Star key={si} size={14} fill="var(--warning)" stroke="var(--warning)" />)}
                </div>
                <p className={styles.testimonialQuote}>&ldquo;{t.quote}&rdquo;</p>
                <div className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.initials}</div>
                  <div>
                    <div className={styles.testimonialName}>{t.name}</div>
                    <div className={styles.testimonialRole}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2>Ready to transform your grading?</h2>
          <p>Join 2,500+ teachers saving 10+ hours every week</p>
          <a href="/dashboard" className={styles.finalCtaBtn}>
            Start Grading Free <ArrowRight size={16} />
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <a href="/" className={styles.logo}>
                <Zap size={20} className={styles.logoIcon} />
                <span>GradeAI</span>
              </a>
              <p>AI-powered grading for the modern educator. Save time, improve outcomes.</p>
            </div>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#">Roadmap</a>
              <a href="#">API Docs</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#">About</a>
              <a href="#">Careers</a>
              <a href="#">Blog</a>
              <a href="#">Contact</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Legal</h4>
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Data Processing</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 GradeAI. Built with ♥ in India.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
