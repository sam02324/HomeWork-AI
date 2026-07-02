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
  Layers,
  ArrowRight,
  ArrowUpRight,
  Check,
  Star,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import styles from './page.module.css';
import { Cursor } from '@/components/motion/Cursor';

gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);

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

const MARQUEE_ITEMS = ['AI Grading', 'Handwriting OCR', 'Custom Rubrics', 'Batch Grading', 'Student Analytics', 'Instant Feedback', 'RAG-Aware Scoring'];

const STATS = [
  { value: 50000, suffix: '+', label: 'Assignments Graded' },
  { value: 2500, suffix: '+', label: 'Teachers' },
  { value: 95, suffix: '%', label: 'Time Saved' },
  { value: 4.9, suffix: '/5', label: 'Average Rating', decimals: 1 },
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

        /* ── Stat counters ── */
        gsap.utils.toArray<HTMLElement>(q('[data-count]')).forEach((el) => {
          const target = parseFloat(el.dataset.count || '0');
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const obj = { n: 0 };
          gsap.to(obj, {
            n: target,
            duration: 1.8,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
            onUpdate: () => {
              el.textContent = decimals
                ? obj.n.toFixed(decimals)
                : Math.round(obj.n).toLocaleString('en-IN');
            },
          });
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
            <a href="#pricing">Pricing</a>
            <a href="#testimonials">Testimonials</a>
          </div>

          <div className={styles.navActions}>
            <a href="/dashboard" className={styles.signInBtn}>Sign In</a>
            <Magnetic strength={0.3}>
              <a href="/dashboard" className={styles.ctaPrimary}>
                Start Free <ArrowRight size={14} />
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
          <a href="#pricing" onClick={() => setMobileMenu(false)}>Pricing</a>
          <a href="#testimonials" onClick={() => setMobileMenu(false)}>Testimonials</a>
          <a href="/dashboard" className={styles.ctaPrimary}>
            Start Free <ArrowRight size={14} />
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
            <span>Powered by Claude AI</span>
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
            AI grading that returns 10+ hours to every teacher, every week —
            rubric-precise scores, detailed feedback, and analytics that catch
            struggling students early.
          </p>

          <div className={styles.heroCtas}>
            <div data-hero-cta>
              <Magnetic>
                <a href="/dashboard" className={styles.heroCtaPrimary}>
                  <span>Start Grading Free</span>
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
                      <path data-score-arc d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="var(--score-good)" strokeWidth="3" strokeDasharray="82, 100" strokeLinecap="round" />
                    </svg>
                    <span className={styles.previewScoreText}>82%</span>
                  </div>
                  <div className={styles.previewFeedback}>
                    <div className={styles.previewGrade}>A-</div>
                    <div className={styles.previewTags}>
                      <span className={styles.tagGood}>Strong concepts</span>
                      <span className={styles.tagWarn}>Review Carnot cycle</span>
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

      {/* ── STATS ── */}
      <section className={styles.stats}>
        <div className={styles.statsInner}>
          {STATS.map((s, i) => (
            <div key={i} className={styles.statItem} data-reveal>
              <div className={styles.statValue}>
                <span data-count={s.value} data-decimals={s.decimals || 0}>0</span>
                <span className={styles.statSuffix}>{s.suffix}</span>
              </div>
              <div className={styles.statLabel}>{s.label}</div>
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

      {/* ── PRICING ── */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <span className={styles.sectionTag} data-reveal>Pricing</span>
          <h2 className={styles.sectionTitle} data-split>
            Simple, transparent <em className={styles.serifItalic}>pricing</em>
          </h2>
          <p className={styles.sectionSubtitle} data-reveal>
            Start free, scale as you grow. No hidden fees.
          </p>

          <div className={styles.pricingGrid} data-reveal-group>
            {PRICING.map((plan, i) => (
              <div key={i} className={`${styles.pricingCard} ${plan.popular ? styles.pricingPopular : ''}`}>
                {plan.popular && <div className={styles.popularBadge}>Most Popular</div>}
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.planPrice}>
                  {plan.price}
                  <span>{plan.period}</span>
                </div>
                <p className={styles.planDesc}>{plan.desc}</p>
                <ul className={styles.planFeatures}>
                  {plan.features.map((f, fi) => (
                    <li key={fi}>
                      <Check size={14} className={styles.checkIcon} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="/dashboard" className={`${styles.planCta} ${plan.popular ? styles.planCtaPrimary : ''}`}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className={styles.testimonials} id="testimonials">
        <div className={styles.sectionInner}>
          <span className={styles.sectionTag} data-reveal>Testimonials</span>
          <h2 className={styles.sectionTitle} data-split>
            Loved by teachers across <em className={styles.serifItalic}>India</em>
          </h2>

          <div className={styles.testimonialGrid} data-reveal-group>
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} className={styles.testimonialCard}>
                <div className={styles.testimonialStars}>
                  {[...Array(5)].map((_, si) => (
                    <Star key={si} size={14} fill="var(--warning)" stroke="var(--warning)" />
                  ))}
                </div>
                <blockquote className={styles.testimonialQuote}>&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className={styles.testimonialAuthor}>
                  <div className={styles.testimonialAvatar}>{t.initials}</div>
                  <div>
                    <div className={styles.testimonialName}>{t.name}</div>
                    <div className={styles.testimonialRole}>{t.role}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaTitle} data-split>
            Get your <em className={styles.serifItalic}>evenings</em> back.
          </h2>
          <p className={styles.finalCtaSub} data-reveal>
            Join 2,500+ teachers saving 10+ hours every week
          </p>
          <div data-reveal>
            <Magnetic>
              <a href="/dashboard" className={styles.finalCtaBtn}>
                Start Grading Free <ArrowRight size={16} />
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
            <p>© 2026 GradeAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
