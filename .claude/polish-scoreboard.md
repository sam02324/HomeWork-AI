# GradeAI Frontend Polish Scoreboard

Rubric (/10): choreographed entrance · micro-interactions · 60fps transform/opacity-only ·
consistent signature easing · reduced-motion fallback · flawless at 390px ·
type & depth polish · zero jank on load.

Note: only public pages (landing, sign-in) can be screenshotted by
scripts/verify-landing.mjs — dashboard surfaces sit behind Clerk auth and are
scored from code inspection + prior verified screenshots of this session's work.

| Surface | Score | Last change |
|---|---|---|
| landing | 7.5 | baseline — preloader, particle hero, pinned scroll, cursor, magnetic CTAs; missing film grain, velocity skew |
| dashboard home | 6.0 | baseline — Reveal/CountUp entrances; no odometer, no card sheen, charts don't draw on |
| assignments list | 5.5 | baseline — Reveal entrance; no row cascade on filter, no card sheen |
| assignments new | 5.5 | baseline — stepper works; step content switches without transition |
| assignment detail | 6.0 | iter 4 — tbody row cascade via stagger-children, row hover tint + accent edge, press physics on all 5 action buttons |
| review chat | 6.5 | baseline — glass bubbles, typing dots, clean markdown; no bubble spring, no ring sweep, no streaming caret |
| classrooms list | 5.5 | baseline — Reveal entrance only |
| classroom detail | 5.0 | baseline — static tables, plain modals |
| students | 5.5 | baseline — charts render without draw-on |
| analytics | 5.5 | baseline — charts render without draw-on |
| settings | 6.5 | iter 3 — tab-switch child cascade (nth-child 50ms steps), accent pill grows on active tab, hover nudge, save button press spring |
| knowledge | 6.5 | iter 2 — bespoke orbiting-book SVG (idle float + counter-rotating nodes), per-card reveal cascade, hover sheen, button press physics |
| sign-in | 7.0 | iter 1 — aurora backdrop + grain, staggered brand→card→tagline entrance, brand-matched Clerk accent, reduced-motion safe |

## Iteration log
- iter 4: assignment detail 5.0 → 6.0 — submissions tbody uses the global stagger-children
  utility (async rows cascade on data arrival), rows get hover tint + inset accent edge,
  :active scale(0.96) on syncBtn/gradeBtn/uploadBtn/viewSubBtn/reviewBtn. Added the missing
  prefers-reduced-motion guard to .stagger-children in globals.css (benefits all pages).
  Verified: lint/tsc/build clean + landing regression screenshot (zero console problems,
  zero overflow). Remaining for ≥9: modal entrances, alert() → toast flows, sync banner motion.
- iter 3: settings 5.0 → 6.5 — section children cascade on tab switch (fadeInUp with
  50ms nth-child steps), ::before accent pill scaleY-grows on the active tab, non-active
  tabs nudge right on hover, saveBtn :active scale(0.97). Reduced-motion kills all of it.
  Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: save-state morph
  (spinner→checkmark draw-on), toggle/switch micro-motion, sliding pill BETWEEN tabs.
- iter 2: knowledge 4.5 → 6.5 — replaced flat gradient icon with bespoke SVG illustration
  (open book, glow, two counter-rotating orbit node groups, 6s idle float), feature cards now
  data-reveal staggered via existing Reveal primitive, one-shot diagonal sheen on card hover,
  notify button :active spring. Reduced-motion disables all of it. Auth-walled page: verified
  via lint/tsc/prod build (screenshots unavailable behind Clerk). Remaining for ≥9: page
  transition, richer empty-state states, save-state morph on notify.
- iter 1: sign-in 3.5 → 7.0 — aurora blobs (26s/32s transform-only drift), film-grain overlay,
  choreographed rise entrance (brand 0ms → card 120ms → tagline 220ms, signature cubic-bezier),
  Clerk colorPrimary matched to accent. Verified: screenshots desktop+mobile clean, no overflow,
  no new console errors, lint/tsc clean. Remaining for ≥9: card glass treatment (Clerk widget is
  stock white), hover micro-interactions, pointer-reactive aurora.
