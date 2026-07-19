'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';
import {
  Brain,
  ClipboardList,
  PenTool,
  BarChart3,
  MessageSquare,
  ArrowRight,
  ArrowUpRight,
  Check,
  Zap,
  Menu,
  X,
  FileCheck2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import styles from './page.module.css';
import { Cursor } from '@/components/motion/Cursor';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

/* ═══ Data ═══ */
const FEATURES = [
  { icon: Brain, title: 'Rubric-Based Draft Grades', desc: 'Generate a score breakdown and feedback draft from the rubric, reference material, and strictness you provide.' },
  { icon: ClipboardList, title: 'Custom Rubrics', desc: 'Define weighted criteria, scoring levels, reference answers, and assignment-specific grading instructions.' },
  { icon: PenTool, title: 'Flexible Submissions', desc: 'Process typed answers, PDFs, and common image formats, including scanned or handwritten work.' },
  { icon: RefreshCw, title: 'Google Forms Sync', desc: 'Connect Google Drive and Sheets, then import Form responses and linked submission files into an assignment.' },
  { icon: MessageSquare, title: 'Feedback & Review', desc: 'Inspect criterion feedback, ask follow-up questions, and override the score or note before using the result.' },
  { icon: BarChart3, title: 'Class Analytics', desc: 'View real grade history, class averages, assignment status, and student performance trends from your own data.' },
];

const STEPS = [
  { num: '01', title: 'Create the Assignment', desc: 'Choose a classroom, define the maximum score, add a rubric, and attach reference material when available.' },
  { num: '02', title: 'Import Submissions', desc: 'Sync responses from Google Forms or add text, PDF, and image submissions to the assignment.' },
  { num: '03', title: 'Generate, Review, Decide', desc: 'Generate draft grades, inspect the evidence and feedback, then keep or override each result.' },
];

const MVP_FEATURES = [
  'Classrooms, students, and assignments',
  'Custom rubric and reference material',
  'Google Forms, Sheets, and Drive sync',
  'Text, PDF, and image grading workflow',
  'Teacher score overrides and review notes',
  'CSV export and performance analytics',
];

const PRINCIPLES = [
  { icon: ShieldCheck, title: 'Teacher-controlled', desc: 'GradeAI produces a draft. The teacher reviews the work and remains responsible for the final score.' },
  { icon: FileCheck2, title: 'Evidence-based', desc: 'Scores are broken down against the saved rubric so teachers can inspect where marks were awarded or deducted.' },
  { icon: RefreshCw, title: 'Built for iteration', desc: 'This is an early MVP. Real classroom feedback will shape reliability, workflows, and future pricing.' },
];

const MARQUEE_ITEMS = ['Rubric Grading', 'PDF & Image Input', 'Google Forms Sync', 'Teacher Overrides', 'Criterion Feedback', 'Student Analytics', 'CSV Export'];

const PRODUCT_FACTS = [
  { value: 'Text, PDF & image', label: 'Submission formats' },
  { value: 'Google Forms', label: 'Import workflow' },
  { value: 'Rubric-based', label: 'Scoring structure' },
  { value: 'Teacher review', label: 'Final decision' },
];

/* ═══ Canvas particle constellation — hero background ═══ */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    const COUNT = isCoarse ? 34 : 80;
    const LINK_DIST = isCoarse ? 90 : 130;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0;
    let h = 0;
    let raf = 0;
    let running = true;
    const mouse = { x: -9999, y: -9999 };

    type P = { x: number; y: number; vx: number; vy: number; r: number; accent: boolean };
    let particles: P[] = [];

    const seed = () => {
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6,
        accent: Math.random() < 0.18,
      }));
    };

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (particles.length === 0) seed();
    };

    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (const p of particles) {
        // gentle repulsion away from the cursor
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 16000 && d2 > 0.01) {
          const f = 14 / d2;
          p.vx += dx * f;
          p.vy += dy * f;
        }
        p.vx = Math.max(-0.6, Math.min(0.6, p.vx)) * 0.995;
        p.vy = Math.max(-0.6, Math.min(0.6, p.vy)) * 0.995;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist < LINK_DIST) {
            const alpha = (1 - dist / LINK_DIST) * 0.14;
            ctx.strokeStyle = a.accent || b.accent
              ? `hsla(350, 80%, 60%, ${alpha * 1.6})`
              : `hsla(0, 0%, 100%, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.accent ? 'hsla(350, 80%, 62%, 0.85)' : 'hsla(0, 0%, 100%, 0.4)';
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // only burn frames while the hero is on screen and the tab is visible
    const io = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && !document.hidden;
      if (visible && !running) {
        running = true;
        tick();
      } else if (!visible) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else {
        running = true;
        tick();
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    tick();

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.particleCanvas} aria-hidden="true" />;
}

/* ═══ Magnetic hover wrapper — desktop only ═══ */
function Magnetic({ children, strength = 0.35 }: { children: React.ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });

    const move = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener('mousemove', move);
    el.addEventListener('mouseleave', leave);
    return () => {
      el.removeEventListener('mousemove', move);
      el.removeEventListener('mouseleave', leave);
    };
  }, [strength]);

  return (
    <div ref={ref} className={styles.magnetic}>
      {children}
    </div>
  );
}

/* ═══ Page ═══ */
export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const preloaderRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stepsLineRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const q = gsap.utils.selector(pageRef);
      const mm = gsap.matchMedia();

      /* Reduced motion: kill the preloader, leave everything visible */
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(preloaderRef.current, { display: 'none' });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ── Preloader → hero intro master timeline ── */
        document.body.style.overflow = 'hidden';
        const counter = { n: 0 };
        const counterEl = q('[data-preloader-count]')[0];

        const tl = gsap.timeline({
          defaults: { ease: 'power3.out' },
          onComplete: () => {
            document.body.style.overflow = '';
          },
        });

        tl.set(preloaderRef.current, { animation: 'none' })
          .to(counter, {
            n: 100,
            duration: 1.1,
            ease: 'power2.inOut',
            onUpdate: () => {
              if (counterEl) counterEl.textContent = String(Math.round(counter.n)).padStart(3, '0');
            },
          })
          .to(q('[data-preloader-bar]'), { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, 0)
          .to(q('[data-preloader-inner]'), { yPercent: -40, autoAlpha: 0, duration: 0.45, ease: 'power2.in' }, '+=0.1')
          .to(preloaderRef.current, { yPercent: -100, duration: 0.85, ease: 'power4.inOut' }, '-=0.15')
          .set(preloaderRef.current, { display: 'none' })
          .call(() => {
            document.body.style.overflow = '';
          }, [], '<')
          /* hero reveal */
          .fromTo(
            q('[data-hero-line]'),
            { yPercent: 115 },
            { yPercent: 0, duration: 1.15, stagger: 0.12, ease: 'power4.out' },
            '-=0.45'
          )
          .from(q('[data-hero-badge]'), { y: -18, autoAlpha: 0, duration: 0.7 }, '-=0.9')
          .from(q('[data-hero-sub]'), { y: 28, autoAlpha: 0, duration: 0.8 }, '-=0.8')
          .from(q('[data-hero-cta]'), { y: 24, autoAlpha: 0, duration: 0.7, stagger: 0.09 }, '-=0.65')
          .from(previewRef.current, { y: 70, rotateX: 14, autoAlpha: 0, duration: 1.1, ease: 'power3.out' }, '-=0.6')
          .fromTo(
            q('[data-score-arc]'),
            { strokeDasharray: '0, 100' },
            { strokeDasharray: '82, 100', duration: 1.3, ease: 'power2.inOut' },
            '-=0.5'
          )
          .from(q('[data-scroll-hint]'), { autoAlpha: 0, duration: 0.8 }, '-=0.4');

        /* ── Nav: glass on scroll, hide on scroll down ── */
        const nav = navRef.current;
        if (nav) {
          ScrollTrigger.create({
            start: 24,
            onToggle: (self) => nav.classList.toggle(styles.navScrolled, self.isActive),
          });
          ScrollTrigger.create({
            start: 0,
            end: 'max',
            onUpdate: (self) => {
              if (nav.dataset.menuOpen === 'true') return;
              const hide = self.direction === 1 && self.scroll() > 160;
              nav.classList.toggle(styles.navHidden, hide);
            },
          });
        }

        /* ── Hero parallax + preview card tilt (desktop) ── */
        gsap.to(q('[data-hero-bg]'), {
          yPercent: 22,
          ease: 'none',
          scrollTrigger: { trigger: heroRef.current, start: 'top top', end: 'bottom top', scrub: true },
        });

        /* ── Section heading word reveals ── */
        gsap.utils.toArray<HTMLElement>(q('[data-split]')).forEach((el) => {
          SplitText.create(el, {
            type: 'lines,words',
            mask: 'lines',
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.words, {
                yPercent: 110,
                duration: 0.9,
                stagger: 0.035,
                ease: 'power4.out',
                scrollTrigger: { trigger: el, start: 'top 85%', once: true },
              }),
          });
        });

        /* ── Generic reveals ── */
        gsap.utils.toArray<HTMLElement>(q('[data-reveal]')).forEach((el) => {
          gsap.from(el, {
            y: 44,
            autoAlpha: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        });

        gsap.utils.toArray<HTMLElement>(q('[data-reveal-group]')).forEach((group) => {
          gsap.from(group.children, {
            y: 52,
            autoAlpha: 0,
            duration: 0.9,
            stagger: 0.1,
            ease: 'power3.out',
            scrollTrigger: { trigger: group, start: 'top 85%', once: true },
          });
        });

        /* Keep the original rolling energy while presenting factual, non-numeric MVP details. */
        gsap.utils.toArray<HTMLElement>(q('[data-roll-text]')).forEach((el) => {
          const split = SplitText.create(el, {
            type: 'chars',
            charsClass: styles.rollChar,
          });
          const roll = gsap.timeline({
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });

          roll
            .from(split.chars, {
              yPercent: 125,
              rotateX: -100,
              autoAlpha: 0,
              transformOrigin: '50% 100%',
              duration: 0.7,
              stagger: { each: 0.025, from: 'random' },
              ease: 'back.out(1.7)',
            })
            .to(
              split.chars,
              {
                opacity: 0.25,
                duration: 0.055,
                repeat: 3,
                yoyo: true,
                stagger: { each: 0.012, from: 'random' },
                ease: 'steps(1)',
              },
              '-=0.28'
            )
            .to(split.chars, { opacity: 1, duration: 0.12 });
        });

        /* ── Workflow progress line ── */
        if (stepsLineRef.current) {
          gsap.fromTo(
            stepsLineRef.current,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: 'none',
              transformOrigin: 'top center',
              scrollTrigger: {
                trigger: q('[data-steps]')[0],
                start: 'top 75%',
                end: 'bottom 55%',
                scrub: 0.6,
              },
            }
          );
        }

        /* ── Marquee drift accelerates slightly with scroll velocity ── */
        const marqueeTrack = q('[data-marquee-track]')[0];
        if (marqueeTrack) {
          const drift = gsap.to(marqueeTrack, {
            xPercent: -50,
            ease: 'none',
            duration: 28,
            repeat: -1,
          });

          // Ease the drift almost to a stop while hovered, resume on leave.
          const marquee = marqueeTrack.parentElement;
          const slow = () => gsap.to(drift, { timeScale: 0.12, duration: 0.5, ease: 'power2.out', overwrite: 'auto' });
          const resume = () => gsap.to(drift, { timeScale: 1, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
          marquee?.addEventListener('mouseenter', slow);
          marquee?.addEventListener('mouseleave', resume);

          // Scroll-velocity skew: the track shears with fast scrolls, then
          // eases back to rest (classic GSAP velocity recipe).
          const skewSetter = gsap.quickSetter(marqueeTrack, 'skewX', 'deg');
          const clampSkew = gsap.utils.clamp(-6, 6);
          const proxy = { skew: 0 };
          ScrollTrigger.create({
            onUpdate: (self) => {
              const skew = clampSkew(self.getVelocity() / -350);
              if (Math.abs(skew) > Math.abs(proxy.skew)) {
                proxy.skew = skew;
                gsap.to(proxy, {
                  skew: 0,
                  duration: 0.8,
                  ease: 'power3',
                  overwrite: true,
                  onUpdate: () => skewSetter(proxy.skew),
                });
              }
            },
          });
        }
      });

      /* ── Preview-card mouse tilt (desktop pointers only) ── */
      mm.add('(prefers-reduced-motion: no-preference) and (pointer: fine)', () => {
        const card = previewRef.current;
        const hero = heroRef.current;
        if (!card || !hero) return;
        const rx = gsap.quickTo(card, 'rotationX', { duration: 0.7, ease: 'power3' });
        const ry = gsap.quickTo(card, 'rotationY', { duration: 0.7, ease: 'power3' });
        const onMove = (e: MouseEvent) => {
          const r = hero.getBoundingClientRect();
          ry(gsap.utils.clamp(-7, 7, ((e.clientX - r.left) / r.width - 0.5) * 14));
          rx(gsap.utils.clamp(-7, 7, -((e.clientY - r.top) / r.height - 0.5) * 14));
        };
        hero.addEventListener('mousemove', onMove);
        return () => hero.removeEventListener('mousemove', onMove);
      });

      /* ── Pinned horizontal feature scroll (desktop only) ── */
      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 1024px)', () => {
        const track = trackRef.current;
        const section = featuresRef.current;
        if (!track || !section) return;
        const getDistance = () => track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: () => -getDistance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: () => `+=${getDistance()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
        gsap.from(q('[data-feature-card]'), {
          autoAlpha: 0,
          y: 60,
          stagger: 0.08,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { trigger: section, start: 'top 70%', once: true },
        });
      });

      mm.add('(prefers-reduced-motion: no-preference) and (max-width: 1023px)', () => {
        gsap.utils.toArray<HTMLElement>(q('[data-feature-card]')).forEach((card) => {
          gsap.from(card, {
            y: 48,
            autoAlpha: 0,
            duration: 0.85,
            ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 90%', once: true },
          });
        });
      });
    },
    { scope: pageRef }
  );

  /* keep the auto-hide logic honest about the open menu */
  useEffect(() => {
    const nav = navRef.current;
    if (nav) nav.dataset.menuOpen = String(mobileMenu);
    if (mobileMenu) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [mobileMenu]);

  return (
    <div className={styles.page} ref={pageRef}>
      <Cursor />
      <div className={styles.grain} aria-hidden="true" />

      {/* ── PRELOADER ── */}
      <div className={styles.preloader} ref={preloaderRef} aria-hidden="true">
        <div className={styles.preloaderInner} data-preloader-inner>
          <div className={styles.preloaderLogo}>
            <Zap size={28} />
            <span>GradeAI</span>
          </div>
          <div className={styles.preloaderCount} data-preloader-count>000</div>
          <div className={styles.preloaderBar}>
            <div className={styles.preloaderBarFill} data-preloader-bar />
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav className={styles.nav} ref={navRef}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <Zap size={22} className={styles.logoIcon} />
            <span>GradeAI</span>
          </Link>

          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#mvp-access">MVP access</a>
            <a href="#principles">Principles</a>
          </div>

          <div className={styles.navActions}>
            <a href="/dashboard" className={styles.signInBtn}>Sign In</a>
            <Magnetic strength={0.3}>
              <a href="/dashboard" className={styles.ctaPrimary}>
                Open MVP <ArrowRight size={14} />
              </a>
            </Magnetic>
          </div>

          <button
            className={styles.mobileToggle}
            onClick={() => setMobileMenu(!mobileMenu)}
            aria-label={mobileMenu ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenu}
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <div className={`${styles.mobileNav} ${mobileMenu ? styles.mobileNavOpen : ''}`}>
          <a href="#features" onClick={() => setMobileMenu(false)}>Features</a>
          <a href="#how-it-works" onClick={() => setMobileMenu(false)}>How it works</a>
          <a href="#mvp-access" onClick={() => setMobileMenu(false)}>MVP access</a>
          <a href="#principles" onClick={() => setMobileMenu(false)}>Principles</a>
          <a href="/dashboard" className={styles.ctaPrimary}>
            Open MVP <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero} ref={heroRef}>
        <div className={styles.heroBg} data-hero-bg>
          <div className={styles.aurora1} />
          <div className={styles.aurora2} />
          <ParticleField />
        </div>

        <div className={styles.heroContent}>
          <div className={styles.heroBadge} data-hero-badge>
            <Zap size={12} />
            <span>Early MVP · Built for teacher review</span>
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.lineMask}>
              <span className={styles.lineInner} data-hero-line>Grade smarter.</span>
            </span>
            <span className={styles.lineMask}>
              <span className={styles.lineInner} data-hero-line>
                Teach <em className={styles.serifItalic}>more.</em>
              </span>
            </span>
          </h1>

          <p className={styles.heroSubtitle} data-hero-sub>
            Import homework from Google Forms or add text, PDF, and image submissions.
            Generate rubric-based draft grades, review the evidence, and keep the
            final decision with the teacher.
          </p>

          <div className={styles.heroCtas}>
            <div data-hero-cta>
              <Magnetic>
                <a href="/dashboard" className={styles.heroCtaPrimary}>
                  <span>Open the MVP</span>
                  <ArrowRight size={16} />
                </a>
              </Magnetic>
            </div>
            <div data-hero-cta>
              <a href="#how-it-works" className={styles.heroCtaSecondary}>
                <span>See how it works</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>

          {/* Floating grading-result card */}
          <div className={styles.previewWrap}>
            <div className={styles.previewCard} ref={previewRef}>
              <div className={styles.previewHeader}>
                <div className={styles.previewDots}>
                  <span /><span /><span />
                </div>
                <span className={styles.previewTitle}>Illustrative grading preview</span>
              </div>
              <div className={styles.previewBody}>
                <div className={styles.previewStudent}>
                  <div className={styles.previewAvatar}>01</div>
                  <div>
                    <div className={styles.previewName}>Sample submission</div>
                    <div className={styles.previewClass}>Physics · Example data, not a customer result</div>
                  </div>
                </div>
                <div className={styles.previewScoreRow}>
                  <div className={styles.previewScoreCircle}>
                    <svg viewBox="0 0 36 36">
                      <path d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--bg-tertiary)" strokeWidth="3" />
                      <path data-score-arc d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--score-good)" strokeWidth="3" strokeDasharray="82, 100" strokeLinecap="round" />
                    </svg>
                    <span className={styles.previewScoreText}>82%</span>
                  </div>
                  <div className={styles.previewFeedback}>
                    <div className={styles.previewGrade}>Draft</div>
                    <div className={styles.previewTags}>
                      <span className={styles.tagGood}>Rubric breakdown ready</span>
                      <span className={styles.tagWarn}>Teacher review required</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.scrollHint} data-scroll-hint aria-hidden="true">
          <span>Scroll</span>
          <div className={styles.scrollHintLine} />
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack} data-marquee-track>
          {[0, 1].map((copy) => (
            <div className={styles.marqueeGroup} key={copy}>
              {MARQUEE_ITEMS.map((item, i) => (
                <span className={styles.marqueeItem} key={i}>
                  {item}
                  <span className={styles.marqueeDot} />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── VERIFIED PRODUCT FACTS ── */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          {PRODUCT_FACTS.map((fact, i) => (
            <div key={i} className={styles.statItem} data-reveal>
              <div className={styles.statValue} data-roll-text>{fact.value}</div>
              <div className={styles.statLabel}>{fact.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES — pinned horizontal scroll on desktop ── */}
      <section className={styles.features} id="features" ref={featuresRef}>
        <div className={styles.featuresHeader}>
          <span className={styles.sectionTag} data-reveal>Capabilities</span>
          <h2 className={styles.sectionTitle} data-split>
            Everything you need to grade <em className={styles.serifItalic}>smarter</em>
          </h2>
        </div>

        <div className={styles.featuresViewport}>
          <div className={styles.featuresTrack} ref={trackRef}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <article key={i} className={styles.featureCard} data-feature-card>
                  <span className={styles.featureIndex}>{String(i + 1).padStart(2, '0')}</span>
                  <div className={styles.featureIcon}>
                    <Icon size={22} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className={styles.how} id="how-it-works">
        <div className={styles.sectionInner}>
          <span className={styles.sectionTag} data-reveal>Workflow</span>
          <h2 className={styles.sectionTitle} data-split>
            From upload to insight in <em className={styles.serifItalic}>three steps</em>
          </h2>

          <div className={styles.stepsWrap} data-steps>
            <div className={styles.stepsLine}>
              <div className={styles.stepsLineFill} ref={stepsLineRef} />
            </div>
            {STEPS.map((s, i) => (
              <div key={i} className={styles.stepCard} data-reveal>
                <div className={styles.stepNum}>{s.num}</div>
                <div className={styles.stepBody}>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MVP ACCESS ── */}
      <section className={styles.pricing} id="mvp-access">
        <div className={styles.sectionInner}>
          <span className={styles.sectionTag} data-reveal>MVP access</span>
          <h2 className={styles.sectionTitle} data-split>
            Test the real workflow, <em className={styles.serifItalic}>without fake plans</em>
          </h2>
          <p className={styles.sectionSubtitle} data-reveal>
            GradeAI does not currently have subscriptions, paid tiers, or usage limits configured.
            Pricing will be published only after the MVP is validated with real users.
          </p>

          <div className={`${styles.pricingGrid} ${styles.mvpAccessGrid}`} data-reveal-group>
            <div className={`${styles.pricingCard} ${styles.mvpAccessCard}`}>
              <div className={styles.popularBadge}>Current product</div>
              <h3 className={styles.planName}>GradeAI MVP</h3>
              <div className={styles.planPrice}>Early access</div>
              <p className={styles.planDesc}>Use the working teacher workflow and evaluate it with non-critical assignments first.</p>
              <ul className={styles.planFeatures}>
                {MVP_FEATURES.map((feature) => (
                  <li key={feature}>
                    <Check size={14} className={styles.checkIcon} />
                    {feature}
                  </li>
                ))}
              </ul>
              <a href="/dashboard" className={`${styles.planCta} ${styles.planCtaPrimary}`}>
                Open GradeAI
              </a>
              <p className={styles.mvpNote}>AI output can be wrong. Review every grade before sharing it with students.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT PRINCIPLES ── */}
      <section className={styles.testimonials} id="principles">
        <div className={styles.sectionInner}>
          <span className={styles.sectionTag} data-reveal>Product principles</span>
          <h2 className={styles.sectionTitle} data-split>
            Honest by design, <em className={styles.serifItalic}>teacher-led by default</em>
          </h2>

          <div className={styles.testimonialGrid} data-reveal-group>
            {PRINCIPLES.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className={styles.testimonialCard}>
                  <div className={styles.principleIcon}><Icon size={20} /></div>
                  <h3 className={styles.principleTitle}>{principle.title}</h3>
                  <p className={styles.testimonialQuote}>{principle.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle} data-split>
            Test one assignment <em className={styles.serifItalic}>end to end.</em>
          </h2>
          <p className={styles.finalCtaSub} data-reveal>
            Start with real rubric criteria, verify every result, and decide whether the workflow fits your classroom.
          </p>
          <div data-reveal>
            <Magnetic>
              <a href="/dashboard" className={styles.finalCtaBtn}>
                Open the MVP <ArrowRight size={16} />
              </a>
            </Magnetic>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <Link href="/" className={styles.logo}>
                <Zap size={20} className={styles.logoIcon} />
                <span>GradeAI</span>
              </Link>
              <p>Teacher-reviewed AI grading for text, PDF, image, and Google Forms submission workflows.</p>
            </div>
            <div className={styles.footerCol}>
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how-it-works">Workflow</a>
              <a href="#mvp-access">MVP access</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Access</h4>
              <Link href="/sign-in">Sign in</Link>
              <Link href="/sign-up">Create account</Link>
              <a href="#principles">Product principles</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>© 2026 GradeAI · MVP software · Review AI-generated grades before use.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
