const test = require('node:test');
const assert = require('node:assert');
const offer = require('../js/exit-offer.js');

// --- isExitMove(): leaving through the top edge, toward back / tabs / close ---

test('isExitMove: pointer leaves the document through the top', () => {
  assert.strictEqual(offer.isExitMove({ relatedTarget: null, clientY: -3 }), true);
  assert.strictEqual(offer.isExitMove({ relatedTarget: null, clientY: 0 }), true);
});

test('isExitMove: moving between elements inside the page is not an exit', () => {
  assert.strictEqual(offer.isExitMove({ relatedTarget: {}, clientY: -3 }), false);
});

test('isExitMove: leaving through the side or bottom is not an exit', () => {
  assert.strictEqual(offer.isExitMove({ relatedTarget: null, clientY: 400 }), false);
});

// --- isFlickUp(): the touch stand-in ---

test('isFlickUp: fast upward flick after reading fires', () => {
  assert.strictEqual(offer.isFlickUp(1200, 1000, 180, 1500), true);
});

test('isFlickUp: slow upward scroll does not fire', () => {
  assert.strictEqual(offer.isFlickUp(1200, 1000, 600, 1500), false);
});

test('isFlickUp: small upward nudge does not fire', () => {
  assert.strictEqual(offer.isFlickUp(1200, 1150, 100, 1500), false);
});

test('isFlickUp: never fires before the visitor has scrolled into the page', () => {
  assert.strictEqual(offer.isFlickUp(300, 100, 100, 300), false);
});

test('offer is 30% with a fixed code', () => {
  assert.strictEqual(offer.PERCENT, 30);
  assert.strictEqual(offer.CODE, 'MINT30');
});
