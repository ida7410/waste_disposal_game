// flow.js, scoreQuestions, unlocks and scrapsTo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { expectedAnswer, pathFor, startFlow, answerFlow, currentEntry, destinationOf } from '../js/flow.js';
import { scoreQuestions, POINTS } from '../js/scoring.js';
import { isUnlocked, recordLevel, UNLOCK_ACCURACY } from '../js/progress.js';
import { validateData } from '../js/validate-core.js';
import { actionDoneText, missedQuestionText } from '../js/text.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const byId = (id) => real.items.find((it) => it.id === id);
const step = (n) => real.flow.find((f) => f.step === n);

function play(item, override = {}) {
  let fs = startFlow(real.flow, item);
  while (!fs.done) {
    const e = currentEntry(fs);
    fs = answerFlow(fs, override[e.flowStep.step] ?? e.expected);
  }
  return fs;
}

test('answering every question as expected brings all 40 items to their own bin', () => {
  for (const item of real.items) {
    const fs = play(item);
    assert.equal(fs.correct, true, item.id);
    assert.equal(fs.path.at(-1).flowStep.step, item.exitStep, item.id);
    assert.equal(destinationOf(fs), item.bin, item.id);
  }
});

test('expected answers follow exitOn and the start state', () => {
  const bottle = byId('water-bottle');
  assert.equal(expectedAnswer(step(1), bottle), 'no'); // not dangerous
  assert.equal(expectedAnswer(step(4), bottle), 'yes'); // is packaging (exitOn no)
  assert.equal(expectedAnswer(step(5), bottle), 'no'); // not empty yet: empty it, continue
  assert.equal(expectedAnswer(step(5), byId('cereal-box')), 'yes');
  assert.equal(expectedAnswer(step(7), bottle), null); // "everything else": no question
  assert.equal(expectedAnswer(step(2), byId('wine-bottle')), 'yes');
});

test('the prep step is marked when the item needs emptying', () => {
  const path = pathFor(real.flow, byId('sauce-jar'));
  assert.deepEqual(path.map((p) => p.prep), [false, false, false, false, true, false, false]);
  const fs = play(byId('sauce-jar'));
  assert.equal(fs.answers.find((a) => a.step === 5).prep, true);
  assert.equal(fs.auto.flowStep.step, 7, 'final step is reached without a question');
});

test('a wrong answer stops the flow at the missed question', () => {
  const fs = play(byId('pop-can'), { 5: 'yes' }); // says it's empty when it isn't
  assert.equal(fs.done, true);
  assert.equal(fs.correct, false);
  assert.equal(fs.missed.flowStep.step, 5);
  assert.equal(fs.answers.length, 5);

  const early = play(byId('banana-peel'), { 3: 'no' });
  assert.equal(early.missed.flowStep.step, 3);
  const r = scoreQuestions(early);
  assert.equal(r.correct, false);
  assert.equal(r.points, POINTS.contamination);
  assert.equal(r.missedStep, 3);
  assert.equal(r.reason, byId('banana-peel').reason);
});

test('exception items exit at their step but go to their own bin', () => {
  const towel = byId('chemical-paper-towel');
  const fs = play(towel);
  assert.equal(fs.path.at(-1).flowStep.exitTo, 'green');
  assert.equal(destinationOf(fs), 'garbage');
  assert.equal(scoreQuestions(fs).points, POINTS.correct);
});

test('answering after the flow is done changes nothing', () => {
  const fs = play(byId('aa-batteries'));
  assert.equal(answerFlow(fs, 'no'), fs);
});

function memoryStore() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, String(v)) };
}

test('levels unlock at 70% on the level before, per mode', () => {
  const store = memoryStore();
  const order = [1, 2, 3, 4];
  assert.equal(isUnlocked('quick-sort', 1, order, store), true);
  assert.equal(isUnlocked('quick-sort', 2, order, store), false);
  recordLevel('quick-sort', 1, 0.6, store);
  assert.equal(isUnlocked('quick-sort', 2, order, store), false);
  recordLevel('quick-sort', 1, UNLOCK_ACCURACY, store);
  assert.equal(isUnlocked('quick-sort', 2, order, store), true);
  assert.equal(isUnlocked('quick-sort', 3, order, store), false);
  assert.equal(isUnlocked('prep-sort', 2, order, store), false, 'other modes keep their own unlocks');
  assert.equal(isUnlocked('quick-sort', 1, order, null), true, 'works without storage');
  assert.equal(isUnlocked('quick-sort', 2, order, null), false);
});

test('scrapsTo must be a known bin on the prep step, and names the bin in feedback', () => {
  assert.equal(real.flow.find((f) => f.action).scrapsTo, 'green');
  const bad = structuredClone(real);
  bad.flow.find((f) => f.action).scrapsTo = 'moon';
  assert.ok(validateData(bad).errors.some((e) => e.includes('scrapsTo is unknown bin "moon"')));
  assert.equal(actionDoneText('scrape', { scrapsLabel: 'Green Bin' }), 'Scraped out. The scraps went in the Green Bin.');
  assert.equal(actionDoneText('scrape'), 'Scraped out.');
});

test('missed question copy is friendly and names the right answer', () => {
  const t = missedQuestionText(3, 'Is it food?', 'yes');
  assert.ok(t.includes('Question 3') && t.includes('Yes'));
  assert.ok(!/wrong/i.test(t));
});
