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
  // All 50 states plus DC. The gate is kept rather than removed: if licensure
  // ever lapses somewhere, pulling a code out of this list is the whole fix,
  // and the waitlist path it falls back to is already built and tested.
  var LICENSED_STATES = [
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC'
  ];

  var products = {
    'mint-mints': {
      name: 'Mint Mints™',
      tagline:
        'A prescription troche that dissolves under your tongue — no pill to swallow, no waiting an hour.',
      image: '../images/mint-mints-dark.webp',
      chips: [
        'Dissolves under the tongue',
        'Faster than a swallowed pill',
        'Mint flavored. Obviously.',
        'Discreet, unmarked packaging'
      ],
      priceLine: 'Half Batch $197 · Full Batch $297 (reg. $397)',
      // Checkout options. id/price/url must match the snipcart-add-item
      // buttons on the product page at `url`: Snipcart crawls that page to
      // validate the price, and rejects the order if they disagree.
      packs: [
        {
          id: 'mint-mints-full',
          description: 'Mint Mints Full Batch — fast-acting ED lozenges',
          name: 'Mint Mints — Full Batch',
          label: 'Full Batch',
          note: 'Best value · save $100',
          price: 297.0,
          was: 397,
          weight: 100,
          url: 'https://mintmedicalclinic.com/products/mint-mints',
          image: 'https://mintmedicalclinic.com/Products/MN-MINTMINTS-FRONT@3x.png',
          recommended: true
        },
        {
          id: 'mint-mints-half',
          description: 'Mint Mints Half Batch — first-time introductory offer',
          name: 'Mint Mints — Half Batch (First-Time Intro)',
          label: 'Half Batch',
          note: 'First-time intro',
          price: 197.0,
          weight: 60,
          url: 'https://mintmedicalclinic.com/products/mint-mints',
          image: 'https://mintmedicalclinic.com/Products/MN-MINTMINTS-FRONT@3x.png'
        }
      ]
    },
    'opti-mint-shot': {
      name: 'The Opti-Mint Shot™',
      tagline:
        'One shot, about fifteen minutes before — supporting desire and blood flow together.',
      image: '../images/optimint-shot-vertical.webp',
      chips: [
        'Works in about 15 minutes',
        'Supports desire, not just blood flow',
        'Nothing to take daily',
        'Discreet, unmarked packaging'
      ],
      priceLine: '1 vial $49.97 · 5 vials $197.95 · 10 vials $297.95',
      // Bundles: 1, 5 or 10 vials. Display labels only — the Snipcart ids,
      // names and prices below must stay identical to lp/opti-mint-shot.html.
      packs: [
        {
          id: 'opti-mint-shot-1',
          description: 'Opti-Mint Shot — single fast-acting intimacy shot',
          name: 'Opti-Mint Shot — Single Shot',
          label: '1 Vial',
          note: 'Try it',
          price: 49.97,
          weight: 60,
          url: 'https://mintmedicalclinic.com/products/opti-mint-shot',
          image: 'https://mintmedicalclinic.com/Products/MN-OPTIMINT-FRONT@3x.png'
        },
        {
          id: 'opti-mint-shot-5',
          description: 'Opti-Mint Shot 5 Pack — fast-acting intimacy shots',
          name: 'Opti-Mint Shot — 5 Pack',
          label: '5 Vials',
          note: '$39.59 per vial · save $51',
          price: 197.95,
          weight: 300,
          url: 'https://mintmedicalclinic.com/products/opti-mint-shot',
          image: 'https://mintmedicalclinic.com/Products/MN-OPTIMINT-FRONT@3x.png'
        },
        {
          id: 'opti-mint-shot-10',
          description: 'Opti-Mint Shot 10 Pack — fast-acting intimacy shots',
          name: 'Opti-Mint Shot — 10 Pack',
          label: '10 Vials',
          note: '$29.80 per vial · best value, save $201',
          price: 297.95,
          weight: 600,
          url: 'https://mintmedicalclinic.com/products/opti-mint-shot',
          image: 'https://mintmedicalclinic.com/Products/MN-OPTIMINT-FRONT@3x.png',
          recommended: true
        }
      ]
    }
  };

  /**
   * Evaluated top-down, first match wins. Revised 2026-09-16 (team meeting):
   * "stronger" recommends Mint Mints, "faster" recommends the shot.
   * Biased toward Mint Mints as the default: it is the lower-commitment entry
   * product and the direct Rugiet Ready / Hims Hard Mints competitor.
   */
  function recommend(answers) {
    var a = answers || {};
    if (a.tried === 'stronger') return 'mint-mints';
    if (a.tried === 'not-enough') return 'opti-mint-shot';
    if (a.priority === 'fast') return 'opti-mint-shot';
    if (a.priority === 'strong') return 'mint-mints';
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
      // "Reviewed in minutes" replaces "same-week appointments" (2026-09-16);
      // it describes review speed and never promises approval.
      headline: 'You are not doing this alone.',
      body:
        'Utah-licensed providers. Reviewed in minutes, not weeks. Discreet, unmarked packaging — billed discreetly too.',
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
    // Pay-first (2026-09-16): checkout replaces the booked call as the last
    // step. A provider call is optional and offered after payment.
    // Not named "checkout": the Snipcart panel owns #/cart and #/checkout.
    { id: 'purchase', type: 'static', elementId: 'stepCheckout' }
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
