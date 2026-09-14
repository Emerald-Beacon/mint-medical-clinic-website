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

test('recommend: priority "fast" outranks tried "planning" (spec 6.1 ordering)', () => {
  // If the "tried === planning" rule were ever moved above "priority === fast"
  // in the config, this is the one reachable case that would flip and expose it.
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
    '$49.97 per shot · as low as $29.80 in a 10-pack'
  );
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
