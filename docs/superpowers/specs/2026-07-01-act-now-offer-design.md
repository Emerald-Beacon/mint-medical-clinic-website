# Act Now Value-Stack Offer — Design

**Date:** 2026-07-01
**File touched:** `lp/glp1.html` (the `/weight-loss` landing page) only.

## Goal

Insert a limited-time "Act Now" offer step into the weight-loss quiz funnel, between the
contact-details form and the scheduling calendar. If the prospect calls the clinic within
60 seconds, they receive a free bottle of Super Ionic Mint Minerals (the "GLP-1 Accelerator").
Designed as a Russell-Brunson-style squeeze page using the value-stack principle.

## Existing flow (before)

Booking modal (`#bookModal`) has three swappable screens driven by an IIFE:
1. `#quizScreen` — 6 qualification questions
2. `#contactScreen` — lead form (name/email/phone), POSTs to Netlify Forms
3. `#qualifiedScreen` — GoHighLevel booking calendar iframe (`finishQuiz()`)

On lead-form submit, `proceed()` fires the pixel and calls `finishQuiz(contact)` which reveals
`#qualifiedScreen` and lazy-loads the prefilled calendar iframe.

## New flow (after)

Quiz → Contact form → **`#offerScreen` (NEW)** → Calendar.

The lead-form submit handler now calls `showOffer(contact)` instead of `finishQuiz(contact)`.
`finishQuiz(contact)` is unchanged and is invoked when the offer resolves (timer hits 0:00 or
skip link clicked). Contact data is threaded through so calendar prefill still works.

## The offer screen

A fourth screen inside the same modal, matching existing screen/style conventions.

- **Live 60s countdown** — prominent pulsing timer ("This offer expires in 0:59"), starts when
  the screen appears, counts to 0:00.
- **Hook headline** — "Wait! One more thing before you book…" framing the call as the reward path.
- **Value stack** — stacked rows with checkmarks and crossed-out values:
  - Free bottle — Super Ionic Mint Minerals (GLP-1 Accelerator) — ~~$89~~
  - Priority consultation scheduling — included
  - Anchor: "Total value $89 — Yours FREE when you call now"
- **Product image** — `images/super-ionic-mint-minerals.png` for tangibility.
- **Primary CTA** — click-to-call `<a href="tel:8018048000">` showing "(801) 804-8000" so desktop
  users can dial manually; mobile opens the dialer. Fires `fbq('track','Contact')` best-effort.
- **Escape hatch** — small low-emphasis link: "No thanks, just book my consultation online →"
  → resolves the offer immediately (calendar).
- **Reassurance** — "Offer valid for callers only. Mention this page to claim your free bottle."

## Behavior

- Timer 60 → 0. At 0:00, auto-advance to `finishQuiz(contact)` (calendar). No qualified lead lost.
- Tapping Call Now keeps the offer on screen (dialer opens over it); timer keeps running as the
  fallback to the calendar. Staff books the caller live.
- Skip link resolves the offer immediately to the calendar.
- Timer is stored in a module var and cleared on resolve, on modal close, and on `resetQuiz()`
  so it can never fire against a closed/reset modal or double-advance.

## Scope / non-goals

- All changes in `lp/glp1.html`: new markup block, CSS in the existing `<style>`, ~40 lines JS in
  the existing IIFE.
- No new files, no changes to Netlify functions, the calendar widget, or other pages.
- No server-side enforcement of the offer — it is a marketing/urgency device; fulfillment is
  handled by staff when the prospect calls and mentions the page.
