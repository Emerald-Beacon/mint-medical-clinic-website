# Autonomous Publishing Runbook — Mint Medical Clinic

How this site publishes blog content on its own. This is the human-readable source of truth; the executable prompt lives in the Claude cloud routine.

---

## At a glance

| | |
|---|---|
| **Routine name** | `Mint Medical — Weekly Blog Production` |
| **Routine ID** | `trig_01LUJDyw11UrpRrnX1ZoXeKa` |
| **Schedule (cron, UTC)** | `0 13 * * 2,4` |
| **Schedule (local)** | **Tue & Thu, 7:00am America/Denver** (MDT; 6:00am during MST) |
| **Model** | `claude-sonnet-5` |
| **Repo** | `github.com/Emerald-Beacon/mint-medical-clinic-website` (branch `main`) |
| **Live site** | https://www.mintmedicalclinic.com |
| **Mode** | Fully autonomous — publishes **live**, no human gate |
| **Output** | Exactly **one content action per run** (a new post OR a refresh) |

---

## ⚠️ The single most important architectural fact

**The blog is database-backed, not static HTML.**

Articles live in **Netlify Blobs** (`articles` store) and are published by POSTing JSON to `/api/blog-webhook`. There is **no** per-post HTML file. `blog/article.html` is a single client-side template that fetches the article by slug at runtime.

Anyone (human or agent) who tries to "add a blog post" by creating an HTML file is doing it wrong.

### Consequences that bite

1. **`<script>` tags are stripped on save.** `netlify/functions/blog-webhook-simple.js:85` removes all `<script>` blocks, including `application/ld+json`. Schema embedded in article content is silently deleted — it has never survived.
2. **Schema is rebuilt client-side instead.** `js/blog.js:386` constructs `BlogPosting` + `FAQPage` JSON-LD from the rendered article, taking FAQ questions from **H2/H3 headings that end in `?`** followed by a `<p>`. That heading pattern *is* the schema contract — break it and the post loses FAQ rich-result eligibility.
3. **`store.setJSON(slug, …)` is an upsert.** Publishing to an existing slug overwrites it. That is how refreshes work — and how an accidental slug collision would silently destroy an article.
4. **The API overwrites `updatedAt` with now, but trusts `publishedAt` from the payload.** A refresh that omits `publishedAt` resets it to today, which corrupts topic selection for every later run.

---

## Calendars — what the machine actually reads

| File | Window | Rows | Columns |
|---|---|---|---|
| `blog-drafts/editorial-calendar-2026-q3.md` | Jun 18 – Sep 17, 2026 | 27 | Date, Day, Cluster, Title, Template, Keyword, GEO target, Status |
| `blog-drafts/editorial-calendar-2026-q4.md` | Sep 22 – Dec 31, 2026 | 28 | **+ Type, + Slug** |

Q4 added two columns the routine depends on:

- **`Type`** — `New` or `Refresh`.
- **`Slug`** — **authoritative**. For `New`, the slug to publish under (stops the agent inventing its own). For `Refresh`, the existing live slug to overwrite.

Q3 rows have neither and are treated as `Type=New` with a derived slug. That is why Q3 slugs are inconsistent (`shockwave-vs-acoustic-wave-therapy-for-ed` vs a full-title slug) — fixed going forward by the `Slug` column.

---

## How a run picks its work (idempotency)

Every run starts with zero context, so "what's next" is derived entirely from **live state**, never from memory.

1. Fetch all live articles → map of `slug → {publishedAt, updatedAt}`. `LATEST_NEW` = newest `publishedAt` date.
2. Parse both calendars, merge, sort ascending by date.
3. Walk in order and take the **first unsatisfied row**:

| Type | Satisfied when | Also skipped when |
|---|---|---|
| `New` | row date ≤ `LATEST_NEW`, **or** its `Slug` is already live | — |
| `Refresh` | the target slug's `updatedAt` **date ≥ the row's date** | its date is later than today (not yet due) |

4. Nothing selected → either `NOTHING DUE TODAY — next action <date>` (healthy) or `CALENDAR EXHAUSTED — needs new topics from Josh.`

**Why refreshes are self-satisfying:** the API stamps `updatedAt = now` on every write, so a completed refresh permanently satisfies its own row. Without this, a refresh row would be re-selected forever — it adds no new `publishedAt`, so the old date-based rule could never advance past it.

This was validated by simulating all 48 scheduled runs from Aug 4 through mid-January: 42 content actions, **every row executed exactly once**, none skipped, clean exhaustion afterward.

---

## Guardrails (YMYL / medical)

These posts go live with **no human review**, so these are the rules that matter most:

- **No invented statistics or quotes.** Every figure needs a real, linked primary source (AUA, EAU, FDA, NEJM, JAMA, Cleveland Clinic, ISSWSH/NAMS/ACOG, KFF, Utah DHHS).
- **No guarantee language** — never "cure", "guaranteed", or "permanent". Use *can / may / often*.
- **Never invent** providers, credentials, hours, locations, awards, or availability.
- **No specific prices presented as the clinic's** — pricing posts discuss market ranges with sources.
- Every post ends with `Medically reviewed by Mint Medical Clinic provider — pending review` and carries a discreet free-consultation CTA to the Zoho booking link.

**Highest-risk scheduled post:** Oct 15, 2026 — *Hormone Therapy and Breast Cancer Risk*. It must cite NAMS/ACOG/WHI directly, must not reassure categorically, and must route the reader to a provider conversation rather than a conclusion. Consider reviewing this one by hand before it fires.

---

## Verification the routine performs on itself

After publishing it checks: the `/blog/<slug>` URL returns 200; the API returns the article; **≥5 `?`-ending H2/H3 headings** exist (the schema contract); no banned claim language and the review line + CTA are present; and for refreshes, that `publishedAt` did **not** move and `updatedAt` is today. Failures are reported loudly in the run summary rather than swallowed.

---

## Known limitation — not yet fixed

**The site is 100% client-rendered.** Fetching any article URL returns a template with *zero* article text; title, body, and schema only appear after `blog.js` runs. Google renders JS and generally copes, but AI crawlers that don't execute JS (a stated GEO target of both calendars) see an empty page.

Fixing this means prerendering or static generation — a real architecture change, deliberately out of scope for the publishing routine. **Decision needed from Josh.**

---

## To change things

- **Topics** → edit the calendar tables. Keep the column order; the parser depends on it. Always fill `Slug` for Q4-format rows.
- **Cadence** → change `cron_expression` on the routine. It is **UTC**; Denver is UTC−6 (summer) / UTC−7 (winter). Other house routines cluster at 13:00–16:00 UTC — pick an uncontended hour.
- **Guardrails / structure** → edit the routine prompt (Steps 2 and 6), not this file. This file documents; the prompt executes.
- **Pause** → set `enabled: false` on the routine.
- **Q1 2027** → generate before mid-December 2026. The calendar exhausts Dec 31, 2026, after which the routine stops cleanly rather than inventing YMYL topics.

---

*Committed to the repo. The Unsplash image pool and the webhook token are inlined in the routine prompt (private) — do not copy them into tracked files.*
