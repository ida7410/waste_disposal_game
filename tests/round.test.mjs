import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { POINTS, scoreSort, accuracy, totalScore } from '../js/scoring.js';
import {
  itemsForLevel, shuffled, createRound, currentItem, isDone, answer, next, summarize, score,
} from '../js/round.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const byId = (id) => real.items.find((it) => it.id === id);

test('scoreSort compares with the item data, not a hard-coded answer', () => {
  const can = byId('pop-can');
  const right = scoreSort(can, can.bin);
  assert.equal(right.correct, true);
  assert.equal(right.points, POINTS.correct);
  assert.equal(right.reason, can.reason);
  assert.deepEqual(right.steps, ['pour']);

  const wrong = scoreSort(can, 'garbage');
  assert.equal(wrong.correct, false);
  assert.equal(wrong.points, POINTS.contamination);
  assert.equal(wrong.correctBin, can.bin);
  assert.equal(wrong.reason, can.reason);

  // Changing the data changes the answer.
  assert.equal(scoreSort({ ...can, bin: 'garbage' }, 'garbage').correct, true);
});

test('accuracy and total score (never below zero)', () => {
  assert.equal(accuracy([]), 0);
  assert.equal(accuracy([{ correct: true }, { correct: false }]), 0.5);
  assert.equal(totalScore([{ points: -5 }, { points: 10 }]), 10);
  assert.equal(totalScore([{ points: 10 }, { points: -5 }, { points: 10 }]), 15);
});

test('every level has 10 items and they cover all 40', () => {
  const levels = real.levels.map((l) => l.level);
  const counts = levels.map((l) => itemsForLevel(real.items, l).length);
  assert.deepEqual(counts, [10, 10, 10, 10]);
});

test('shuffled keeps every item once and does not mutate', () => {
  const list = [1, 2, 3, 4, 5];
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out = shuffled(list, rng);
  assert.deepEqual([...out].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5]);
});

test('a full round: answer, next, summary with missed items', () => {
  const items = itemsForLevel(real.items, 1);
  let round = createRound(items, { level: 1, rng: null });
  assert.equal(currentItem(round), items[0]);

  // Next before answering does nothing.
  assert.equal(next(round), round);

  items.forEach((it, i) => {
    const bin = i < 2 ? 'special' : it.bin; // miss the first two
    const out = answer(round, bin, 100);
    assert.equal(out.result.correct, i >= 2);
    assert.equal(out.result.ms, 100);
    // Answering again keeps the first answer.
    assert.equal(answer(out.round, it.bin).round, out.round);
    round = next(out.round);
  });

  assert.equal(isDone(round), true);
  assert.equal(currentItem(round), null);
  assert.throws(() => answer(round, 'blue'));

  const sum = summarize(round);
  assert.equal(sum.total, 10);
  assert.equal(sum.correct, 8);
  assert.equal(sum.accuracy, 0.8);
  assert.deepEqual(sum.missed.map((it) => it.id), [items[0].id, items[1].id]);
  assert.equal(sum.score, score(round));
  assert.equal(sum.score, 80); // 0, 0 (clamped), then 8 x 10
});

test('practice round from missed items', () => {
  const missed = [byId('chip-bag'), byId('diaper')];
  const round = createRound(missed, { level: 2, practice: true, rng: null });
  assert.equal(round.practice, true);
  assert.equal(round.items.length, 2);
  assert.equal(summarize(round).practice, true);
});
