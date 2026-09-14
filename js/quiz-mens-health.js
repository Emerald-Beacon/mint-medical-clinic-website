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
