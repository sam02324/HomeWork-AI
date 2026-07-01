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
| assignment detail | 5.0 | baseline — restyled but plain modals, alert() flows, static table |
| review chat | 6.5 | baseline — glass bubbles, typing dots, clean markdown; no bubble spring, no ring sweep, no streaming caret |
| classrooms list | 5.5 | baseline — Reveal entrance only |
| classroom detail | 5.0 | baseline — static tables, plain modals |
| students | 5.5 | baseline — charts render without draw-on |
| analytics | 5.5 | baseline — charts render without draw-on |
| settings | 5.0 | baseline — tab switches are instant cuts |
| knowledge | 4.5 | baseline — placeholder page, minimal motion |
| sign-in | 7.0 | iter 1 — aurora backdrop + grain, staggered brand→card→tagline entrance, brand-matched Clerk accent, reduced-motion safe |

## Iteration log
- iter 1: sign-in 3.5 → 7.0 — aurora blobs (26s/32s transform-only drift), film-grain overlay,
  choreographed rise entrance (brand 0ms → card 120ms → tagline 220ms, signature cubic-bezier),
  Clerk colorPrimary matched to accent. Verified: screenshots desktop+mobile clean, no overflow,
  no new console errors, lint/tsc clean. Remaining for ≥9: card glass treatment (Clerk widget is
  stock white), hover micro-interactions, pointer-reactive aurora.
