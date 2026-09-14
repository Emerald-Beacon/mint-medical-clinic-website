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
