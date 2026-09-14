# Men's Health Quiz Funnel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a competitor-style quiz funnel that recommends Mint Mints or the Opti-Mint Shot in three taps and ends in a booked virtual consultation.

**Architecture:** A landing page (`lp/mens-health.html`) and a separate full-screen quiz (`start/index.html`) on their own routes. A generic, funnel-agnostic engine (`js/quiz-engine.js`) is driven by a per-funnel config (`js/quiz-mens-health.js`) holding questions, routing rules and copy. Hash routing gives every step its own URL for drop-off analytics. Steps needing rich or form markup are static HTML the engine reveals; question steps are generated from config.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step. Netlify Forms for capture, Zoho Bookings iframe for scheduling, Meta Pixel + GA4 for tracking. `node --test` (Node 22, built in, zero dependencies) for the pure logic.

**Spec:** `docs/superpowers/specs/2026-09-11-mens-health-quiz-funnel-design.md`

## Global Constraints

- **Deploy target is `mint-medical-clinic` only.** Netlify Site ID `38e7c65c-9693-4bec-9e83-e2312bd923db`; remote must be `https://github.com/Emerald-Beacon/mint-medical-clinic-website.git`; branch `main`. Verify before any commit.
- **No build step.** Vanilla HTML/CSS/JS only. No npm dependencies added at the repo root.
- **Design system** (copy verbatim from `lp/opti-mint-shot.html`): `--mint #3EB489`, `--mint-dark #2f9670`, `--mint-deep #1f6b50`, `--mint-light #e8f5f0`, `--mint-pale #f7fbf9`, `--gold #c9a96e`, `--ink #1a2b27`, `--ink-soft #3d4f4a`, `--cream #faf7f2`, `--gray-200 #e7e9e8`, `--gray-500 #8a9694`, `--gray-700 #4a5856`.
- **Fonts:** Cormorant Garamond (headings) + Inter (body), loaded from the same Google Fonts URL used in `lp/opti-mint-shot.html`.
- **Landing/quiz pages carry `<meta name="robots" content="noindex, follow">`** — matching existing LP convention. Favicon `../images/Untitled design (1).png`.
- **No site-wide header or footer** on any funnel page. Minimal LP footer only.
- **Prices must match the product pages exactly.** Mint Mints: Half Batch **$197**, Full Batch **$297** (reg. $397). Opti-Mint Shot: **$49.97** per shot, as low as **$29.80** in a 10-pack.
- **Phone number is (801) 804-8000** everywhere it appears.
- **No medical questions anywhere in this funnel.** No street address, DOB, occupation, or employer collected.
- **No card capture and no Snipcart interaction.** Every funnel CTA enters the quiz, never the cart.
- **Meta Pixel ID `985745890592891`.**
- **Existing files `lp/opti-mint-shot.html`, `Products/mint-mints.html`, `lp/glp1.html` are not modified by this plan.**
- **Accessibility:** options are real `<button>`s in a `role="radiogroup"`, keyboard operable, visible focus rings, 48px minimum tap target, `aria-live` step announcements, `prefers-reduced-motion` respected, 16px minimum side gutters, no horizontal scroll at 360px.
- **All `sessionStorage` access wrapped in try/catch**; the funnel must work when storage throws.

---

### Task 1: Quiz config and routing logic

The only pure logic in the build, and the only part with automated tests. Exports a UMD-style module so both the browser and `node --test` can load it.

**Files:**
- Create: `js/quiz-mens-health.js`
- Test: `tests/quiz-mens-health.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: global `MensHealthQuiz` (browser) / `module.exports` (Node) with shape:
  - `MensHealthQuiz.id` → `'mens-health'`
  - `MensHealthQuiz.steps` → `Array<Step>`; each `Step` is `{ id, type, ... }` where `type` is `'question' | 'interstitial' | 'processing' | 'static'`
  - `MensHealthQuiz.recommend(answers)` → `'mint-mints' | 'opti-mint-shot'`
  - `MensHealthQuiz.isLicensed(stateCode)` → `boolean`
  - `MensHealthQuiz.LICENSED_STATES` → `string[]`
  - `MensHealthQuiz.products` → `{ 'mint-mints': {...}, 'opti-mint-shot': {...} }`

- [ ] **Step 1: Write the failing test**

Create `tests/quiz-mens-health.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const quiz = require('../js/quiz-mens-health.js');

// --- recommend(): the five rules from spec section 6.1, top-down, first match wins ---

test('recommend: "want something stronger" routes to the shot', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'both', tried: 'stronger', priority: 'private' }),
    'opti-mint-shot'
  );
});

test('recommend: "blue pill did not do enough" routes to the shot', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'faster', tried: 'not-enough', priority: 'private' }),
    'opti-mint-shot'
  );
});

test('recommend: priority "how fast it works" routes to the shot', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'longer', tried: 'none', priority: 'fast' }),
    'opti-mint-shot'
  );
});

test('recommend: "hate planning around it" routes to mint mints', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'both', tried: 'planning', priority: 'private' }),
    'mint-mints'
  );
});

test('recommend: never tried anything defaults to mint mints', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'confidence', tried: 'none', priority: 'private' }),
    'mint-mints'
  );
});

test('recommend: "stronger" beats "planning" because rules are ordered', () => {
  // A user could only hold one `tried` value, but priority must not override
  // an explicit `tried: stronger`. This pins the top-down ordering.
  assert.strictEqual(
    quiz.recommend({ goal: 'both', tried: 'stronger', priority: 'spontaneous' }),
    'opti-mint-shot'
  );
});

test('recommend: returns a valid product for empty answers', () => {
  const result = quiz.recommend({});
  assert.ok(result === 'mint-mints' || result === 'opti-mint-shot');
});

// --- isLicensed() ---

test('isLicensed: Utah is licensed', () => {
  assert.strictEqual(quiz.isLicensed('UT'), true);
});

test('isLicensed: an unlisted state is not licensed', () => {
  assert.strictEqual(quiz.isLicensed('CA'), false);
});

test('isLicensed: is case-insensitive', () => {
  assert.strictEqual(quiz.isLicensed('ut'), true);
});

test('isLicensed: empty or missing input is not licensed', () => {
  assert.strictEqual(quiz.isLicensed(''), false);
  assert.strictEqual(quiz.isLicensed(undefined), false);
});

// --- structural guarantees the engine depends on ---

test('every recommendation maps to a product with required display fields', () => {
  for (const key of ['mint-mints', 'opti-mint-shot']) {
    const p = quiz.products[key];
    assert.ok(p, `missing product ${key}`);
    assert.ok(p.name, `${key} missing name`);
    assert.ok(p.tagline, `${key} missing tagline`);
    assert.ok(Array.isArray(p.chips) && p.chips.length >= 3, `${key} needs 3+ chips`);
  }
});

test('no question step offers more than four options', () => {
  for (const step of quiz.steps) {
    if (step.type === 'question' && Array.isArray(step.options)) {
      assert.ok(step.options.length <= 4, `${step.id} has ${step.options.length} options`);
    }
  }
});

test('every step has a unique id', () => {
  const ids = quiz.steps.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/*.test.js`
Expected: FAIL — `Cannot find module '../js/quiz-mens-health.js'`

- [ ] **Step 3: Write the implementation**

Create `js/quiz-mens-health.js`:

```js
/**
 * Config for the men's health quiz funnel.
 * Holds questions, routing rules and product copy. Knows nothing about the DOM.
 * Loaded as a global in the browser and as a module by node --test.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MensHealthQuiz = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Deployment-time value. Spec section 12: Utah is verified; more states pending
  // from Josh. Adding one is a one-line edit requiring no structural change.
  var LICENSED_STATES = ['UT'];

  var products = {
    'mint-mints': {
      name: 'Mint Mints',
      tagline:
        'A prescription troche that dissolves under your tongue — no pill to swallow, no waiting an hour.',
      image: '../Products/MN-MINTMINTS-FRONT@3x.png',
      chips: [
        'Dissolves under the tongue',
        'Faster than a swallowed pill',
        'No pharmacy counter',
        'Discreet, unmarked packaging'
      ],
      priceLine: 'Half Batch $197 · Full Batch $297 (reg. $397)'
    },
    'opti-mint-shot': {
      name: 'The Opti-Mint Shot',
      tagline:
        'One shot, about fifteen minutes before — supporting desire and blood flow together.',
      image: '../images/optimint-shot-vertical.webp',
      chips: [
        'Works in about 15 minutes',
        'Supports desire, not just blood flow',
        'Nothing to take daily',
        'Discreet, unmarked packaging'
      ],
      priceLine: '$49.97 per shot · as low as $29.80 in a 10-pack'
    }
  };

  /**
   * Spec section 6.1. Evaluated top-down, first match wins.
   * Biased toward Mint Mints as the default: it is the lower-commitment entry
   * product and the direct Rugiet Ready / Hims Hard Mints competitor.
   */
  function recommend(answers) {
    var a = answers || {};
    if (a.tried === 'stronger') return 'opti-mint-shot';
    if (a.tried === 'not-enough') return 'opti-mint-shot';
    if (a.priority === 'fast') return 'opti-mint-shot';
    if (a.tried === 'planning') return 'mint-mints';
    return 'mint-mints';
  }

  function isLicensed(stateCode) {
    if (!stateCode) return false;
    return LICENSED_STATES.indexOf(String(stateCode).toUpperCase()) !== -1;
  }

  var steps = [
    {
      id: 'goal',
      type: 'question',
      question: "What's your goal?",
      key: 'goal',
      options: [
        { value: 'faster', label: 'Get hard faster' },
        { value: 'longer', label: 'Stay hard longer' },
        { value: 'both', label: 'Both' },
        { value: 'confidence', label: 'More confidence overall' }
      ]
    },
    {
      id: 'proof',
      type: 'interstitial',
      // Spec section 5.2: no invented statistic. This is the qualitative
      // reassurance variant, safe to ship without substantiation work.
      headline: 'You are not doing this alone.',
      body:
        'Utah-licensed providers. Same-week appointments. Discreet, unmarked packaging — billed discreetly too.',
      cta: 'Next'
    },
    {
      id: 'tried',
      type: 'question',
      question: 'How have you tried to fix it so far?',
      key: 'tried',
      options: [
        { value: 'none', label: "Haven't tried anything yet" },
        { value: 'not-enough', label: "Tried the blue pill — it didn't do enough" },
        { value: 'planning', label: 'Tried it — works, but I hate planning around it' },
        { value: 'stronger', label: 'Tried it — want something stronger' }
      ]
    },
    {
      id: 'priority',
      type: 'question',
      question: 'What matters most to you?',
      key: 'priority',
      options: [
        { value: 'fast', label: 'How fast it works' },
        { value: 'strong', label: 'How strong it is' },
        { value: 'spontaneous', label: 'Not having to plan ahead' },
        { value: 'private', label: 'Keeping it private' }
      ]
    },
    {
      id: 'state',
      type: 'question',
      variant: 'select',
      question: 'Where are you located?',
      key: 'state',
      placeholder: 'Choose your state',
      // Spec section 5.5: a dropdown, not fifty pills.
      options: [
        'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
        'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
        'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
        'VA','WA','WV','WI','WY','DC'
      ].map(function (code) {
        return { value: code, label: code };
      })
    },
    { id: 'waitlist', type: 'static', elementId: 'stepWaitlist' },
    {
      id: 'matching',
      type: 'processing',
      // Spec section 5.6: "matching", never "analyzing your health history".
      headline: 'Matching you with the right treatment…',
      durationMs: 2500,
      reducedMotionMs: 600
    },
    { id: 'recommendation', type: 'static', elementId: 'stepRecommendation' },
    { id: 'contact', type: 'static', elementId: 'stepContact' },
    { id: 'schedule', type: 'static', elementId: 'stepSchedule' }
  ];

  return {
    id: 'mens-health',
    steps: steps,
    products: products,
    recommend: recommend,
    isLicensed: isLicensed,
    LICENSED_STATES: LICENSED_STATES
  };
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/*.test.js`
Expected: PASS — 14 tests passing, 0 failing.

- [ ] **Step 5: Commit**

```bash
git add js/quiz-mens-health.js tests/quiz-mens-health.test.js
git commit -m "feat(funnel): add men's health quiz config and routing logic"
```

---

### Task 2: Quiz engine

Generic and funnel-agnostic. Renders `question`, `interstitial` and `processing` steps from config; reveals pre-existing DOM for `static` steps (required so Netlify Forms can detect the capture form at build time — see Task 4).

**Files:**
- Create: `js/quiz-engine.js`

**Interfaces:**
- Consumes: a config object matching Task 1's shape.
- Produces: global `QuizEngine` with:
  - `QuizEngine.mount(rootEl, config, hooks)` → `void`. `hooks` is optional: `{ onStep(stepId), onAnswer(key, value), onComplete(recommendation) }`.
  - `QuizEngine.getState()` → `{ answers: Object, stepId: String, recommendation: String|null }`
  - `QuizEngine.goTo(stepId)` → `void`

- [ ] **Step 1: Write the implementation**

Create `js/quiz-engine.js`:

```js
/**
 * Generic quiz engine. Knows how to render questions, auto-advance, animate,
 * manage history and persist state. Knows nothing about any particular funnel.
 */
window.QuizEngine = (function () {
  'use strict';

  var cfg = null;
  var root = null;
  var hooks = {};
  var answers = {};
  var currentId = null;
  var recommendation = null;
  var storageKey = null;

  var reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- storage (must never throw: private browsing rejects access) ---

  function save() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch (e) {
      /* storage unavailable; resume-on-refresh is lost, quiz still works */
    }
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(storageKey);
      if (raw) answers = JSON.parse(raw) || {};
    } catch (e) {
      answers = {};
    }
  }

  // --- step lookup ---

  function stepById(id) {
    for (var i = 0; i < cfg.steps.length; i++) {
      if (cfg.steps[i].id === id) return cfg.steps[i];
    }
    return null;
  }

  function indexOfStep(id) {
    for (var i = 0; i < cfg.steps.length; i++) {
      if (cfg.steps[i].id === id) return i;
    }
    return -1;
  }

  /**
   * The next step in config order, skipping steps that are only reached
   * by an explicit branch (waitlist) or that follow their own timer.
   */
  function nextStepId(fromId) {
    var i = indexOfStep(fromId);
    for (var j = i + 1; j < cfg.steps.length; j++) {
      if (cfg.steps[j].id === 'waitlist') continue;
      return cfg.steps[j].id;
    }
    return null;
  }

  // --- progress ---

  function progressFor(id) {
    // Counts only steps the user actively works through, so the bar reads
    // honestly. Length is never shown as a number (spec section 5).
    var counted = cfg.steps.filter(function (s) {
      return s.type === 'question' || s.type === 'interstitial';
    });
    var idx = counted.findIndex(function (s) {
      return s.id === id;
    });
    if (idx === -1) return 100;
    return Math.round(((idx + 1) / (counted.length + 1)) * 100);
  }

  function setProgress(pct) {
    var bar = root.querySelector('[data-quiz-progress]');
    if (bar) bar.style.width = pct + '%';
  }

  function setBackVisible(visible) {
    var back = root.querySelector('[data-quiz-back]');
    if (back) back.hidden = !visible;
  }

  // --- rendering ---

  function stage() {
    return root.querySelector('[data-quiz-stage]');
  }

  function clearStage() {
    var s = stage();
    while (s.firstChild) s.removeChild(s.firstChild);
  }

  function hideAllStatic() {
    var nodes = root.querySelectorAll('[data-quiz-static]');
    for (var i = 0; i < nodes.length; i++) nodes[i].hidden = true;
  }

  function announce(text) {
    var live = root.querySelector('[data-quiz-live]');
    if (live) live.textContent = text;
  }

  function focusHeading() {
    var h = root.querySelector('[data-quiz-heading]');
    if (h) {
      h.setAttribute('tabindex', '-1');
      h.focus();
    }
  }

  function renderQuestion(step) {
    var s = stage();
    var h = document.createElement('h1');
    h.className = 'quiz-question';
    h.setAttribute('data-quiz-heading', '');
    h.textContent = step.question;
    s.appendChild(h);

    if (step.variant === 'select') {
      var select = document.createElement('select');
      select.className = 'quiz-select';
      select.setAttribute('aria-label', step.question);

      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = step.placeholder || 'Choose one';
      select.appendChild(placeholder);

      step.options.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        select.appendChild(o);
      });

      select.addEventListener('change', function () {
        if (!select.value) return;
        answer(step.key, select.value);
      });

      s.appendChild(select);
    } else {
      var group = document.createElement('div');
      group.className = 'quiz-options';
      group.setAttribute('role', 'radiogroup');
      group.setAttribute('aria-label', step.question);

      step.options.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'quiz-option';
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', 'false');
        b.textContent = opt.label;
        b.addEventListener('click', function () {
          b.setAttribute('aria-checked', 'true');
          b.classList.add('is-selected');
          // Brief highlight so the tap registers visually before advancing.
          window.setTimeout(function () {
            answer(step.key, opt.value);
          }, reduceMotion ? 0 : 180);
        });
        group.appendChild(b);
      });

      s.appendChild(group);
    }

    announce(step.question);
    focusHeading();
  }

  function renderInterstitial(step) {
    var s = stage();
    var wrap = document.createElement('div');
    wrap.className = 'quiz-interstitial';

    var h = document.createElement('h1');
    h.className = 'quiz-question';
    h.setAttribute('data-quiz-heading', '');
    h.textContent = step.headline;
    wrap.appendChild(h);

    var p = document.createElement('p');
    p.className = 'quiz-interstitial-body';
    p.textContent = step.body;
    wrap.appendChild(p);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quiz-btn';
    btn.textContent = step.cta || 'Next';
    btn.addEventListener('click', function () {
      goTo(nextStepId(step.id));
    });
    wrap.appendChild(btn);

    s.appendChild(wrap);
    announce(step.headline);
    focusHeading();
  }

  function renderProcessing(step) {
    var s = stage();
    var wrap = document.createElement('div');
    wrap.className = 'quiz-processing';

    var spinner = document.createElement('div');
    spinner.className = 'quiz-spinner';
    if (reduceMotion) spinner.classList.add('is-static');
    wrap.appendChild(spinner);

    var h = document.createElement('h1');
    h.className = 'quiz-processing-text';
    h.setAttribute('data-quiz-heading', '');
    h.textContent = step.headline;
    wrap.appendChild(h);

    s.appendChild(wrap);
    announce(step.headline);

    recommendation = cfg.recommend(answers);
    if (hooks.onComplete) hooks.onComplete(recommendation);

    window.setTimeout(
      function () {
        goTo(nextStepId(step.id));
      },
      reduceMotion ? step.reducedMotionMs : step.durationMs
    );
  }

  function renderStatic(step) {
    var el = document.getElementById(step.elementId);
    if (el) {
      el.hidden = false;
      var h = el.querySelector('[data-quiz-heading]');
      if (h) {
        h.setAttribute('tabindex', '-1');
        h.focus();
        announce(h.textContent);
      }
    }
  }

  // --- flow ---

  function answer(key, value) {
    answers[key] = value;
    save();
    if (hooks.onAnswer) hooks.onAnswer(key, value);

    var step = stepById(currentId);

    // The one branch in the flow: an unlicensed state goes to the waitlist
    // and never reaches the calendar (spec section 5.5).
    if (key === 'state' && !cfg.isLicensed(value)) {
      goTo('waitlist');
      return;
    }

    goTo(nextStepId(step.id));
  }

  function render(id) {
    var step = stepById(id);
    if (!step) return;

    clearStage();
    hideAllStatic();
    currentId = id;

    setProgress(progressFor(id));
    setBackVisible(indexOfStep(id) > 0 && step.type !== 'processing');

    if (step.type === 'question') renderQuestion(step);
    else if (step.type === 'interstitial') renderInterstitial(step);
    else if (step.type === 'processing') renderProcessing(step);
    else if (step.type === 'static') renderStatic(step);

    if (hooks.onStep) hooks.onStep(id);
    window.scrollTo(0, 0);
  }

  function goTo(id) {
    if (!id) return;
    if (window.location.hash !== '#/' + id) {
      window.history.pushState({ stepId: id }, '', '#/' + id);
    }
    render(id);
  }

  function onPopState() {
    var id = (window.location.hash || '').replace('#/', '');
    // Never let Back land on the processing screen — it would re-fire its timer
    // and bounce the user forward again.
    var step = stepById(id);
    if (step && step.type === 'processing') {
      window.history.back();
      return;
    }
    render(id || cfg.steps[0].id);
  }

  function mount(rootEl, config, h) {
    root = rootEl;
    cfg = config;
    hooks = h || {};
    storageKey = 'mint_quiz_' + config.id;
    load();

    window.addEventListener('popstate', onPopState);

    var back = root.querySelector('[data-quiz-back]');
    if (back) {
      back.addEventListener('click', function () {
        window.history.back();
      });
    }

    var fromHash = (window.location.hash || '').replace('#/', '');
    var startId = stepById(fromHash) ? fromHash : cfg.steps[0].id;
    if (!stepById(fromHash)) {
      window.history.replaceState({ stepId: startId }, '', '#/' + startId);
    }
    render(startId);
  }

  return {
    mount: mount,
    goTo: goTo,
    getState: function () {
      return { answers: answers, stepId: currentId, recommendation: recommendation };
    }
  };
})();
```

- [ ] **Step 2: Verify the engine loads without error**

Run: `node -e "global.window={matchMedia:()=>({matches:false}),addEventListener(){},location:{hash:''},history:{}};global.document={};require('./js/quiz-engine.js');console.log(typeof window.QuizEngine.mount)"`
Expected: prints `function`

- [ ] **Step 3: Re-run the Task 1 tests to confirm nothing regressed**

Run: `node --test tests/*.test.js`
Expected: PASS — all tests still passing.

- [ ] **Step 4: Commit**

```bash
git add js/quiz-engine.js
git commit -m "feat(funnel): add reusable quiz engine"
```

---

### Task 3: Quiz shell, styles, and question steps

Builds `start/index.html` far enough to run the three questions, the interstitial, the state gate and the processing screen. The static steps are added as empty stubs here and filled in by Tasks 4–6.

**Files:**
- Create: `start/index.html`

**Interfaces:**
- Consumes: `QuizEngine.mount` (Task 2), `MensHealthQuiz` (Task 1).
- Produces: DOM ids `stepWaitlist`, `stepRecommendation`, `stepContact`, `stepSchedule`, each carrying `data-quiz-static` and `hidden`. Later tasks fill these.

- [ ] **Step 1: Create the quiz shell**

Create `start/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#3EB489">
<title>Start Your Visit | Mint Medical Clinic</title>
<meta name="description" content="Answer three quick questions and book a virtual consultation with a Utah-licensed provider.">
<meta name="robots" content="noindex, follow">
<link rel="icon" type="image/png" href="../images/Untitled design (1).png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --mint: #3EB489;
    --mint-dark: #2f9670;
    --mint-deep: #1f6b50;
    --mint-light: #e8f5f0;
    --mint-pale: #f7fbf9;
    --gold: #c9a96e;
    --ink: #1a2b27;
    --ink-soft: #3d4f4a;
    --cream: #faf7f2;
    --gray-200: #e7e9e8;
    --gray-500: #8a9694;
    --gray-700: #4a5856;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--ink);
    background: var(--cream);
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
  }
  h1, h2, h3 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 600;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  /* --- chrome: logo, progress, back. Nothing else competes for attention. --- */
  .quiz-head {
    position: sticky; top: 0; z-index: 10;
    background: var(--cream);
    padding: 18px 16px 0;
  }
  .quiz-head-inner {
    max-width: 560px; margin: 0 auto;
    display: flex; align-items: center; gap: 12px;
  }
  .quiz-back {
    background: none; border: 0; cursor: pointer;
    padding: 8px; margin-left: -8px;
    color: var(--gray-500); line-height: 0;
    min-width: 44px; min-height: 44px;
  }
  .quiz-back:hover { color: var(--ink); }
  .quiz-logo { height: 22px; margin: 0 auto; display: block; }
  .quiz-back-spacer { min-width: 44px; }
  .quiz-progress-track {
    max-width: 560px; margin: 16px auto 0;
    height: 2px; background: var(--gray-200); border-radius: 2px;
  }
  .quiz-progress-bar {
    height: 100%; width: 0; background: var(--mint);
    border-radius: 2px; transition: width .4s ease;
  }

  /* --- stage --- */
  .quiz-main { padding: 40px 16px 80px; }
  .quiz-stage, .quiz-static { max-width: 560px; margin: 0 auto; }
  .quiz-question {
    font-size: clamp(1.75rem, 5vw, 2.4rem);
    margin-bottom: 28px;
  }

  /* --- options: full-width pills, one tap, auto-advance --- */
  .quiz-options { display: flex; flex-direction: column; gap: 10px; }
  .quiz-option {
    display: block; width: 100%; min-height: 56px;
    padding: 16px 20px; text-align: left;
    font-family: inherit; font-size: 16px; color: var(--ink);
    background: #fff; border: 1px solid var(--gray-200); border-radius: 10px;
    cursor: pointer; transition: border-color .15s, background .15s, transform .1s;
  }
  .quiz-option:hover { border-color: var(--mint); background: var(--mint-pale); }
  .quiz-option:focus-visible { outline: 2px solid var(--mint-deep); outline-offset: 2px; }
  .quiz-option.is-selected { border-color: var(--mint); background: var(--mint-light); }

  .quiz-select {
    width: 100%; min-height: 56px; padding: 16px 20px;
    font-family: inherit; font-size: 16px; color: var(--ink);
    background: #fff; border: 1px solid var(--gray-200); border-radius: 10px;
  }
  .quiz-select:focus-visible { outline: 2px solid var(--mint-deep); outline-offset: 2px; }

  .quiz-btn {
    display: inline-block; min-height: 52px; padding: 15px 32px;
    font-family: inherit; font-size: 16px; font-weight: 600;
    color: #fff; background: var(--mint-deep);
    border: 0; border-radius: 999px; cursor: pointer;
  }
  .quiz-btn:hover { background: var(--ink); }
  .quiz-btn:focus-visible { outline: 2px solid var(--mint-deep); outline-offset: 3px; }
  .quiz-btn-block { display: block; width: 100%; }

  .quiz-interstitial { text-align: center; }
  .quiz-interstitial-body {
    color: var(--ink-soft); margin: 18px auto 30px; max-width: 440px;
  }

  .quiz-processing { text-align: center; padding-top: 60px; }
  .quiz-spinner {
    width: 54px; height: 54px; margin: 0 auto 26px;
    border: 2px solid var(--gray-200); border-top-color: var(--mint);
    border-radius: 50%; animation: quiz-spin 1s linear infinite;
  }
  .quiz-spinner.is-static { animation: none; border-top-color: var(--gray-200); }
  @keyframes quiz-spin { to { transform: rotate(360deg); } }
  .quiz-processing-text { font-size: clamp(1.4rem, 4vw, 1.9rem); color: var(--ink-soft); }

  .quiz-sr {
    position: absolute; width: 1px; height: 1px; overflow: hidden;
    clip: rect(0 0 0 0); white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: .01ms !important; transition-duration: .01ms !important; }
  }
</style>
</head>
<body>

<header class="quiz-head">
  <div class="quiz-head-inner">
    <button class="quiz-back" type="button" data-quiz-back hidden aria-label="Go back">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <img class="quiz-logo" src="../images/mint-medical-logo.png" alt="Mint Medical Clinic">
    <span class="quiz-back-spacer" aria-hidden="true"></span>
  </div>
  <div class="quiz-progress-track">
    <div class="quiz-progress-bar" data-quiz-progress></div>
  </div>
</header>

<main class="quiz-main" id="quizRoot">
  <div class="quiz-sr" data-quiz-live aria-live="polite" role="status"></div>
  <div class="quiz-stage" data-quiz-stage></div>

  <!-- Static steps. Filled in by Tasks 4-6. Present in the HTML at build time
       so Netlify Forms can detect the capture form. -->
  <section class="quiz-static" id="stepWaitlist" data-quiz-static hidden></section>
  <section class="quiz-static" id="stepRecommendation" data-quiz-static hidden></section>
  <section class="quiz-static" id="stepContact" data-quiz-static hidden></section>
  <section class="quiz-static" id="stepSchedule" data-quiz-static hidden></section>
</main>

<script src="../js/quiz-mens-health.js"></script>
<script src="../js/quiz-engine.js"></script>
<script>
  QuizEngine.mount(document.getElementById('quizRoot'), window.MensHealthQuiz, {});
</script>
</body>
</html>
```

- [ ] **Step 2: Serve the site and walk the quiz**

Run: `python3 -m http.server 8000`
Open: `http://localhost:8000/start/`

Verify, in order:
1. Q1 "What's your goal?" renders with four options.
2. Tapping an option highlights it, then **auto-advances** — no Next button.
3. The URL becomes `#/proof`, then `#/tried`, `#/priority`, `#/state`.
4. The progress bar grows and shows **no numbers**.
5. The back chevron appears from step 2 and the browser Back button works.
6. Choosing `UT` advances to the processing screen; it shows ~2.5s then lands on `#/recommendation` (an empty section for now — expected).
7. Choosing `CA` goes to `#/waitlist` (empty for now — expected) and **never reaches** `#/recommendation`.

- [ ] **Step 3: Verify keyboard and reduced-motion**

1. Reload, then complete Q1 using Tab and Enter only. Focus rings must be visible.
2. macOS: System Settings → Accessibility → Display → Reduce Motion, on. Reload. The spinner must not spin and the processing screen must last well under a second.

- [ ] **Step 4: Verify storage failure does not break the quiz**

1. Open the page in a private window, answer Q1, and confirm no console error.
2. In DevTools console run `sessionStorage.clear()` mid-quiz and continue — the quiz must still advance.

- [ ] **Step 5: Commit**

```bash
git add start/index.html
git commit -m "feat(funnel): add quiz shell with question, interstitial and processing steps"
```

---

### Task 4: Recommendation reveal and the waitlist screen

**Files:**
- Modify: `start/index.html` (fill `#stepRecommendation` and `#stepWaitlist`, add styles and wiring)

**Interfaces:**
- Consumes: `QuizEngine.getState().recommendation`, `MensHealthQuiz.products` (Task 1).
- Produces: a `renderRecommendation(key)` function in the page's inline script, called from the engine's `onStep` hook when `stepId === 'recommendation'`.

- [ ] **Step 1: Add the recommendation and waitlist styles**

Add inside the existing `<style>` block in `start/index.html`, before the `@media (prefers-reduced-motion)` rule:

```css
  .rec-eyebrow {
    font-size: 12px; font-weight: 600; letter-spacing: .18em;
    text-transform: uppercase; color: var(--mint-deep); display: block; margin-bottom: 6px;
  }
  .rec-name { font-size: clamp(2rem, 6vw, 2.8rem); margin-bottom: 10px; }
  .rec-tagline { color: var(--ink-soft); margin-bottom: 24px; }
  .rec-image { display: block; max-width: 240px; margin: 0 auto 26px; }
  .rec-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
  .rec-chip {
    font-size: 13px; padding: 8px 14px; border-radius: 999px;
    background: var(--mint-light); color: var(--mint-deep);
  }
  .rec-why {
    background: #fff; border: 1px solid var(--gray-200); border-radius: 10px;
    padding: 18px 20px; margin-bottom: 24px; color: var(--ink-soft); font-size: 15px;
  }
  .rec-price { font-size: 15px; color: var(--gray-700); margin-bottom: 26px; }
  .rec-faq { border-top: 1px solid var(--gray-200); margin-bottom: 26px; }
  .rec-faq details { border-bottom: 1px solid var(--gray-200); }
  .rec-faq summary {
    padding: 16px 0; cursor: pointer; font-weight: 600; font-size: 15px; list-style: none;
  }
  .rec-faq summary::-webkit-details-marker { display: none; }
  .rec-faq summary::after { content: '+'; float: right; color: var(--mint-deep); }
  .rec-faq details[open] summary::after { content: '–'; }
  .rec-faq p { padding: 0 0 16px; color: var(--ink-soft); font-size: 15px; }
  .rec-quote {
    background: var(--mint-pale); border-radius: 10px; padding: 20px; margin-bottom: 26px;
    font-size: 15px; color: var(--ink-soft);
  }
  .rec-quote cite { display: block; margin-top: 10px; font-style: normal; color: var(--gray-500); font-size: 13px; }
  .rec-switch {
    display: block; text-align: center; margin-top: 16px;
    font-size: 14px; color: var(--gray-500); background: none; border: 0;
    cursor: pointer; text-decoration: underline; width: 100%;
  }
  /* Sticky CTA must never cover the last element above it. */
  .rec-sticky {
    position: sticky; bottom: 0; background: var(--cream);
    padding: 14px 0 18px; margin-top: 8px;
    box-shadow: 0 -12px 20px -12px rgba(26,43,39,.18);
  }
  .waitlist-note { color: var(--ink-soft); margin: 14px 0 24px; }
```

- [ ] **Step 2: Fill the recommendation and waitlist sections**

Replace the two empty `<section>` stubs in `start/index.html`:

```html
  <section class="quiz-static" id="stepRecommendation" data-quiz-static hidden>
    <span class="rec-eyebrow">Your recommendation</span>
    <h1 class="rec-name" data-quiz-heading data-rec-name></h1>
    <p class="rec-tagline" data-rec-tagline></p>
    <img class="rec-image" data-rec-image src="" alt="">
    <div class="rec-chips" data-rec-chips></div>
    <div class="rec-why" data-rec-why></div>
    <p class="rec-price" data-rec-price></p>

    <div class="rec-faq">
      <details>
        <summary>Do I need a prescription?</summary>
        <p>Yes. A Utah-licensed provider reviews your consultation and prescribes only if it's appropriate for you. That's the visit you're about to book.</p>
      </details>
      <details>
        <summary>What happens on the consultation?</summary>
        <p>About fifteen minutes, by phone or video. Your provider asks about your health and goals, answers your questions, and confirms your dose. No waiting room.</p>
      </details>
      <details>
        <summary>Will the packaging give it away?</summary>
        <p>No. Everything ships in discreet, unmarked packaging, and it's billed discreetly too.</p>
      </details>
      <details>
        <summary>What if this isn't the right fit for me?</summary>
        <p>Your provider may recommend something different once they've talked with you. Nothing is locked in by this quiz.</p>
      </details>
    </div>

    <blockquote class="rec-quote">
      &ldquo;Booked it on a Tuesday, talked to an actual provider that week. No pharmacy counter, no awkward conversation.&rdquo;
      <cite>Verified Mint Medical patient</cite>
    </blockquote>

    <div class="rec-sticky">
      <button type="button" class="quiz-btn quiz-btn-block" data-rec-continue>Continue</button>
      <button type="button" class="rec-switch" data-rec-switch></button>
    </div>
  </section>

  <section class="quiz-static" id="stepWaitlist" data-quiz-static hidden>
    <h1 class="quiz-question" data-quiz-heading>We're not licensed in your state yet.</h1>
    <p class="waitlist-note">
      Mint Medical providers can only treat patients in the states we're licensed in, and yours isn't one of them yet.
      Leave your email and we'll tell you the moment that changes. No other emails, ever.
    </p>
    <form name="mens-health-waitlist" method="POST" data-netlify="true" netlify-honeypot="bot-field" id="waitlistForm">
      <input type="hidden" name="form-name" value="mens-health-waitlist">
      <input type="hidden" name="state" data-waitlist-state value="">
      <p hidden aria-hidden="true"><label>Leave this empty: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
      <label class="quiz-sr" for="waitlistEmail">Email address</label>
      <input class="quiz-select" type="email" id="waitlistEmail" name="email" placeholder="you@example.com" autocomplete="email" required>
      <div style="height:12px"></div>
      <button type="submit" class="quiz-btn quiz-btn-block">Add me to the list</button>
    </form>
  </section>
```

- [ ] **Step 3: Wire the rendering**

Replace the mount call at the bottom of `start/index.html`:

```html
<script>
  (function () {
    var cfg = window.MensHealthQuiz;
    var root = document.getElementById('quizRoot');

    // Copy that references the user's own answers — the payoff for the
    // processing screen. Must reflect real input, never boilerplate.
    var WHY = {
      goal: {
        faster: 'you want things to start faster',
        longer: 'you want to stay hard longer',
        both: 'you want both speed and staying power',
        confidence: 'you want to feel confident again'
      },
      tried: {
        none: "you haven't tried a prescription yet",
        'not-enough': "the blue pill hasn't done enough",
        planning: "you're tired of planning around a pill",
        stronger: 'you want something stronger than what you have tried'
      }
    };

    function renderRecommendation(key) {
      var p = cfg.products[key];
      if (!p) return;
      var a = QuizEngine.getState().answers;

      root.querySelector('[data-rec-name]').textContent = p.name;
      root.querySelector('[data-rec-tagline]').textContent = p.tagline;

      var img = root.querySelector('[data-rec-image]');
      img.src = p.image;
      img.alt = p.name;

      var chips = root.querySelector('[data-rec-chips]');
      chips.innerHTML = '';
      p.chips.forEach(function (text) {
        var s = document.createElement('span');
        s.className = 'rec-chip';
        s.textContent = text;
        chips.appendChild(s);
      });

      var bits = [];
      if (WHY.goal[a.goal]) bits.push(WHY.goal[a.goal]);
      if (WHY.tried[a.tried]) bits.push(WHY.tried[a.tried]);
      root.querySelector('[data-rec-why]').textContent = bits.length
        ? 'You told us ' + bits.join(', and ') + '. ' + p.name + ' is the option our providers start most men on for exactly that.'
        : p.name + ' is the option our providers start most men on.';

      root.querySelector('[data-rec-price]').textContent = p.priceLine;

      // Two products means someone may want the other one without restarting.
      var other = key === 'mint-mints' ? 'opti-mint-shot' : 'mint-mints';
      var sw = root.querySelector('[data-rec-switch]');
      sw.textContent = 'See ' + cfg.products[other].name + ' instead';
      sw.onclick = function () {
        renderRecommendation(other);
      };
    }

    root.querySelector('[data-rec-continue]').addEventListener('click', function () {
      QuizEngine.goTo('contact');
    });

    QuizEngine.mount(root, cfg, {
      onStep: function (stepId) {
        if (stepId === 'recommendation') {
          renderRecommendation(QuizEngine.getState().recommendation || 'mint-mints');
          // The engine focuses and announces the heading before this hook runs,
          // so at that moment the product name is still empty. Re-announce now
          // that it has been filled in, or screen readers hear nothing.
          var h = root.querySelector('#stepRecommendation [data-quiz-heading]');
          var live = root.querySelector('[data-quiz-live]');
          if (h && live) {
            live.textContent = 'Your recommendation: ' + h.textContent;
            h.focus();
          }
        }
        if (stepId === 'waitlist') {
          var s = root.querySelector('[data-waitlist-state]');
          if (s) s.value = QuizEngine.getState().answers.state || '';
        }
      }
    });
  })();
</script>
```

- [ ] **Step 4: Verify both recommendation paths**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/start/`

1. Answer "Tried it — want something stronger", state `UT` → must reveal **The Opti-Mint Shot**, price line `$49.97 per shot · as low as $29.80 in a 10-pack`.
2. Reload, answer "Haven't tried anything yet" + "Keeping it private", state `UT` → must reveal **Mint Mints**, price line `Half Batch $197 · Full Batch $297 (reg. $397)`.
3. The "why" paragraph must name the answers actually given.
4. "See … instead" swaps products without restarting the quiz.
5. Product images load (no broken image icon).
6. On a 360px-wide viewport the sticky Continue bar does not cover the switch link.
7. Choose `CA` → waitlist renders, the hidden `state` field reads `CA`.

- [ ] **Step 5: Commit**

```bash
git add start/index.html
git commit -m "feat(funnel): add recommendation reveal and out-of-state waitlist"
```

---

### Task 5: Capture step

**Files:**
- Modify: `start/index.html` (fill `#stepContact`, add styles and submit handling)

**Interfaces:**
- Consumes: `QuizEngine.getState()` (Task 2).
- Produces: Netlify form `mens-health-lead` with fields `email`, `first-name`, `phone`, `quiz-answers`, `recommended-product`, `utm-source`, `utm-campaign`, `fbclid`, `bot-field`.

> **Why the form is static HTML:** Netlify detects forms by parsing deployed HTML at build time. A form injected by JavaScript is never registered and every submission 404s. The markup below therefore ships in the HTML and the engine only reveals it.

- [ ] **Step 1: Add capture styles**

Add inside `<style>` in `start/index.html`, before the reduced-motion rule:

```css
  .cap-benefits { text-align: center; padding: 10px 0 26px; }
  .cap-benefits li { list-style: none; color: var(--ink-soft); padding: 5px 0; font-size: 15px; }
  .cap-sheet {
    background: #fff; border-radius: 16px 16px 0 0;
    padding: 26px 20px 28px; margin: 0 -16px -80px;
    box-shadow: 0 -10px 40px rgba(26,43,39,.10);
  }
  .cap-field { margin-bottom: 14px; }
  .cap-field label { display: block; font-size: 14px; font-weight: 600; margin-bottom: 6px; }
  .cap-field input {
    width: 100%; min-height: 52px; padding: 14px 16px;
    font-family: inherit; font-size: 16px; /* 16px prevents iOS zoom on focus */
    border: 1px solid var(--gray-200); border-radius: 10px; background: #fff;
  }
  .cap-field input:focus-visible { outline: 2px solid var(--mint-deep); outline-offset: 1px; }
  .cap-consent { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px; font-size: 13px; color: var(--gray-700); }
  .cap-consent input { margin-top: 3px; min-width: 18px; min-height: 18px; }
  .cap-expect {
    background: var(--mint-pale); border-radius: 10px;
    padding: 14px 16px; margin-top: 16px; font-size: 14px; color: var(--ink-soft);
  }
  .cap-error { color: #b3261e; font-size: 14px; margin-bottom: 12px; }
```

- [ ] **Step 2: Fill the contact section**

Replace the empty `#stepContact` stub:

```html
  <section class="quiz-static" id="stepContact" data-quiz-static hidden>
    <ul class="cap-benefits">
      <li>Harder, more reliable erections</li>
      <li>A Utah-licensed provider, not an app</li>
      <li>Discreet, unmarked delivery</li>
    </ul>
    <div class="cap-sheet">
      <h1 class="quiz-question" data-quiz-heading style="font-size:1.6rem;margin-bottom:18px;">Let's start your visit.</h1>
      <form name="mens-health-lead" method="POST" data-netlify="true" netlify-honeypot="bot-field" id="leadForm">
        <input type="hidden" name="form-name" value="mens-health-lead">
        <input type="hidden" name="quiz-answers" data-lead-answers value="">
        <input type="hidden" name="recommended-product" data-lead-product value="">
        <input type="hidden" name="utm-source" data-lead-utm-source value="">
        <input type="hidden" name="utm-campaign" data-lead-utm-campaign value="">
        <input type="hidden" name="fbclid" data-lead-fbclid value="">
        <p hidden aria-hidden="true"><label>Leave this empty: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>

        <div class="cap-field">
          <label for="leadEmail">Email address</label>
          <input type="email" id="leadEmail" name="email" autocomplete="email" required>
        </div>
        <div class="cap-field">
          <label for="leadName">First name</label>
          <input type="text" id="leadName" name="first-name" autocomplete="given-name" required>
        </div>
        <div class="cap-field">
          <label for="leadPhone">Mobile number</label>
          <input type="tel" id="leadPhone" name="phone" autocomplete="tel" inputmode="tel" required>
        </div>

        <label class="cap-consent">
          <input type="checkbox" id="leadConsentTelehealth" required>
          <span>I agree to the <a href="/privacy-policy">Privacy Policy</a> and consent to telehealth.</span>
        </label>
        <label class="cap-consent">
          <input type="checkbox" id="leadConsentContact" required>
          <span>I agree to receive calls and texts from Mint Medical Clinic about my consultation.</span>
        </label>

        <div class="cap-error" id="leadError" role="alert" hidden></div>
        <button type="submit" class="quiz-btn quiz-btn-block" id="leadSubmit">Continue to scheduling</button>

        <div class="cap-expect">
          A Mint provider will call you from <strong>(801) 804-8000</strong> at the time you choose.
          Save the number so you know it's us.
        </div>
      </form>
    </div>
  </section>
```

- [ ] **Step 3: Add submit handling**

Add inside the page's existing IIFE in `start/index.html`, before the `QuizEngine.mount(...)` call:

```js
    // --- attribution: capture on landing, carry into the lead record ---
    var params = new URLSearchParams(window.location.search);
    function attr(name) {
      var fromUrl = params.get(name);
      if (fromUrl) {
        try { sessionStorage.setItem('mint_' + name, fromUrl); } catch (e) {}
        return fromUrl;
      }
      try { return sessionStorage.getItem('mint_' + name) || ''; } catch (e) { return ''; }
    }

    function encode(data) {
      return Object.keys(data)
        .map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(data[k]);
        })
        .join('&');
    }

    var leadForm = document.getElementById('leadForm');
    var leadError = document.getElementById('leadError');
    var leadSubmit = document.getElementById('leadSubmit');

    leadForm.addEventListener('submit', function (e) {
      e.preventDefault();
      leadError.hidden = true;

      var state = QuizEngine.getState();
      root.querySelector('[data-lead-answers]').value = JSON.stringify(state.answers);
      root.querySelector('[data-lead-product]').value = state.recommendation || '';
      root.querySelector('[data-lead-utm-source]').value = attr('utm_source');
      root.querySelector('[data-lead-utm-campaign]').value = attr('utm_campaign');
      root.querySelector('[data-lead-fbclid]').value = attr('fbclid');

      var payload = {};
      new FormData(leadForm).forEach(function (v, k) { payload[k] = v; });

      leadSubmit.disabled = true;
      leadSubmit.textContent = 'One moment…';

      function advance() {
        leadSubmit.disabled = false;
        leadSubmit.textContent = 'Continue to scheduling';
        QuizEngine.goTo('schedule');
      }

      // A booking is worth more than a form record: one retry, then advance
      // regardless. Losing the booking because the form 500'd is the worst outcome.
      function post(retriesLeft) {
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: encode(payload)
        })
          .then(advance)
          .catch(function () {
            if (retriesLeft > 0) { post(retriesLeft - 1); return; }
            advance();
          });
      }
      post(1);
    });
```

- [ ] **Step 4: Verify the form**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/start/?utm_source=facebook&utm_campaign=test123`

1. Reach the contact step; the sheet slides over the benefits list.
2. Submitting with either consent box unchecked is blocked by the browser.
3. On an iPhone-width viewport, focusing a field must **not** zoom the page (this is what the 16px font size guarantees).
4. Fill the form and submit. Locally the POST to `/` will fail — confirm it **still advances** to `#/schedule` after the retry. That failure path is the one being tested.
5. In DevTools → Network, inspect the POST body: it must contain `form-name=mens-health-lead`, the `quiz-answers` JSON, `recommended-product`, and `utm-source=facebook`.

- [ ] **Step 5: Commit**

```bash
git add start/index.html
git commit -m "feat(funnel): add lead capture with consent and attribution"
```

---

### Task 6: Scheduling and confirmation

**Files:**
- Modify: `start/index.html` (fill `#stepSchedule`)
- Create: `start/confirmed.html`

**Interfaces:**
- Consumes: `QuizEngine.goTo` (Task 2).
- Produces: the page `start/confirmed.html`.

> **Highest-risk item in the build.** If Zoho refuses framing, the iframe renders blank and the funnel dies silently at the final step. Step 2 verifies this explicitly and is build-blocking.

- [ ] **Step 1: Fill the schedule section**

Add these styles inside `<style>`:

```css
  .sched-intro { margin-bottom: 20px; }
  .sched-intro p { color: var(--ink-soft); margin-top: 8px; }
  .sched-frame-wrap {
    position: relative; border: 1px solid var(--gray-200);
    border-radius: 12px; overflow: hidden; background: #fff; min-height: 620px;
  }
  .sched-frame { width: 100%; height: 620px; border: 0; display: block; }
  .sched-fallback { padding: 26px 20px; text-align: center; }
  .sched-fallback p { color: var(--ink-soft); margin-bottom: 18px; }
  .sched-done {
    display: block; width: 100%; text-align: center; margin-top: 16px;
    font-size: 14px; color: var(--gray-500); background: none; border: 0;
    cursor: pointer; text-decoration: underline;
  }
```

Replace the empty `#stepSchedule` stub:

```html
  <section class="quiz-static" id="stepSchedule" data-quiz-static hidden>
    <div class="sched-intro">
      <h1 class="quiz-question" data-quiz-heading style="font-size:1.7rem;margin-bottom:0;">Pick a time with a Utah provider.</h1>
      <p>
        Fifteen minutes, by phone or video. No waiting room, no pharmacy counter.
        Your provider confirms your dose and sends it discreetly.
      </p>
    </div>

    <div class="sched-frame-wrap">
      <iframe
        class="sched-frame"
        id="schedFrame"
        data-src="https://new-consultation.zohobookings.com/#/mintmedicalclinic"
        title="Book your consultation"
        loading="lazy"></iframe>

      <!-- Shown only if the embed is blocked. See step 2. -->
      <div class="sched-fallback" id="schedFallback" hidden>
        <p>Booking opens in a new tab. Pick your time, then come back here.</p>
        <a class="quiz-btn quiz-btn-block" href="https://new-consultation.zohobookings.com/#/mintmedicalclinic" target="_blank" rel="noopener">Choose your time</a>
      </div>
    </div>

    <button type="button" class="sched-done" id="schedDone">I've booked my time →</button>
  </section>
```

Add to the page IIFE, before `QuizEngine.mount(...)`:

```js
    document.getElementById('schedDone').addEventListener('click', function () {
      window.location.href = '/start/confirmed.html';
    });
```

And inside the `onStep` hook added in Task 4, add:

```js
        if (stepId === 'schedule') {
          // Lazy-load: the third-party embed must never block the quiz.
          var f = document.getElementById('schedFrame');
          if (f && !f.src && f.dataset.src) f.src = f.dataset.src;
        }
```

- [ ] **Step 2: Verify the Zoho embed actually renders (BUILD-BLOCKING)**

Run: `python3 -m http.server 8000`, complete the quiz to `#/schedule`.

1. The Zoho calendar must render with selectable times. Open DevTools → Console.
2. If the console shows a `X-Frame-Options` or `frame-ancestors` refusal and the frame is blank, the embed is blocked. Apply the fallback:

```js
        // Add inside the `stepId === 'schedule'` branch, after setting f.src.
        // If the frame never reports a load, assume it was refused and swap
        // in the new-tab fallback rather than showing the user a blank box.
        window.setTimeout(function () {
          var loaded = false;
          try { loaded = !!(f.contentWindow && f.contentWindow.length >= 0); } catch (err) { loaded = true; }
          if (!loaded) {
            f.hidden = true;
            document.getElementById('schedFallback').hidden = false;
          }
        }, 2500);
```

3. Re-verify: whichever path applies, a user must always be able to reach a real Zoho booking screen. **Do not proceed to step 3 until one of the two paths works.**

- [ ] **Step 3: Create the confirmation page**

Create `start/confirmed.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#3EB489">
<title>You're Booked | Mint Medical Clinic</title>
<meta name="robots" content="noindex, follow">
<link rel="icon" type="image/png" href="../images/Untitled design (1).png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --mint: #3EB489; --mint-deep: #1f6b50; --mint-light: #e8f5f0; --mint-pale: #f7fbf9;
    --ink: #1a2b27; --ink-soft: #3d4f4a; --cream: #faf7f2;
    --gray-200: #e7e9e8; --gray-500: #8a9694;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    color: var(--ink); background: var(--cream); line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  h1 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 600; line-height: 1.15; }
  .wrap { max-width: 560px; margin: 0 auto; padding: 40px 16px 60px; }
  .logo { height: 24px; display: block; margin: 0 auto 36px; }
  .tick {
    width: 56px; height: 56px; border-radius: 50%; background: var(--mint-light);
    color: var(--mint-deep); display: flex; align-items: center; justify-content: center;
    margin: 0 auto 22px;
  }
  h1 { font-size: clamp(1.9rem, 5vw, 2.5rem); text-align: center; margin-bottom: 12px; }
  .lede { text-align: center; color: var(--ink-soft); margin-bottom: 30px; }
  .card { background: #fff; border: 1px solid var(--gray-200); border-radius: 12px; padding: 22px; margin-bottom: 18px; }
  .card h2 { font-size: 15px; font-weight: 600; margin-bottom: 10px; font-family: 'Inter', sans-serif; }
  .card p { color: var(--ink-soft); font-size: 15px; }
  .num { font-size: 22px; font-weight: 600; color: var(--mint-deep); display: block; margin: 6px 0 4px; }
  .btn {
    display: block; text-align: center; text-decoration: none;
    min-height: 52px; padding: 15px 28px; border-radius: 999px;
    font-weight: 600; color: #fff; background: var(--mint-deep); margin-top: 24px;
  }
  .foot { text-align: center; font-size: 13px; color: var(--gray-500); margin-top: 30px; }
  .foot a { color: var(--gray-500); }
</style>
</head>
<body>
<div class="wrap">
  <img class="logo" src="../images/mint-medical-logo.png" alt="Mint Medical Clinic">

  <div class="tick">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
  </div>

  <h1>You're booked.</h1>
  <p class="lede">Check your email — your confirmation and calendar invite are on the way.</p>

  <div class="card">
    <h2>Who's calling</h2>
    <p>A Mint Medical provider, licensed in Utah — not a call centre.</p>
  </div>

  <div class="card">
    <h2>From this number</h2>
    <span class="num">(801) 804-8000</span>
    <p>Save it now so you know it's us when we ring at your chosen time.</p>
  </div>

  <div class="card">
    <h2>What to have ready</h2>
    <p>Nothing. Your provider will ask about your health and goals on the call. It takes about fifteen minutes.</p>
  </div>

  <a class="btn" href="tel:8018048000">Call us now instead</a>

  <p class="foot">
    Questions before your visit? Call <a href="tel:8018048000">(801) 804-8000</a>.<br>
    Sandy &amp; Layton, Utah &nbsp;&middot;&nbsp; Se habla español
  </p>
</div>

<script>
  // The funnel is finished; drop the working state.
  try { sessionStorage.removeItem('mint_quiz_mens-health'); } catch (e) {}
</script>
</body>
</html>
```

- [ ] **Step 4: Verify the confirmation page**

Open `http://localhost:8000/start/confirmed.html`.

1. Phone number reads (801) 804-8000 in both places; the `tel:` link works on mobile.
2. Renders correctly at 360px with no horizontal scroll.
3. Complete the full quiz, click "I've booked my time", and confirm `sessionStorage` no longer holds `mint_quiz_mens-health` (DevTools → Application → Session Storage).

- [ ] **Step 5: Commit**

```bash
git add start/index.html start/confirmed.html
git commit -m "feat(funnel): add scheduling embed and confirmation page"
```

---

### Task 7: Landing page

**Files:**
- Create: `lp/mens-health.html`

**Interfaces:**
- Consumes: nothing. Every CTA links to `/start`.
- Produces: the page at `/mens-health` (route added in Task 8).

- [ ] **Step 1: Build the landing page**

Create `lp/mens-health.html`, following `lp/opti-mint-shot.html`'s conventions exactly: same `<head>` block (charset, viewport with `viewport-fit=cover`, `theme-color`, `noindex, follow`, favicon, font preconnects and the same Google Fonts URL), the same `:root` token block, and the same `.lp-footer` markup.

**Do not include the Snipcart script.** This page sells a consultation, not a cart (Global Constraints).

The offer bar and hero carry the conversion weight and are specified as markup. Use exactly this, then build the remaining sections to the content spec below it:

```html
<div class="offer-bar" id="offerBar">
  <span>First visit is free — you only pay if a provider prescribes.</span>
  <button type="button" aria-label="Dismiss" onclick="document.getElementById('offerBar').hidden=true">&times;</button>
</div>

<section class="hero">
  <div class="container hero-grid">
    <div class="hero-content">
      <span class="eyebrow">Men's Health &middot; Sandy &amp; Layton, Utah</span>
      <h1>5 reasons men in Utah stopped planning around the blue pill</h1>
      <p>
        A Utah-licensed provider, a prescription built around you, and discreet delivery.
        Start with three quick questions — no waiting room, no pharmacy counter.
      </p>
      <div class="hero-ctas">
        <a class="btn btn-primary" href="/start">Start your free visit</a>
        <a class="btn-text" href="/start">See if it's right for me</a>
      </div>
      <p class="hero-reassure">
        Free online visit &nbsp;&middot;&nbsp; No insurance required &nbsp;&middot;&nbsp; Discreet shipping
      </p>
    </div>
    <div class="hero-image-wrap">
      <img class="hero-image" src="../images/optimint-shot-vertical.webp" alt="Mint Medical men's health treatments">
    </div>
  </div>
</section>

<section class="trust-strip">
  <div class="container">
    <span>Utah-licensed providers</span>
    <span>Sandy &amp; Layton clinics</span>
    <span>Discreet, unmarked packaging</span>
  </div>
</section>
```

Remaining sections, in order (spec section 4):
4. **The 5 reasons** — numbered list delivering what the H1 promised.
5. **Both products side by side** — two cards. Mint Mints: `Half Batch $197 · Full Batch $297 (reg. $397)`. Opti-Mint Shot: `$49.97 per shot · as low as $29.80 in a 10-pack`. Each card's CTA goes to `/start`. **No add-to-cart anywhere.**
6. **"5 minutes, 4 steps"** — `Answer a few questions` → `Meet a Utah provider — 15 minutes, phone or video` → `Your prescription is approved` → `It arrives discreetly`. Step 2 frames the consult as the benefit, never as a hurdle.
7. **Comparison** — versus the blue pill, and versus mail-order apps (a real provider, not an app).
8. **FAQ** — at minimum: Do I need a prescription? · What happens on the consultation? · How fast does it work? · Will the packaging give it away? · Which one is right for me?
9. **Final CTA** → `/start`.
10. **LP footer** — copied from `lp/opti-mint-shot.html` (logo, both addresses, Privacy / Refund Policy / phone).

- [ ] **Step 2: Verify the landing page**

Run: `python3 -m http.server 8000`, open `http://localhost:8000/lp/mens-health.html`.

1. **Every CTA** goes to `/start`. Confirm with: `grep -oE 'href="[^"]*"' lp/mens-health.html | sort -u` — there must be no `snipcart`, no `/Products/`, no `buy-button`.
2. Prices match the Global Constraints exactly.
3. No site-wide header or nav is present.
4. At 360px there is no horizontal scroll and the hero CTA is full width.
5. Fonts and mint colours match `lp/opti-mint-shot.html` side by side.

- [ ] **Step 3: Commit**

```bash
git add lp/mens-health.html
git commit -m "feat(funnel): add men's health landing page"
```

---

### Task 8: Routes and tracking

Wires the clean URLs and closes the two analytics gaps found during the survey: the Opti-Mint Shot LP has no Meta Pixel, and the site has no GA4 at all.

**Files:**
- Modify: `netlify.toml`
- Modify: `lp/mens-health.html`, `start/index.html`, `start/confirmed.html`

**Interfaces:**
- Consumes: the `onStep` hook (Task 4) and the lead submit handler (Task 5).
- Produces: routes `/mens-health` and `/start`; events `ViewContent`, `Lead`, `Schedule`, and GA4 `quiz_step_<id>`.

- [ ] **Step 1: Add the redirects**

Add to `netlify.toml`, in the "Clean URLs for ad landing pages" group:

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

`/mens-performance` already 200s to the acoustic-wave LP and is deliberately left alone so live ad traffic keeps working.

- [ ] **Step 2: Add the Meta Pixel to all three funnel pages**

Add to `<head>` of `lp/mens-health.html`, `start/index.html` and `start/confirmed.html`:

```html
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','985745890592891');
fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none" alt=""
src="https://www.facebook.com/tr?id=985745890592891&ev=PageView&noscript=1"></noscript>
```

- [ ] **Step 3: Add GA4 to all three funnel pages**

GA4 is currently absent site-wide. Add to `<head>` of the same three pages, replacing `G-XXXXXXXXXX` with the real Measurement ID from the Mint Medical GA4 property:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

If no GA4 property exists yet, create one first — per-question drop-off is the measurement this whole rebuild is designed to expose, and shipping without it means repeating the GLP-1 funnel's blind spot.

- [ ] **Step 4: Fire the step and conversion events**

In `start/index.html`, extend the `onStep` hook (Task 4) so its first lines are:

```js
        if (window.gtag) gtag('event', 'quiz_step_' + stepId);
```

In the lead submit handler (Task 5), inside `advance()`, before `QuizEngine.goTo('schedule')`:

```js
        if (window.fbq) fbq('track', 'Lead');
        if (window.gtag) gtag('event', 'quiz_lead_captured');
```

In `start/confirmed.html`, inside the existing `<script>`:

```js
  if (window.fbq) fbq('track', 'Schedule');
  if (window.gtag) gtag('event', 'quiz_consult_booked');
```

In `lp/mens-health.html`, after the pixel init:

```js
  fbq('track', 'ViewContent');
```

**Captured and booked must stay separate events.** Conflating them is exactly what hides the failure this rebuild exists to fix.

- [ ] **Step 5: Verify routes and events**

Run: `netlify dev` (serves redirects, which `python3 -m http.server` cannot).

1. `http://localhost:8888/mens-health` serves the landing page.
2. `http://localhost:8888/start` serves the quiz.
3. Install the Meta Pixel Helper extension; confirm `PageView` + `ViewContent` on the LP, `Lead` on capture submit, `Schedule` on the confirmation page — **each firing once**.
4. DevTools → Network, filter `google-analytics`: confirm a distinct `quiz_step_*` event per question.
5. Run `grep -c "G-XXXXXXXXXX" lp/mens-health.html start/index.html start/confirmed.html` — must return `0` for each file. A placeholder Measurement ID shipping to production is a silent total analytics failure.

- [ ] **Step 6: Run the full test suite and commit**

```bash
node --test tests/
git add netlify.toml lp/mens-health.html start/index.html start/confirmed.html
git commit -m "feat(funnel): add routes, Meta Pixel and GA4 tracking"
```

---

## Final verification (spec section 13)

Run after all tasks, at 360px and desktop widths, with `netlify dev`.

- [ ] All five routing rules produce the expected product (`node --test tests/*.test.js` plus a manual spot-check of two paths).
- [ ] Back button and refresh preserve answers at every step.
- [ ] Private-browsing mode completes the quiz with no console error.
- [ ] Keyboard-only completion works; screen reader announces each step change.
- [ ] An unlicensed state reaches the waitlist and **cannot** reach the calendar.
- [ ] Netlify Forms receives `mens-health-lead` with quiz answers and recommended product attached, and `mens-health-waitlist` receives waitlist entries. *(Forms only register on a real deploy — verify in the Netlify dashboard after the first deploy, not locally.)*
- [ ] **The Zoho iframe renders**, or the new-tab fallback is active.
- [ ] Pixel and GA4 events fire once each, with capture and booking distinct.
- [ ] Prices match `Products/mint-mints.html` and `lp/opti-mint-shot.html` exactly.
- [ ] No medical question, street address, DOB, or employer field appears anywhere in the funnel.
- [ ] Deploy check before pushing: `netlify status` shows Project Id `38e7c65c-9693-4bec-9e83-e2312bd923db`.
