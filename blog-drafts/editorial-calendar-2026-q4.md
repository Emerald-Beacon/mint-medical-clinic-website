# Editorial Calendar — Mint Medical Clinic
## Q4 2026 (September 22 – December 31) · 3-Month Plan

**Cadence:** 2 posts/week — every **Tuesday & Thursday**
**Total content actions:** 28 (**18 new** · **10 freshness refreshes**)
**Shift from Q3:** Q3 was greenfield cluster-building. Q4 moves to a **maintenance + expansion** mix — roughly 64% new / 36% refresh — because the Q3 pillars are the pages that will actually be ranking by October, and stale pillars decay fastest.
**Optimization:** dual-optimized for **SEO** (rankings, topical authority, local intent) and **GEO** (AI citations in ChatGPT / Perplexity / Google AI Overviews) via answer-first formatting, FAQ-shaped H2/H3s, and named clinical sources.
**Locations targeted:** Sandy & Layton, UT (+ Salt Lake metro)
**Compliance:** All posts are YMYL/medical → licensed-provider review line, evidence-based claims (no "cure"/"guaranteed"/"permanent" language), discreet free-consultation CTA.

> **Holidays skipped:** Nov 26 (Thanksgiving) and Dec 24 (Christmas Eve) have no scheduled post. 30 Tue/Thu slots exist in the window; 28 are used.

---

## ⚙️ Machine-readable contract (read this before editing the table)

The autonomous publisher parses these tables. Two columns were added in Q4 and the routine depends on them:

- **`Type`** — `New` or `Refresh`. Determines whether the agent writes a new article or rewrites an existing one.
- **`Slug`** — **authoritative**. For `New` rows this is the slug the agent MUST publish under (do not let it derive its own). For `Refresh` rows this is the existing live slug to overwrite.

**Idempotency rules (why runs never duplicate or loop):**

| Type | Row is "already done" when | Notes |
|------|----------------------------|-------|
| `New` | `Slug` exists in the live article list | Same rule as Q3 |
| `Refresh` | the live article's `updatedAt` **date ≥ the row's date** | Self-satisfying: the API stamps `updatedAt = now` on write, so a completed refresh permanently satisfies its own row |

**Critical for refreshes:** the agent MUST resend the article's **original `publishedAt`** unchanged. The API defaults `publishedAt` to *now* when the field is absent, which would corrupt topic selection for every later run.

---

## Topic Clusters — progress entering Q4

| Cluster | Pillar | Spokes live (end Q3) | Q4 actions | Coverage |
|---|---|---|---|---|
| A | **ED & Shockwave/Acoustic Wave** | Published | 6 | 4 (3 new + 3 refresh) | ~75% |
| B | **Hormone Therapy (TRT + HRT)** | Published | 6 | 4 (2 new + 2 refresh) | ~70% |
| C | **GLP-1 Medical Weight Loss** | Published | 6 | 8 (5 new + 3 refresh) | ~80% |
| D | **Women's Intimacy & Sexual Wellness** | Published | 5 | 5 (4 new + 1 refresh) | ~65% |
| E | **Wellness, Body Contouring & Local/Brand** | Published | 4 | 7 (4 new + 3 refresh) | ~70% |

No new clusters opened in Q4 — all five are mid-build, and the rule is to finish before starting.

---

## Content Decay Report (as of Sept 22, 2026)

Thresholds: high-traffic pillar >90 days = refresh. Cost/pricing pages decay fastest (figures go stale and carry a year in the title).

| Post | Published | Days stale by Q4 start | Priority | Scheduled |
|---|---|---|---|---|
| `semaglutide-vs-tirzepatide-weight-loss-2026` | Jun 30 | 84 | Critical (pillar, drug landscape moves monthly) | Oct 6 |
| `low-testosterone-9-signs-blood-panel` | Jun 18 | 96 | Critical (pillar) | Oct 13 |
| `does-shockwave-therapy-for-ed-work` | Jun 23 | 91 | Critical (pillar) | Oct 20 |
| `best-mens-health-clinic-salt-lake-sandy-layton` | Jun 25 | 89 | High (local money page) | Nov 12 |
| `shockwave-therapy-ed-cost-utah-2026` | Jul 7 | 77 | High (pricing + year in title) | Nov 19 |
| `trt-cost-utah-2026-price-breakdown` | Jul 16 | 68 | High (pricing + year in title) | Dec 1 |
| `tirzepatide-cost-without-insurance-utah-2026` | Jul 23 | 61 | High (pricing + year in title) | Dec 8 |
| `glp1-weight-loss-qualification-bmi-eligibility` | Jul 9 | 75 | Medium | Dec 17 |
| `womens-intimacy-health-utah-sandy-layton` | Jul 2 | 82 | Medium (local money page) | Dec 22 |
| `whole-body-cryotherapy-utah-benefits-cost` | Jul 14 | 70 | Medium | Dec 29 |

The three `…-2026` pricing titles should be retitled to **2027** during their December refresh, keeping the same slug.

---

## MONTH 1 — September 22 – October 15 · Focus: Cluster gap-filling + Breast Cancer Awareness Month

| Date | Day | Type | Cluster | Title / Refresh target | Slug | Template | Primary Keyword | GEO / AI-query target | Status |
|------|-----|------|---------|------------------------|------|----------|-----------------|------------------------|--------|
| Sep 22 | Tue | New | A | Can Shockwave Therapy Help Peyronie's Disease? What the Evidence Shows | `shockwave-therapy-peyronies-disease-evidence` | data-research | shockwave therapy peyronie's disease | "Does shockwave therapy work for Peyronie's or just for ED?" | Idea |
| Sep 24 | Thu | New | C | GLP-1 Muscle Loss: How to Protect Lean Mass While Losing Weight | `glp1-muscle-loss-protect-lean-mass` | how-to | glp1 muscle loss | "How do I keep from losing muscle on semaglutide?" | Idea |
| Sep 29 | Tue | New | D | Painful Sex After Menopause: Causes and What Actually Helps | `painful-sex-after-menopause-causes-treatment` | how-to | painful sex after menopause | "Sex hurts since menopause — what are my treatment options?" | Idea |
| Oct 1 | Thu | New | B | Testosterone Pellets vs. Injections vs. Creams: Which TRT Method Fits You? | `testosterone-pellets-vs-injections-vs-creams` | comparison | testosterone pellets vs injections | "What's the difference between TRT pellets, shots, and gel?" | Idea |
| Oct 6 | Tue | **Refresh** | C | ↻ `semaglutide-vs-tirzepatide-weight-loss-2026` | `semaglutide-vs-tirzepatide-weight-loss-2026` | — | semaglutide vs tirzepatide | Refresh 2026→late-2026 trial data, supply & pricing | Idea |
| Oct 8 | Thu | New | E | Red Light Therapy for Skin, Recovery & Sexual Wellness: What's Actually Proven? | `red-light-therapy-utah-whats-proven` | data-research | red light therapy Utah | "Is red light therapy legit or a wellness fad?" | Idea |
| Oct 13 | Tue | **Refresh** | B | ↻ `low-testosterone-9-signs-blood-panel` | `low-testosterone-9-signs-blood-panel` | — | low testosterone symptoms men | Refresh with post-FDA-update safety framing | Idea |
| Oct 15 | Thu | New | D | Hormone Therapy and Breast Cancer Risk: What the 2026 Evidence Actually Says | `hormone-therapy-breast-cancer-risk-2026` | data-research | HRT breast cancer risk | "Is hormone replacement therapy safe if I'm worried about breast cancer?" | Idea |

**Seasonal hook:** October is Breast Cancer Awareness Month — the Oct 15 HRT-risk piece meets high-intent, high-anxiety search demand. **Compliance note:** this is the most sensitive post in the quarter. It must cite NAMS/ACOG/WHI reanalysis directly, must NOT reassure categorically, and must route the reader to a provider conversation rather than a conclusion.

---

## MONTH 2 — October 20 – November 24 · Focus: Movember, open enrollment, year-end benefits

| Date | Day | Type | Cluster | Title / Refresh target | Slug | Template | Primary Keyword | GEO / AI-query target | Status |
|------|-----|------|---------|------------------------|------|----------|-----------------|------------------------|--------|
| Oct 20 | Tue | **Refresh** | A | ↻ `does-shockwave-therapy-for-ed-work` | `does-shockwave-therapy-for-ed-work` | — | does shockwave therapy for ED work | Refresh with newest meta-analyses | Idea |
| Oct 22 | Thu | New | C | Semaglutide Plateau: Why Weight Loss Stalls and What to Do About It | `semaglutide-plateau-why-weight-loss-stalls` | how-to | semaglutide plateau | "I stopped losing weight on semaglutide — what now?" | Idea |
| Oct 27 | Tue | New | E | PRP for Sexual Wellness: What the P-Shot and O-Shot Can and Can't Do | `prp-p-shot-o-shot-utah-what-to-know` | faq-knowledge | p-shot o-shot Utah | "Does the P-Shot actually work, and what does it cost?" | Idea |
| Oct 29 | Thu | New | B | Estrogen, Progesterone & Testosterone: A Woman's Guide to Which Hormones You Need | `womens-hormone-panel-estrogen-progesterone-testosterone` | how-to | women's hormone panel | "Which hormones should a woman get tested?" | Idea |
| Nov 3 | Tue | New | E | Open Enrollment 2027: Using HSA & FSA Dollars for Weight Loss and Hormone Care | `hsa-fsa-weight-loss-hormone-care-2027` | how-to | HSA FSA weight loss | "Can I use my HSA or FSA for GLP-1 or TRT?" | Idea |
| Nov 5 | Thu | New | A | Movember: 5 Men's Health Screenings Worth Doing Before 50 | `mens-health-screenings-before-50` | listicle | men's health screenings | "What health screenings should a man get in his 40s?" | Idea |
| Nov 10 | Tue | New | C | Tirzepatide vs. Retatrutide: What's Coming Next in Weight Loss Medicine | `tirzepatide-vs-retatrutide-whats-next` | comparison | retatrutide | "Is retatrutide better than tirzepatide, and when can I get it?" | Idea |
| Nov 12 | Thu | **Refresh** | E | ↻ `best-mens-health-clinic-salt-lake-sandy-layton` | `best-mens-health-clinic-salt-lake-sandy-layton` | — | best men's health clinic Salt Lake City | Refresh competitor set + service list | Idea |
| Nov 17 | Tue | New | D | Low Libido in Your 30s: Why It Happens to Women Earlier Than You Think | `low-libido-in-your-30s-women` | explainer | low libido 30s women | "I'm 34 and have no sex drive — is that normal?" | Idea |
| Nov 19 | Thu | **Refresh** | A | ↻ `shockwave-therapy-ed-cost-utah-2026` | `shockwave-therapy-ed-cost-utah-2026` | — | shockwave therapy for ED cost | Refresh pricing; retitle 2026→2027 | Idea |
| Nov 24 | Tue | New | C | Holiday Eating on a GLP-1: A Realistic Survival Guide | `holiday-eating-on-a-glp1-guide` | how-to | glp1 holidays | "How do I handle Thanksgiving dinner on tirzepatide?" | Idea |

**Seasonal hooks:** Movember (Nov, men's health) drives the Nov 5 listicle. **ACA open enrollment runs Nov 1 – Dec 15** and FSA dollars expire Dec 31 — the Nov 3 benefits piece is timed 4 weeks ahead of peak "use it or lose it" search intent.

---

## MONTH 3 — December 1 – 31 · Focus: Year-end refresh sweep + January demand capture

| Date | Day | Type | Cluster | Title / Refresh target | Slug | Template | Primary Keyword | GEO / AI-query target | Status |
|------|-----|------|---------|------------------------|------|----------|-----------------|------------------------|--------|
| Dec 1 | Tue | **Refresh** | B | ↻ `trt-cost-utah-2026-price-breakdown` | `trt-cost-utah-2026-price-breakdown` | — | how much does TRT cost | Refresh pricing; retitle 2026→2027 | Idea |
| Dec 3 | Thu | New | D | Vaginal Rejuvenation in Utah: Comparing Laser, RF, and Non-Device Options | `vaginal-rejuvenation-utah-laser-rf-comparison` | comparison | vaginal rejuvenation Utah | "What's the difference between laser and RF vaginal treatments?" | Idea |
| Dec 8 | Tue | **Refresh** | C | ↻ `tirzepatide-cost-without-insurance-utah-2026` | `tirzepatide-cost-without-insurance-utah-2026` | — | tirzepatide cost without insurance | Refresh pricing; retitle 2026→2027 | Idea |
| Dec 10 | Thu | New | E | New Year, New Labs: Why January Is the Right Time for a Hormone Baseline | `january-hormone-baseline-labs` | explainer / brand | hormone testing January | "When should I get my hormones tested?" | Idea |
| Dec 15 | Tue | New | A | ED Medication vs. Shockwave Therapy: Which Gives Better Long-Term Results? | `ed-medication-vs-shockwave-therapy` | comparison | ED pills vs shockwave | "Is shockwave better than Viagra long term?" | Idea |
| Dec 17 | Thu | **Refresh** | C | ↻ `glp1-weight-loss-qualification-bmi-eligibility` | `glp1-weight-loss-qualification-bmi-eligibility` | — | how to qualify for semaglutide | Refresh eligibility + coverage rules for 2027 | Idea |
| Dec 22 | Tue | **Refresh** | D | ↻ `womens-intimacy-health-utah-sandy-layton` | `womens-intimacy-health-utah-sandy-layton` | — | women's sexual health clinic near me | Refresh service list + local signals | Idea |
| Dec 29 | Tue | **Refresh** | E | ↻ `whole-body-cryotherapy-utah-benefits-cost` | `whole-body-cryotherapy-utah-benefits-cost` | — | cryotherapy near me / cost Utah | Refresh pricing + evidence | Idea |
| Dec 31 | Thu | New | C | Starting a GLP-1 in 2027: Your First 90 Days, Step by Step | `starting-a-glp1-2027-first-90-days` | how-to | starting glp1 2027 | "What happens in the first three months on a GLP-1?" | Idea |

**Seasonal hook:** GLP-1 and hormone search demand peaks in **early January**. The Dec 10 and Dec 31 posts are deliberately published *before* the peak so they have indexing lead time to capture New Year intent.

---

## Content Mix — Q4 totals

- **New posts:** 18 (64%)
- **Freshness refreshes:** 10 (36%)
- **Repurposed:** folded into new posts as derivative formats (FAQ/comparison) rather than tracked separately — the publishing pipeline writes full articles only.

**Type diversity across the 18 new posts:** how-to/guides ×7, comparisons ×4, data-research ×3, explainer ×2, listicle ×1, faq-knowledge ×1.

---

## Quarterly Goals

- [ ] Publish 18 new posts across all five clusters
- [ ] Complete 10 freshness refreshes, all Q3 pillars and pricing pages included
- [ ] Retitle the three `…-2026` pricing posts to 2027 (same slugs — no redirects needed)
- [ ] Bring clusters A, C, and E to ~75%+ coverage
- [ ] Capture January GLP-1/hormone demand with December-published, pre-indexed content

---

## Q1 2027 handoff

This calendar exhausts **Dec 31, 2026**. The routine stops cleanly with `CALENDAR EXHAUSTED — needs new topics from Josh.` rather than inventing YMYL topics. Generate Q1 2027 before mid-December to avoid a gap.
