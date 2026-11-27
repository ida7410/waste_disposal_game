// progress.js, events.js and text.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadProgress, bestAccuracy, recordLevel } from '../js/progress.js';
import { emit } from '../js/events.js';
import { prepSentence, resultHeading, actionPhrase, percent } from '../js/text.js';

function memoryStore() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)), map };
}
const brokenStore = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
};

test('progress keeps the best accuracy per level', () => {
  const store = memoryStore();
  assert.equal(bestAccuracy(1, store), null);
  recordLevel(1, 0.6, store);
  recordLevel(1, 0.9, store);
  recordLevel(1, 0.5, store);
  recordLevel(2, 0.3, store);
  assert.equal(bestAccuracy(1, store), 0.9);
  assert.equal(bestAccuracy(2, store), 0.3);
});

test('progress survives blocked, missing or corrupt storage', () => {
  assert.deepEqual(loadProgress(brokenStore), {});
  assert.equal(recordLevel(1, 1, brokenStore), false);
  assert.equal(bestAccuracy(1, null), null);
  assert.equal(recordLevel(1, 1, null), true);

  const corrupt = memoryStore();
  corrupt.setItem('sortright.progress.v1', '{oops');
  assert.deepEqual(loadProgress(corrupt), {});
  recordLevel(1, 0.7, corrupt);
  assert.equal(bestAccuracy(1, corrupt), 0.7);
});

test('emit calls the host hook and never throws', () => {
  const seen = [];
  const host = { SortRight: { onEvent: (e) => seen.push(e) } };
  assert.equal(emit('item_result', { itemId: 'pop-can', correct: true, bin: 'blue', ms: 900 }, host), true);
  assert.deepEqual(seen, [{ type: 'item_result', itemId: 'pop-can', correct: true, bin: 'blue', ms: 900 }]);

  assert.equal(emit('level_start', {}, {}), false);
  assert.equal(emit('level_start', {}, undefined), false);

  const original = console.warn;
  console.warn = () => {};
  try {
    const throwing = { SortRight: { onEvent: () => { throw new Error('host bug'); } } };
    assert.equal(emit('level_end', {}, throwing), false);
  } finally {
    console.warn = original;
  }
});

test('prep sentence lists steps in order, in plain words', () => {
  assert.equal(prepSentence([]), '');
  assert.equal(prepSentence(['pour', 'lid']), 'Before binning: pour it out, put the lid on.');
  assert.equal(actionPhrase('mystery'), 'mystery');
});

test('result headings are friendly and name the right bin', () => {
  assert.notEqual(resultHeading(true, 'Blue Bin', 0), resultHeading(true, 'Blue Bin', 1));
  const miss = resultHeading(false, 'Green Bin');
  assert.ok(miss.includes('Green Bin'));
  assert.ok(!/wrong/i.test(miss));
  assert.equal(percent(0.666), '67%');
});
