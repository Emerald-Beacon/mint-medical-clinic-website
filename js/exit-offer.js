/**
 * Exit-intent offer for the men's health funnel (landing page and quiz).
 *
 * Desktop: fires when the cursor leaves through the top of the window, which
 * is where the back arrow, the tabs and the close button all are.
 * Touch: there is no cursor, so a fast upward flick after reading some of the
 * page stands in for it — the usual move toward the address bar.
 *
 * Shows at most once per browser session across both pages, so someone who
 * dismissed it on the landing page isn't asked again inside the quiz.
 * Loaded as a global in the browser and as a module by node --test.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.MintExitOffer = api;
  }
})(this, function () {
  // The code must exist in the Snipcart dashboard (Marketing → Discounts)
  // or checkout will reject it.
  var CODE = 'MINT30';
  var PERCENT = 30;

  var SHOWN_KEY = 'mint_exit_offer_shown';
  var CLAIMED_KEY = 'mint_exit_offer_code';

  // Nobody means to leave in the first few seconds; a cursor crossing the top
  // edge that early is usually still settling after the page opened.
  var ARM_DELAY = 4000;

  // --- pure helpers (tested) ---

  // A mouseout counts as leaving only when it exits the document entirely
  // (no element under the pointer) through the top edge.
  function isExitMove(e) {
    var to = e.relatedTarget || e.toElement;
    return !to && typeof e.clientY === 'number' && e.clientY <= 0;
  }

  // An upward flick: at least 120px up in under 250ms, and only once the
  // visitor has scrolled far enough to have read something.
  function isFlickUp(fromY, toY, ms, maxY) {
    return maxY >= 400 && fromY - toY >= 120 && ms > 0 && ms <= 250;
  }

  // --- session state ---

  function get(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }
  function set(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }

  function claimedCode() {
    return get(CLAIMED_KEY) === CODE ? CODE : null;
  }

  function track(name, params) {
    if (window.gtag) gtag('event', name, params || {});
    if (window.fbq) fbq('trackCustom', name.replace(/(^|_)(\w)/g, function (m, s, c) { return c.toUpperCase(); }), params || {});
  }

  // --- UI ---

  var CSS = [
    // Both pages reset every margin to 0, which strips the dialog's own
    // centering, so it is restored here.
    '.xo-dialog {',
    '  margin: auto; width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px);',
    '  padding: 0; border: 1px solid var(--void-line, rgba(62,180,137,0.22)); border-radius: 18px;',
    '  background: var(--void-2, #121816); color: var(--on-void, #f2f5f4);',
    '  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;',
    '  box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.4);',
    '  overflow: auto;',
    '}',
    '.xo-dialog[open] { animation: xo-in .28s ease; }',
    '.xo-dialog::backdrop { background: rgba(5,7,6,0.78); }',
    '@keyframes xo-in { from { opacity: 0; transform: translateY(12px) scale(.98); } to { opacity: 1; transform: none; } }',
    '@media (prefers-reduced-motion: reduce) { .xo-dialog[open] { animation: none; } }',
    '.xo-inner { position: relative; padding: 38px 28px 26px; text-align: center; }',
    '.xo-close {',
    '  position: absolute; top: 8px; right: 8px; min-width: 44px; min-height: 44px;',
    '  background: none; border: 0; cursor: pointer; line-height: 0;',
    '  color: var(--on-void-dim, #9aa8a4);',
    '}',
    '.xo-close:hover { color: var(--on-void, #f2f5f4); }',
    '.xo-eyebrow {',
    '  display: block; margin-bottom: 10px; font-size: 12px; font-weight: 600;',
    '  letter-spacing: .18em; text-transform: uppercase; color: var(--mint, #3EB489);',
    '}',
    '.xo-title {',
    '  font-family: inherit; font-weight: 700; letter-spacing: -0.03em; line-height: 1.05;',
    '  font-size: clamp(1.8rem, 6vw, 2.3rem); color: var(--on-void, #f2f5f4); margin: 0 0 12px;',
    '}',
    '.xo-title span { color: var(--mint, #3EB489); }',
    '.xo-body { font-size: 15px; line-height: 1.55; color: var(--on-void-dim, #9aa8a4); margin: 0 auto 22px; max-width: 32ch; }',
    '.xo-code {',
    '  display: flex; align-items: center; justify-content: space-between; gap: 12px;',
    '  width: 100%; min-height: 60px; margin-bottom: 18px; padding: 12px 18px;',
    '  border: 2px dashed var(--mint, #3EB489); border-radius: 12px;',
    '  background: rgba(62,180,137,0.08); cursor: pointer; font-family: inherit;',
    '}',
    '.xo-code-value { font-size: 22px; font-weight: 700; letter-spacing: .12em; color: var(--mint, #3EB489); }',
    '.xo-code-hint { font-size: 13px; color: var(--on-void-dim, #9aa8a4); }',
    '.xo-code:focus-visible, .xo-cta:focus-visible, .xo-close:focus-visible, .xo-decline:focus-visible {',
    '  outline: 2px solid var(--mint, #3EB489); outline-offset: 3px;',
    '}',
    '.xo-cta {',
    '  display: flex; align-items: center; justify-content: center; width: 100%; min-height: 52px;',
    '  padding: 15px 24px; border: 0; border-radius: 999px; cursor: pointer;',
    '  font-family: inherit; font-size: 16px; font-weight: 600; text-decoration: none;',
    '  color: #fff; background: var(--mint, #3EB489); box-shadow: 0 8px 24px rgba(62,180,137,0.28);',
    '}',
    '.xo-cta:hover { background: var(--mint-dark, #2f9670); }',
    '.xo-decline {',
    '  display: block; width: 100%; margin-top: 10px; padding: 12px 0; min-height: 44px;',
    '  background: none; border: 0; cursor: pointer; font-family: inherit;',
    '  font-size: 14px; color: var(--on-void-dim, #9aa8a4); text-decoration: underline;',
    '}',
    '.xo-fine { margin: 6px 0 0; font-size: 12px; color: var(--gray-500, #8a9694); }'
  ].join('\n');

  function build(opts) {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var dlg = document.createElement('dialog');
    dlg.className = 'xo-dialog';
    dlg.setAttribute('aria-labelledby', 'xoTitle');
    dlg.setAttribute('aria-describedby', 'xoBody');

    var ctaTag = opts.ctaHref ? 'a' : 'button';
    var ctaAttrs = opts.ctaHref ? 'href="' + opts.ctaHref + '"' : 'type="button"';

    dlg.innerHTML =
      '<div class="xo-inner">' +
        '<button type="button" class="xo-close" aria-label="Close">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
        '</button>' +
        '<span class="xo-eyebrow">Before you go</span>' +
        '<h2 class="xo-title" id="xoTitle">Wait. Take <span>' + PERCENT + '% off</span> your order.</h2>' +
        '<p class="xo-body" id="xoBody">' + opts.body + '</p>' +
        '<button type="button" class="xo-code" aria-label="Copy promo code ' + CODE + '">' +
          '<span class="xo-code-value">' + CODE + '</span>' +
          '<span class="xo-code-hint" data-xo-hint>Tap to copy</span>' +
        '</button>' +
        '<' + ctaTag + ' class="xo-cta" ' + ctaAttrs + '>' + opts.ctaLabel + '</' + ctaTag + '>' +
        '<button type="button" class="xo-decline">No thanks</button>' +
        '<p class="xo-fine">Enter the code at checkout. Prescription required.</p>' +
      '</div>';

    document.body.appendChild(dlg);
    return dlg;
  }

  function init(options) {
    var opts = options || {};
    var page = opts.page || 'unknown';
    opts.body = opts.body || 'Check out now and this code takes ' + PERCENT + '% off. A Utah-licensed provider reviews your order in minutes, and it ships discreetly.';
    opts.ctaLabel = opts.ctaLabel || 'Claim ' + PERCENT + '% off';
    var canShow = opts.canShow || function () { return true; };

    if (get(SHOWN_KEY)) return;
    if (typeof HTMLDialogElement !== 'function') return;

    var armed = false;
    var dlg = null;
    setTimeout(function () { armed = true; }, ARM_DELAY);

    function claim(how) {
      set(CLAIMED_KEY, CODE);
      track('exit_offer_claimed', { page: page, via: how });
      if (opts.onClaim) opts.onClaim(CODE);
    }

    function show() {
      if (!armed || get(SHOWN_KEY) || !canShow()) return;
      set(SHOWN_KEY, '1');
      teardown();

      dlg = build(opts);
      var hint = dlg.querySelector('[data-xo-hint]');

      dlg.querySelector('.xo-code').addEventListener('click', function () {
        try {
          navigator.clipboard.writeText(CODE).then(function () {
            hint.textContent = 'Copied';
          }, function () {});
        } catch (e) { /* no clipboard access; the code is on screen to type */ }
        claim('copy');
      });

      dlg.querySelector('.xo-cta').addEventListener('click', function () {
        claim('cta');
        // Copy on the way out too, so the code is on the clipboard when the
        // visitor reaches Snipcart's discount field.
        try { navigator.clipboard.writeText(CODE).catch(function () {}); } catch (e) {}
        if (!opts.ctaHref) dlg.close();
      });

      function dismiss() {
        track('exit_offer_dismissed', { page: page });
        dlg.close();
      }
      dlg.querySelector('.xo-close').addEventListener('click', dismiss);
      dlg.querySelector('.xo-decline').addEventListener('click', dismiss);
      // A click on the backdrop lands on the dialog element itself.
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dismiss(); });
      dlg.addEventListener('cancel', function () { track('exit_offer_dismissed', { page: page }); });

      dlg.showModal();
      // Focus the CTA without the keyboard ring; nobody tabbed here.
      dlg.querySelector('.xo-cta').focus({ focusVisible: false });
      track('exit_offer_shown', { page: page });
    }

    function onMouseOut(e) {
      if (isExitMove(e)) show();
    }

    // Flick detection samples scroll position and compares against where it
    // was a moment ago, rather than against the previous event, because
    // momentum scrolling on iOS fires events at uneven intervals.
    var maxY = 0, lastY = 0, lastT = 0;
    function onScroll() {
      var y = window.scrollY || window.pageYOffset || 0;
      var t = Date.now();
      if (y > maxY) maxY = y;
      if (t - lastT > 250) { lastY = y; lastT = t; return; }
      if (isFlickUp(lastY, y, t - lastT, maxY)) show();
    }

    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

    document.addEventListener('mouseout', onMouseOut);
    if (coarse) window.addEventListener('scroll', onScroll, { passive: true });

    function teardown() {
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    }
  }

  return {
    CODE: CODE,
    PERCENT: PERCENT,
    init: init,
    claimedCode: claimedCode,
    isExitMove: isExitMove,
    isFlickUp: isFlickUp
  };
});
