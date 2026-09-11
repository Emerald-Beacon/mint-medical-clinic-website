# Men's Health Quiz Funnel — Design

**Date:** 2026-09-11
**Goal:** Replace the current Opti-Mint funnel with a competitor-style quiz funnel that
recommends either Mint Mints or the Opti-Mint Shot and ends in a booked virtual consultation.

**New files:** `lp/mens-health.html`, `start/index.html`, `start/confirmed.html`,
`js/quiz-engine.js`, `js/quiz-mens-health.js`
**Modified:** `netlify.toml` (redirects)
**Untouched:** `lp/opti-mint-shot.html`, `Products/mint-mints.html`, `lp/glp1.html`

---

## 1. Why we are rebuilding

Teardown of the live Ro, Hims, Rugiet, and Medvi ED funnels (conducted 2026-09-11 in-browser,
plus Meta Ad Library review) found one structure shared by all three of the winners:

| | Questions before capture | Any medical questions? | Advance | Capture asks for |
|---|---|---|---|---|
| Rugiet | 2 ("1/2", "2/2") | none | auto on tap | account signup |
| Ro | 3 | none | auto on tap | **email only** |
| Hims | ~3 | none | auto on tap | account signup |
| Mint GLP-1 (today) | 16 | all of them | Next button | name, full street address, DOB, employer |

The three winners ask **zero** medical questions before capture. Hims states the reason in
their own legal copy: *"Responses prior to account creation will not be used as part of your
medical assessment."* The front quiz exists to build momentum and segment the pitch. The
medical intake happens after contact details are captured, so an abandon costs them nothing.

Mint's funnel inverts this: it spends sixteen invasive steps before it learns who the person
is, so every drop-off is unrecoverable, and it still ends in a cold phone call.

Key mechanics we are adopting, each observed directly:

- **Goal-framed first question, never a medical one.** "What's your goal in the bedroom?"
  (Rugiet) / "What are your goals for having better sex?" (Ro).
- **3–4 options, full-width stacked pills, one tap, auto-advance.** No Next button, no radio
  circles, no multi-select.
- **No option disqualifies.** Every answer leads somewhere positive.
- **Progress shown, length hidden.** Ro shows a bar with no numbers; Rugiet shows "1/2"
  precisely because two is impressively short.
- **A belief interstitial mid-quiz.** Hims interrupts with a stat card ("79% of Hims customers
  say they feel more confident…") carrying its own Next.
- **Manufactured personalization.** Rugiet runs a full-screen "Tailoring Your Recommendation…"
  animation, then a "Your recommendation: READY™" reveal with benefit chips, ingredients,
  inline FAQs, a testimonial, and a sticky CONTINUE bar.
- **Minimum-viable capture.** Ro asks for email only — no name, phone, or password — in a
  bottom sheet headlined "Let's start your health profile," over a benefit screen.
- **Process pre-sold before anything is asked.** Rugiet's "5 MINUTES / 4 STEPS" block.

**Deliberately not copied:** the Medvi affiliate intake (`glp1.medvi.org`) is a single long page
with a 34-item health checkbox grid, DOB, blood pressure and resting heart rate before any
capture. It is an affiliate page, not Medvi's brand funnel, and it is the same mistake Mint's
current quiz makes.

**Competitive note:** Rugiet Ready is itself a sublingual troche ("dissolves under the tongue",
15 minutes, ~$7/dose) and Hims sells "3-in-1 Hard Mints" at $35/mo. Mint Mints competes
head-on with both. Both competitors anchor on per-dose or per-month price.

---

## 2. Decisions taken (approved 2026-09-11)

| Decision | Choice | Consequence |
|---|---|---|
| Product scope | **Both** — one funnel, quiz routes to Mint Mints or Opti-Mint Shot | Needs a recommendation reveal (§6) |
| Ending | **Hybrid** — async-feeling UX, ends in a booked consult | Consult must be framed as a benefit, not a hurdle (§7) |
| Scheduling | **Zoho Bookings**, embedded not linked | `new-consultation.zohobookings.com/#/mintmedicalclinic` |
| Lead capture | **Netlify Forms only** | No automated text/call — see risk below |
| Payment | **No card.** The booked slot is the commitment device | No processor work; funnel does not touch Snipcart |
| Geography | Multi-state, gated by a config list | `LICENSED_STATES` (§5.4) |

**Accepted risk — no automated follow-up.** Netlify Forms alone cannot send the instant
text-then-call sequence the GLP-1 audit recommended. This funnel therefore relies on two
compensating mechanisms, both of which must ship:

1. The consult is **scheduled by the patient**, so there is a known time rather than a cold
   call-back. Booked consults get answered; cold call-backs do not.
2. **Explicit expectation-setting copy** naming who calls, when, and from which number,
   on both the capture screen and the confirmation page (§8).

If the booked-slot mechanism does not lift answer rates, the fix is adding a CRM that can text
on submit — a later change, not a blocker for this build.

---

## 3. Architecture

Approach B: the landing page and the quiz are separate documents on separate routes. This
mirrors why Ro and Rugiet run quizzes on `start.` subdomains — the quiz is a different product
from the landing page, and merging them is what makes clinic funnels feel homemade.

```
lp/mens-health.html       Landing page
start/index.html          Full-screen quiz shell
start/confirmed.html      Confirmation page
js/quiz-engine.js         Generic engine — reusable, funnel-agnostic
js/quiz-mens-health.js    This funnel's questions, routing, and copy
```

### 3.1 Why the engine is split from its config

`quiz-engine.js` knows how to render a question, auto-advance, animate, manage history, and
persist state. It knows nothing about ED, Mint Mints, or Utah. `quiz-mens-health.js` is a
single exported config object holding questions, routing rules, and product copy.

This buys three things: the GLP-1 funnel can adopt the engine later and shed its 16-step modal;
a third funnel costs a config file rather than a rewrite; and the engine is testable in
isolation against a fixture config.

**Engine public interface:**

```js
QuizEngine.mount(rootEl, config)   // renders into rootEl, reads/writes history
QuizEngine.getState()              // { answers, stepId, recommendation }
```

Config contract (`quiz-mens-health.js`):

```js
{
  id: 'mens-health',
  steps: [ /* ordered; see §5 */ ],
  recommend: (answers) => 'mint-mints' | 'opti-mint-shot',
  products: { 'mint-mints': {...}, 'opti-mint-shot': {...} }
}
```

Each step is one of four types: `question`, `interstitial`, `processing`, `capture`. The engine
renders each type; the config supplies only content. Adding a fifth type is an engine change;
adding a fifth question is a config change.

### 3.2 Routing and history

Each step owns a URL, in flow order:

```
/start/#/goal            Q1  (§5.1)
/start/#/proof           interstitial (§5.2)
/start/#/tried           Q2  (§5.3)
/start/#/priority        Q3  (§5.4)
/start/#/state           state gate (§5.5)  → /start/#/waitlist if unlicensed
/start/#/matching        processing (§5.6)
/start/#/recommendation  reveal (§6.2)
/start/#/contact         capture (§7)
/start/#/schedule        Zoho calendar (§8.1)
```

Confirmation is a real page (`/start/confirmed.html`), not a hash step, so it survives the
Zoho hand-off and can be linked from an email.

Hash routing rather than real paths, because the site is static on Netlify with no SPA rewrite,
and hash routing needs no server config while still giving per-step history. Back button and
refresh both work. `pushState` on advance, `popstate` listener for back.

Per-step URLs are what make drop-off measurable per question (§9) — the audit's
"drop-offs in steps 1–12 are unrecoverable" finding becomes a chart.

### 3.3 State persistence

Answers live in `sessionStorage` under `mint_quiz_mens_health`, so a refresh mid-quiz does not
reset progress. Every read and write is wrapped in try/catch — private browsing throws on
access — and the quiz must function correctly when storage is unavailable, simply losing
resume-on-refresh. State is cleared once the confirmation page loads.

### 3.4 Redirects (`netlify.toml`)

```toml
[[redirects]]
  from = "/mens-health"
  to = "/lp/mens-health.html"
  status = 200

[[redirects]]
  from = "/start"
  to = "/start/index.html"
  status = 200
```

`/mens-performance` currently 200s to the acoustic-wave LP and is left alone to avoid breaking
live ad traffic.

---

## 4. Landing page — `lp/mens-health.html`

Inherits the Opti-Mint Shot LP's design system verbatim: Cormorant Garamond headings, Inter
body, and its token set (`--mint #3EB489`, `--mint-deep #1f6b50`, `--gold #c9a96e`,
`--ink #1a2b27`, `--cream #faf7f2`). It is the newest and most premium system on the site, and
reusing it means this page looks like Mint rather than like a template.

No site-wide header or footer — a minimal LP footer only, matching `lp/glp1.html`. Ad traffic
should not be offered twenty navigation escape routes.

Section order, following Rugiet's `get.rugiet.com` structure:

1. **Sticky offer bar** — first-visit offer line, dismissible.
2. **Hero** — listicle headline in Rugiet's proven shape ("5 reasons men in Utah switched…"),
   subhead, primary CTA **"Start your free visit"**, secondary text link "See if it's right for
   me". Directly under the button, the risk-reversal triplet Rugiet uses:
   **Free online visit · No insurance required · Discreet shipping.**
3. **Trust strip** — review rating, patients treated, "Utah-licensed providers".
4. **The 5 reasons** — the listicle the headline promises.
5. **Both products, side by side** — Mint Mints and Opti-Mint Shot as cards with their real
   prices (§6.3). Each card's CTA enters the quiz, never the cart.
6. **"5 minutes, 4 steps"** — process pre-sell, adapted from Rugiet: answer a few questions →
   a Utah provider reviews and meets you → your prescription is approved → it arrives
   discreetly. Step 2 is where the consult is framed as the benefit.
7. **Comparison** — against the blue pill and against mail-order app competitors.
8. **FAQ** — objection handling at the decision point.
9. **Final CTA.**

Every CTA on the page goes to `/start`. Nothing on this page adds to cart.

---

## 5. The quiz — `start/index.html`

Full-screen. Nothing but a centered logo, a hairline progress bar, and the question. No
navigation, no footer, no phone number competing for attention. A back chevron top-left from
step 2 onward.

Progress bar advances proportionally with **no step numbers shown**, following Ro. The quiz is
short enough that a bar reading "almost done" is honest.

### 5.1 Question 1 — goal

> **What's your goal?**

- Get hard faster
- Stay hard longer
- Both
- More confidence overall

Four options. Goal-framed, not medical, matching all three competitors.

### 5.2 Interstitial — belief

Placed after Q1, following Hims' placement. Full-bleed warm background, one statistic, its
substantiation in small type, and a Next button.

Copy must be a claim Mint can actually substantiate — a real clinic outcome or review count,
not an invented percentage. **This is a hard requirement**, not a style note: the GLP-1 audit
flagged unsubstantiated claims ("the only GLP-1 program that includes minerals", inflated
search volumes) as a live risk, and this is a YMYL medical page. If no substantiated figure is
available at build time, this step ships with a qualitative reassurance instead
("Utah-licensed providers. Same-week appointments. Discreet, unmarked packaging.").

### 5.3 Question 2 — what's been tried

> **How have you tried to fix it so far?**

- Haven't tried anything yet
- Tried the blue pill — it didn't do enough
- Tried it — works, but I hate planning around it
- Tried it — want something stronger

No option disqualifies; each maps to a different product emphasis (§6).

### 5.4 Question 3 — what matters most

> **What matters most to you?**

- How fast it works
- How strong it is
- Not having to plan ahead
- Keeping it private

### 5.5 State gate

> **Where are you located?**

A single native `<select>` of US states — a dropdown, not 50 pills. This is the one non-goal
question, justified because booking a consult Mint cannot legally deliver wastes a real
appointment slot and the patient's time.

```js
const LICENSED_STATES = ['UT'];   // deployment-time value; see §12
```

Behaviour:
- **In list** → continue to recommendation.
- **Not in list** → waitlist screen: honest ("We're not licensed in <State> yet"), captures
  email only, writes to a separate `mens-health-waitlist` Netlify form, and does **not** offer
  a booking slot. The lead is kept; the slot is not wasted.

Placed after the three engagement questions so a non-Utah visitor has already invested three
taps, which materially raises waitlist opt-in versus asking first.

### 5.6 Processing screen

Full-screen, ~2.5 seconds, over a warm-toned image: **"Matching you with the right treatment…"**
Directly modelled on Rugiet's "Tailoring Your Recommendation…".

Honest because a real decision is being computed (§6). It must not fabricate medical analysis —
copy says "matching", never "analyzing your results" or "reviewing your health history".

Respects `prefers-reduced-motion`: the spinner becomes a static card and the delay drops to
~600ms.

---

## 6. Recommendation

### 6.1 Routing logic

`recommend(answers)` is a small deterministic function, not a score:

| Condition | Recommendation | Rationale |
|---|---|---|
| Q2 = "want something stronger" | **Opti-Mint Shot** | Strongest option; different mechanism |
| Q2 = "didn't do enough" | **Opti-Mint Shot** | PDE5 pills already underperformed |
| Q3 = "How fast it works" | **Opti-Mint Shot** | 15-minute onset is its core claim |
| Q2 = "hate planning around it" | **Mint Mints** | Sublingual, on-demand, no needle |
| Otherwise (incl. "haven't tried anything") | **Mint Mints** | Lower-commitment entry product |

Evaluated top-down, first match wins. Deliberately biased toward Mint Mints as the default,
because it is the lower-commitment product for someone who has never treated ED — and because
it is the direct Rugiet Ready / Hims Hard Mints competitor.

### 6.2 Reveal screen

Structure lifted from Rugiet's recommendation page:

- **"Your recommendation:"** eyebrow, then the product name at display size
- One-sentence positioning line
- Product image
- Three or four **benefit chips** (e.g. "Dissolves under the tongue" · "Works in 15 minutes" ·
  "No pharmacy counter")
- What's in it
- A short "why this one for you" line **referencing their actual answers** — this is the payoff
  for the processing screen and must reflect real input, not boilerplate
- Inline FAQ accordion — objection handling at the decision point
- One testimonial
- **Sticky CONTINUE bar** pinned to the viewport bottom

A quiet "See the other option" link lets someone switch products without restarting. Rugiet has
no such escape hatch, but Rugiet sells one product; we sell two, and forcing a restart to see
the alternative would lose the lead.

### 6.3 Product facts (from existing pages — do not restate incorrectly)

**Mint Mints** — sublingual ED troche, fast-acting, dissolves under the tongue.
Half Batch $197 (first-time introductory), Full Batch $297 (regularly $397).

**Opti-Mint Shot** — injectable, $49.97 per shot, as low as $29.80 per shot in a 10-pack,
~15 minutes to onset.

The GLP-1 audit flagged a pricing-anchor mismatch — cards advertising a price the call then
contradicts — as a direct cause of sticker shock and ghosting. **Prices shown in this funnel
must match the product pages exactly.** If a funnel-only offer is introduced later, it must
state its own terms inline.

---

## 7. Capture — `#/contact`

Following Ro: a **bottom sheet sliding up over a benefit screen**, headlined
**"Let's start your visit."**

Fields, in order:

1. **Email** (required)
2. **First name** (required)
3. **Mobile phone** (required)

Ro asks for email only, because Ro never needs to phone anyone — their model is fully async.
We are booking a consult, so a name and a reachable number are genuinely required, and asking
for them here rather than after scheduling means an abandoner is still recoverable. Three
fields is still radically fewer than the current sixteen steps, and no street address, DOB,
occupation, or employer is collected anywhere in this funnel.

Consent checkboxes, both required, adapting Ro's pattern:

- [ ] I agree to the Privacy Policy and consent to telehealth
- [ ] I agree to receive calls and texts from Mint Medical Clinic about my consultation

The second closes the GLP-1 audit's TCPA gap (finding #4) and is what makes a text-first
follow-up legal if a CRM is added later.

**Expectation-setting copy, directly beneath the submit button** — this is the single most
important copy block in the funnel and addresses the audit's root cause:

> A Mint provider will call you from **(801) 804-8000** at the time you choose. Save the number
> so you know it's us.

Submit posts to Netlify Forms as `mens-health-lead`, with a hidden `quiz-answers` JSON field
and a hidden `recommended-product` field, plus a honeypot — mirroring the `weight-loss-lead`
form already working in `lp/glp1.html`.

Submission must be resilient: if the POST fails, the user still advances to scheduling and the
payload is retried once. A booking is worth more than a form record, and losing the booking
because the form 500'd is the worst outcome.

---

## 8. Scheduling and confirmation

### 8.1 Scheduling — `#/schedule`

Zoho Bookings embedded in an iframe, not linked out, so the funnel is never handed off to a
foreign-looking page:

```
https://new-consultation.zohobookings.com/#/mintmedicalclinic
```

Lazy-loaded — the iframe's `src` is set from `data-src` only when this step is reached, so the
third-party embed never blocks the quiz. This matches the existing lazy-load in `lp/glp1.html`.

Framing above the calendar carries the whole option-3 premise — the consult is the benefit:

> **Pick a time with a Utah provider.** Fifteen minutes, by phone or video. No waiting room,
> no pharmacy counter. Your provider confirms your dose and sends it discreetly.

Note Rugiet advertises *against* this ("No video, no waiting room"), so the copy must sell what
a real provider relationship gives that a mail-order app cannot — and must not apologise for it.

**Verification required during build:** Zoho Bookings must permit framing from
`mintmedicalclinic.com`. If Zoho sends `X-Frame-Options: DENY` or a restrictive
`frame-ancestors`, the embed silently shows blank. The fallback is a prominent full-width
button opening Zoho in a new tab, with the confirmation page reached via a "I've booked my
time" link. This must be checked before the page is considered done, because a blank calendar
is an invisible total funnel failure.

### 8.2 Confirmation — `start/confirmed.html`

A real page, not a toast. The GLP-1 funnel currently says nothing about what happens after
submit, which is precisely why leads are surprised by an unknown number.

Must state, explicitly:

- **Who** is calling — a Mint provider
- **When** — the time slot they chose
- **From what number** — (801) 804-8000, with a "Save this number" affordance
- **What to have ready** — nothing; there is no prep
- A **"Call us now"** button for anyone who would rather not wait
- What arrives by email (Zoho's calendar invite and confirmation)

Clears `sessionStorage` and fires the conversion events (§9).

---

## 9. Tracking

Current state: Meta Pixel `985745890592891` is on `index.html` and `Products/mint-mints.html`.
**`lp/opti-mint-shot.html` has no pixel at all** — a live gap. There is **no GA4 anywhere on the
site**, matching the GLP-1 audit's finding.

This build adds:

- Meta Pixel on both the LP and the quiz — `ViewContent` on LP, `Lead` on capture submit,
  `Schedule` on confirmation.
- **GA4**, currently absent site-wide. Per-step events named for their step
  (`quiz_step_goal`, `quiz_step_tried`, …) so drop-off per question is directly readable.
- UTM and `fbclid` captured on landing, persisted in `sessionStorage`, and written into hidden
  form fields so the lead record carries its source.

The audit recommended firing conversions on real outcomes rather than form submit. Without a
CRM we cannot observe "prescribed", but we can distinguish **captured** (form submit) from
**booked** (confirmation page) — and booked is the metric that matters. They must be separate
events; conflating them is what hides the exact failure this rebuild exists to fix.

Server-side CAPI is out of scope (no CRM to fire it from).

---

## 10. Accessibility and responsive

- Option pills are real `<button>` elements in a `role="radiogroup"`, operable by keyboard,
  with visible focus rings. Auto-advance must not trap keyboard users — advancing on Enter or
  Space is the same action as a tap.
- Each step change moves focus to the new question heading and announces via `aria-live`, so
  the quiz is usable with a screen reader despite advancing without a Next button.
- `prefers-reduced-motion` disables step transitions and shortens the processing screen.
- Mobile-first: the overwhelming majority of Meta traffic is phone. Option pills are
  full-width with a minimum 48px tap target. The sticky CONTINUE bar must never cover the last
  option — the scroll container gets bottom padding equal to the bar's height.
- Minimum 16px side gutters; no horizontal scroll at 360px.

---

## 11. Out of scope

- Payment, card capture, and any Snipcart interaction. This funnel books consults; the product
  pages keep their existing carts, and the two paths do not cross.
- The medical intake itself. A provider takes history on the consult. Nothing in this funnel
  asks a medical question, by design.
- Rewriting `lp/glp1.html` to use the new engine. The engine is built to allow it later.
- Advertorial pre-landers. All four competitors run a stable of them under publisher-style
  names ("Modern Man Cave", "The Customer Digest", "Men's Performance Digest"); that is a
  separate asset class and a separate decision.
- Automated text/call follow-up (no CRM — see §2).

---

## 12. Deployment-time input required

`LICENSED_STATES` in `js/quiz-mens-health.js` ships as `['UT']`, which is verified correct for
the Sandy and Layton locations. Josh has confirmed providers are licensed beyond Utah but the
list is not yet supplied. Until it is, out-of-state visitors route to the waitlist rather than
booking.

Adding states is a one-line config edit requiring no structural change. This is the only value
in the build that cannot be derived from the repo.

---

## 13. Testing

No automated test suite exists in this project; verification is manual in-browser, run at
360px and desktop widths.

1. Every quiz path reaches a recommendation; all five routing rules in §6.1 produce the
   expected product.
2. Back button and refresh preserve answers at every step.
3. Private-browsing mode (storage throws) completes the quiz without a console error.
4. Keyboard-only completion, and a screen-reader pass on step changes.
5. Non-licensed state reaches the waitlist and cannot reach the calendar.
6. Netlify Forms receives `mens-health-lead` with quiz answers and recommended product
   attached; `mens-health-waitlist` receives waitlist entries.
7. **The Zoho iframe actually renders** (§8.1) — the highest-risk single point of failure.
8. Pixel and GA4 events fire once each, at the right step, with capture and booking distinct.
9. Prices on the funnel match `Products/mint-mints.html` and `lp/opti-mint-shot.html` exactly.
