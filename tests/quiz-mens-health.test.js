const test = require('node:test');
const assert = require('node:assert');
const quiz = require('../js/quiz-mens-health.js');

// --- recommend(): top-down, first match wins (routing revised 2026-09-16) ---

test('recommend: "want something stronger" routes to mint mints', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'both', tried: 'stronger', priority: 'private' }),
    'mint-mints'
  );
});

test('recommend: priority "how strong it is" routes to mint mints', () => {
  assert.strictEqual(
    quiz.recommend({ goal: 'longer', tried: 'none', priority: 'strong' }),
    'mint-mints'
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

test('recommend: tried "stronger" outranks priority "fast" because rules are ordered', () => {
  // Priority must not override an explicit `tried: stronger`. This pins the
  // top-down ordering.
  assert.strictEqual(
    quiz.recommend({ goal: 'both', tried: 'stronger', priority: 'fast' }),
    'mint-mints'
  );
});

test('recommend: returns a valid product for empty answers', () => {
  const result = quiz.recommend({});
  assert.ok(result === 'mint-mints' || result === 'opti-mint-shot');
});

test('recommend: priority "fast" wins when tried is "planning"', () => {
  assert.strictEqual(
    quiz.recommend({ tried: 'planning', priority: 'fast' }),
    'opti-mint-shot'
  );
});

test('product priceLine copy is byte-exact', () => {
  assert.strictEqual(
    quiz.products['mint-mints'].priceLine,
    'Half Batch $197 · Full Batch $297 (reg. $397)'
  );
  assert.strictEqual(
    quiz.products['opti-mint-shot'].priceLine,
    '1 vial $49.97 · 5 vials $197.95 · 10 vials $297.95'
  );
});

test('every product has checkout packs with a Snipcart id, price and url', () => {
  const expected = {
    'mint-mints-full': 297.0,
    'mint-mints-half': 197.0,
    'opti-mint-shot-1': 49.97,
    'opti-mint-shot-5': 197.95,
    'opti-mint-shot-10': 297.95
  };
  const seen = {};
  for (const key of ['mint-mints', 'opti-mint-shot']) {
    const packs = quiz.products[key].packs;
    assert.ok(Array.isArray(packs) && packs.length > 0, `${key} has no packs`);
    for (const pack of packs) {
      assert.ok(pack.id && pack.name && pack.url, `${key} pack missing fields`);
      assert.ok(/^https:\/\//.test(pack.url), `${pack.id} url must be absolute`);
      seen[pack.id] = pack.price;
    }
  }
  // Snipcart rejects an order whose price disagrees with the product page.
  assert.deepStrictEqual(seen, expected);
});

test('the shot is offered as 1, 5 or 10 vials, with 10 preselected', () => {
  const packs = quiz.products['opti-mint-shot'].packs;
  assert.deepStrictEqual(packs.map((p) => p.label), ['1 Vial', '5 Vials', '10 Vials']);
  assert.deepStrictEqual(packs.filter((p) => p.recommended).map((p) => p.id), ['opti-mint-shot-10']);
});

test('the flow ends at checkout, not a booking step', () => {
  const ids = quiz.steps.map((s) => s.id);
  assert.strictEqual(ids[ids.length - 1], 'purchase');
  assert.ok(!ids.includes('schedule'));
});

// --- isLicensed() ---

test('isLicensed: Utah is licensed', () => {
  assert.strictEqual(quiz.isLicensed('UT'), true);
});

test('isLicensed: a code that is not in the list is not licensed', () => {
  // Every US state and DC is licensed, so this guards the mechanism itself:
  // isLicensed must still reject a code it was not given, or the gate is
  // silently answering true to everything.
  assert.strictEqual(quiz.isLicensed('ZZ'), false);
  assert.strictEqual(quiz.isLicensed('PR'), false);
});

test('isLicensed: every US state and DC is licensed', () => {
  assert.strictEqual(quiz.LICENSED_STATES.length, 51);
  ['CA', 'NY', 'TX', 'FL', 'UT', 'DC', 'WY'].forEach((code) => {
    assert.strictEqual(quiz.isLicensed(code), true, `${code} should be licensed`);
  });
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

test('no tap-choice question offers more than four options', () => {
  for (const step of quiz.steps) {
    if (step.type === 'question' && step.variant !== 'select' && Array.isArray(step.options)) {
      assert.ok(step.options.length <= 4, `${step.id} has ${step.options.length} options`);
    }
  }
});

test('the state question is a select, not a pill list', () => {
  const state = quiz.steps.find((s) => s.id === 'state');
  assert.ok(state, 'missing state step');
  assert.strictEqual(state.variant, 'select');
  assert.ok(state.options.length > 40, 'state step should list the US states');
});

test('every step has a unique id', () => {
  const ids = quiz.steps.map((s) => s.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});
