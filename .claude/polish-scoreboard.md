# GradeAI Frontend Polish Scoreboard

Rubric (/10): choreographed entrance · micro-interactions · 60fps transform/opacity-only ·
consistent signature easing · reduced-motion fallback · flawless at 390px ·
type & depth polish · zero jank on load.

Note: only public pages (landing, sign-in) can be screenshotted by
scripts/verify-landing.mjs — dashboard surfaces sit behind Clerk auth and are
scored from code inspection + prior verified screenshots of this session's work.

| Surface | Score | Last change |
|---|---|---|
| landing | 8.0 | iter 15 — marquee scroll-velocity skew + hover slow-down (grain already shipped); verified clean screenshots both viewports |
| dashboard home | 7.0 | iter 19 — quick-action hover lift + press physics, grading shimmer reduced-motion guard (on iter 11's sheens/slides) |
| assignments list | 7.0 | iter 20 — dropdown pop, overlay fade, modal spring (on iter 6's cascade/skeletons/edges) |
| assignments new | 6.5 | iter 9 — step-switch child cascade, step circle pop on active/complete, press physics on back/next/publish |
| assignment detail | 7.0 | iter 18 — all 6 alert()s replaced with animated toasts + success toasts on rubric/reference saves |
| review chat | 7.5 | iter 13 — directional bubble springs (back-ease), streaming caret at stream head, score-ring sweep on load |
| classrooms list | 6.5 | iter 8 — card hover sheen, dropdown pop, modal spring, CountUp student counts, press physics |
| classroom detail | 7.0 | iter 21 — bespoke floating empty-state illustration + full press physics (on iter 5's CountUp/cascade/modal pop) |
| students | 6.5 | iter 7 — CountUp stats, tuned chart draw-on (area 900ms, radar +200ms stagger), history row cascade + hover accent edge |
| analytics | 6.5 | iter 10 — CountUp on 3 stats, list-row cascade in both cards, stat-card hover sheen + lift |
| settings | 7.0 | iter 16 — save buttons morph to success green with checkmark draw-on (adds to iter 3's tab cascade + pill + press physics) |
| knowledge | 7.0 | iter 17 — notify button save-state morph (success green + checkmark draw-on, disabled after) on top of iter 2's illustration/cascade/sheen |
| sign-in | 7.0 | iter 1 — aurora backdrop + grain, staggered brand→card→tagline entrance, brand-matched Clerk accent, reduced-motion safe |

## Iteration log
- iter 21: classroom detail 6.5 → 7.0 — empty student table now shows a bespoke
  floating graduation-cap SVG (glow + accent stroke, 6s idle float) instead of bare
  text, and press physics extended to addBtn/submitBtn. Reduced-motion stills the
  float. Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: per-student
  row score mini-bars, header stat odometer.
- iter 20: assignments list 6.5 → 7.0 — 3-dot dropdown pops from top-right, rename/
  delete modals spring in behind a 0.2s overlay fade (same signature patterns as
  classrooms). Reduced-motion guard appended. Auth-walled: verified via lint/tsc/prod
  build. Remaining for ≥9: tableWrap card sheen, sort transitions, bulk-action motion.
- iter 19: dashboard home 6.5 → 7.0 — quick-action buttons get hover lift + :active
  press physics (last interactive elements without motion), grading-fill shimmer now
  respects reduced-motion. Auth-walled: verified via lint/tsc/prod build. Remaining
  for ≥9: odometer digits, chart draw-on for the trend module, page transition.
- iter 18: assignment detail 6.5 → 7.0 — replaced all 6 browser alert()s with the
  app's animated Toast system (slide + overshoot) and added success toasts when the
  rubric or reference answers save (previously closed silently). Feedback now matches
  the design language instead of breaking immersion with native dialogs. Auth-walled:
  verified via lint/tsc/prod build. Remaining for ≥9: score cell count-up on grade
  arrival, upload progress motion.
- iter 17: knowledge 6.5 → 7.0 — notify CTA now has real feedback: click morphs it to
  success green ("You're on the list") with the checkmark drawing itself on, then
  disables. Reduced-motion skips the draw. Auth-walled: verified via lint/tsc/prod
  build. Remaining for ≥9: page transition, upload-zone preview interactions when the
  feature ships.
- iter 16: settings 6.5 → 7.0 — all three save buttons get the save-state morph:
  background morphs to success green with glow and the lucide checkmark draws itself
  on via stroke-dashoffset (0.45s). Reduced-motion skips the draw. Auth-walled:
  verified via lint/tsc/prod build. Remaining for ≥9: real saving spinner phase,
  toggle micro-motion, billing/notification section polish.
- iter 15: landing 7.5 → 8.0 — marquee track now shears with scroll velocity (clamped
  ±6°, eases back via power3) and slows to 12% speed on hover, resuming on leave.
  Film grain was already present. Verified: zero console problems, zero overflow at
  1440px + 390px. Remaining for ≥9: scroll-story section depth pass, hero flow-field
  upgrade, footer link micro-motion.
- iter 14 (shell): sidebar active pill — GSAP pill slides + stretches between nav items
  on route change (scaleY 1.2 during travel, power3 settle), gsap.set on first paint
  (no entrance flicker), reduced-motion snaps instead of sliding. Active item's static
  background moved to the pill so travel is visible. Lifts every dashboard surface;
  no individual rescore (shell-level).
- iter 13: review chat 6.5 → 7.5 — user bubbles spring in from the right, assistant
  from the left (0.45s back-ease overshoot), a blinking accent caret rides the stream
  head while the reply streams, and the score ring sweeps from 0 to the score on load
  (from-only keyframe animating to the inline dasharray). Reduced-motion kills all
  three. Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: save-state
  morph on the override button, grade-letter rotateX flip, composer focus glow.
- iter 12: assignment detail 6.0 → 6.5 — the PreGrade/EditDetails/Reference modals
  now spring in via modalPop with a 0.2s overlay fade (previously appeared instantly);
  sync banner keeps its slideDown. Reduced-motion guard covers overlay/modal/banner.
  Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: alert() → toast
  flows, upload progress motion, score cell count-up on grade arrival.
- iter 11: dashboard home 6.0 → 6.5 — stat cards get the one-shot hover sheen (had
  glass highlight but no motion), recent-assignment cards slide right 4px with the
  inset accent edge on hover. assignmentList cascade already existed. Reduced-motion
  guard for the sheen. Auth-walled: verified via lint/tsc/prod build. Remaining for
  ≥9: odometer digits on stats, grading-progress shimmer, quick-action micro-motion.
- iter 10: analytics 5.5 → 6.5 — Total Students / Total Assignments / Overall Average
  now CountUp (Time Saved stays text: fractional hrs), status + classroom list rows
  cascade via stagger-children, stat cards get hover sheen + lift + border highlight.
  Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: real charts with
  draw-on (page is list-based today), animated status bars, empty-state illustration.
- iter 9: assignments new 5.5 → 6.5 — step content now cascades its children on step
  switch (60ms steps, keyed remount already existed), step circles pop (0.85→1.12→1
  overshoot) when becoming active or complete, back/next/publish get :active press
  physics. Reduced-motion guard added. Auth-walled: verified via lint/tsc/prod build.
  Remaining for ≥9: rubric criterion add/remove FLIP motion, drag handle affordance,
  publish success morph.
- iter 8: classrooms list 5.5 → 6.5 — one-shot diagonal sheen on card hover, 3-dot
  dropdown pops from top-right (0.18s), create modal springs in (modalPop signature
  bezier), student counts CountUp, createBtn press physics. Grid cascade already
  existed via stagger-children. Reduced-motion guard covers sheen/dropdown/modal.
  Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: empty/error state
  illustrations, avg-score CountUp (skipped: nullable), delete-confirm modal motion.
- iter 7: students 5.5 → 6.5 — Average Score + Completed stats use CountUp, area chart
  draws on over 900ms ease-out, radar sweeps in 200ms later (staggered timing hierarchy),
  submission-history tbody cascades via stagger-children, rows get hover accent edge.
  Auth-walled: verified via lint/tsc/prod build. Remaining for ≥9: rank/consistency real
  data + odometer, risk badge motion, chart gradient reveal mask.
- iter 6: assignments list 5.5 → 6.5 — tbody keyed on class/status filters so rows
  re-cascade on filter change (search excluded to avoid per-keystroke strobing),
  "Loading..." text replaced with 4 shimmer skeleton rows (global animate-shimmer +
  new reduced-motion guard for it), row hover accent edge, :active press physics on
  createBtn/gradeBtn/viewBtn. Verified: lint/tsc/build clean + landing regression
  screenshot on a fresh server (earlier 404s were a stale pre-rebuild server, not code).
  Remaining for ≥9: dropdown menu entrance, modal springs, card sheen on tableWrap.
- iter 5: classroom detail 5.0 → 6.5 — hero student count + avg and the four status
  counts now use the CountUp primitive, student tbody cascades via stagger-children,
  row hover gets the inset accent edge (matching assignment detail), add-student modal
  springs in (modalPop 0.35s signature bezier), :active press physics on
  addStudentBtn/viewBtn. Reduced-motion guard for modal + overlay. Auth-walled:
  verified via lint/tsc/prod build. Remaining for ≥9: empty-state illustration,
  search-filter row cascade re-trigger, save-state morph on modal submit.
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
