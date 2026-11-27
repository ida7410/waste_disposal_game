// js/flow.js (tree walk), scoreQuestions, Ask copy, and level unlocks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createFlow, nodeById, next, routeTo, startWalk, answerWalk, currentPrompt, expectedEmptyAnswer, destinationOf,
} from '../js/flow.js';
import { scoreQuestions, POINTS } from '../js/scoring.js';
import { isUnlocked, recordLevel, UNLOCK_ACCURACY } from '../js/progress.js';
import { askHeading, missedQuestionText, emptyFact, prepDoneText } from '../js/text.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const flow = createFlow(real);
const byId = (id) => real.items.find((it) => it.id === id);

// Walk an item along the route to `leaf`, answering the prep node as the item's
// state requires. `override` replaces answers: { nodeId: answer } or { 'q-empty:can': 'no' }.
function walkTo(item, leaf = item.exitNode, override = {}) {
  let w = startWalk(flow, item);
  for (const step of routeTo(flow, leaf)) {
    if (w.done) break;
    if (nodeById(flow, step.node).type === 'prep') {
      w = answerWalk(flow, w, override[step.node] ?? expectedEmptyAnswer(item));
      if (!w.done && w.stage === 'can-empty') w = answerWalk(flow, w, override[`${step.node}:can`] ?? 'yes');
    } else {
      w = answerWalk(flow, w, override[step.node] ?? step.answer);
    }
  }
  return w;
}

test('next() and routeTo() follow the tree', () => {
  assert.equal(next(flow, 'q-hazard', 'no'), 'q-alcohol');
  assert.equal(next(flow, 'q-mostly', 'paper'), 'q-paper-tissue');
  assert.equal(next(flow, 'q-empty', 'ready'), 'q-compostable');
  assert.equal(next(flow, 'q-empty', 'cant-empty'), 'leaf-cant-empty');
  assert.equal(next(flow, 'q-hazard', 'maybe'), null);
  assert.deepEqual(routeTo(flow, 'leaf-tissue-green').map((s) => s.node), ['q-hazard', 'q-alcohol', 'q-mostly', 'q-paper-tissue', 'q-tissue-chem']);
  assert.equal(routeTo(flow, 'leaf-nowhere'), null);
});

test('all 40 items reach their own bin, by every fair route', () => {
  for (const item of real.items) {
    for (const leaf of [item.exitNode, ...(item.alsoExitNodes ?? [])]) {
      const w = walkTo(item, leaf);
      assert.equal(w.outcome, 'correct', `${item.id} via ${leaf}`);
      assert.equal(w.leaf.id, leaf, item.id);
      assert.equal(destinationOf(w), item.bin, item.id);
    }
  }
});

test('cereal box: paper and packaging are both fair at "What is it mostly?"', () => {
  const box = byId('cereal-box');
  assert.equal(walkTo(box, 'leaf-paper-blue').outcome, 'correct');
  assert.equal(walkTo(box, 'leaf-packaging-blue').outcome, 'correct');
  const w = walkTo(box, 'leaf-paper-blue', { 'q-mostly': 'organics' });
  assert.equal(w.outcome, 'missed');
  assert.equal(w.missed.node.id, 'q-mostly');
  assert.deepEqual(w.missed.expected.sort(), ['packaging', 'paper']);
});

test('the walk stops at the first answer that leaves the route', () => {
  const w = walkTo(byId('banana-peel'), undefined, { 'q-mostly': 'paper' });
  assert.equal(w.done, true);
  assert.equal(w.outcome, 'missed');
  assert.equal(w.missed.node.id, 'q-mostly');
  assert.equal(w.answers.length, 3);
  assert.deepEqual(w.missed.expected, ['organics']);
  const r = scoreQuestions(w);
  assert.equal(r.correct, false);
  assert.equal(r.points, POINTS.contamination);
  assert.equal(r.missedNode, 'q-mostly');
  assert.equal(r.reason, byId('banana-peel').reason);
  assert.equal(answerWalk(flow, w, 'yes'), w, 'nothing changes once done');
});

test('"Is it empty?" is judged against the start state', () => {
  assert.equal(expectedEmptyAnswer(byId('coffee-cup')), 'no');
  assert.equal(expectedEmptyAnswer(byId('chip-bag')), 'yes');
  const full = walkTo(byId('coffee-cup'), undefined, { 'q-empty': 'yes' });
  assert.equal(full.outcome, 'missed');
  assert.equal(full.missed.node.id, 'q-empty');
  assert.equal(full.missed.stage, 'empty');
  const empty = walkTo(byId('chip-bag'), undefined, { 'q-empty': 'no' });
  assert.equal(empty.outcome, 'missed');
  assert.equal(empty.missed.stage, 'empty');
});

test('"Can you empty it now?": Yes preps and continues, No ends at the partial leaf (+5, never a miss)', () => {
  const bottle = byId('water-bottle');
  const yes = walkTo(bottle);
  assert.equal(yes.prepped, true);
  assert.ok(yes.answers.some((a) => a.stage === 'can-empty' && a.prep));

  const no = walkTo(bottle, undefined, { 'q-empty:can': 'no' });
  assert.equal(no.outcome, 'gave-up');
  assert.equal(no.leaf.id, 'leaf-cant-empty');
  assert.equal(destinationOf(no), 'garbage');
  assert.ok(no.answers.every((a) => a.ok), 'no answer is marked wrong');
  const r = scoreQuestions(no);
  assert.equal(r.points, POINTS.partial);
  assert.equal(r.correct, false);
});

test('prompts: Yes/No questions, a 4-option choice, and the two-part prep node', () => {
  let w = startWalk(flow, byId('sauce-jar'));
  assert.equal(currentPrompt(flow, w).kind, 'question');
  assert.ok(currentPrompt(flow, w).examples.includes('light bulb'));
  w = answerWalk(flow, answerWalk(flow, w, 'no'), 'no');
  const choice = currentPrompt(flow, w);
  assert.equal(choice.kind, 'choice');
  assert.equal(choice.options.length, 4);
  assert.ok(choice.options.every((o) => o.label && o.examples));
  w = answerWalk(flow, w, 'packaging');
  assert.equal(currentPrompt(flow, w).text, 'Is it empty, with no food or liquid left?');
  w = answerWalk(flow, w, 'no');
  assert.equal(currentPrompt(flow, w).text, 'Can you empty it now?');
  assert.equal(currentPrompt(flow, w).options.length, 2);

  const noCant = structuredClone(real);
  delete noCant.flowNodes.find((n) => n.id === 'q-empty').cantEmptyTo;
  const f2 = createFlow(noCant);
  let w2 = startWalk(f2, byId('sauce-jar'));
  for (const a of ['no', 'no', 'packaging', 'no']) w2 = answerWalk(f2, w2, a);
  assert.deepEqual(currentPrompt(f2, w2).options.map((o) => o.answer), ['yes'], 'no "No" without cantEmptyTo');
});

test('an exception item reached by good reasoning counts as correct and keeps its real bin', () => {
  const pod = {
    id: 'coffee-pod', name: 'Compostable coffee pod', level: 2, bin: 'blue', exitNode: 'leaf-compostable-garbage',
    exception: true, reason: 'Unlike compostable cups, Toronto takes coffee pods in the Blue Bin.', start: {}, steps: [],
  };
  const w = walkTo(pod);
  assert.equal(w.outcome, 'exception');
  assert.equal(destinationOf(w), 'blue');
  assert.equal(scoreQuestions(w).points, POINTS.correct);
  assert.equal(scoreQuestions(w).correct, true);
});

test('chemical paper towel goes down the tissue branch, no exception needed', () => {
  const towel = byId('chemical-paper-towel');
  assert.equal(towel.exception, undefined);
  const w = walkTo(towel);
  assert.equal(w.outcome, 'correct');
  assert.equal(w.leaf.id, 'leaf-tissue-garbage');
});

test('Ask copy: headings, missed text, what the item holds, prep text', () => {
  assert.ok(askHeading('correct', 'Green Bin').includes('Green Bin'));
  assert.ok(askHeading('exception', 'Blue Bin').startsWith('Good reasoning, but this one is an exception'));
  assert.ok(!/wrong/i.test(askHeading('missed', 'Blue Bin')));
  assert.equal(missedQuestionText('What is it mostly?', ['Paper or cardboard', 'Packaging']),
    'The tricky one was “What is it mostly?” For this item: Paper or cardboard or Packaging.');
  assert.equal(emptyFact({ liquid: true }), 'It still has liquid in it.');
  assert.equal(emptyFact({ food: true }), 'It still has food in it.');
  assert.equal(emptyFact({}), 'It’s already empty.');
  assert.equal(prepDoneText({ liquid: true, lid: false }, { liquidTo: 'sink' }), 'Pour it into the sink. Then put the lid back on.');
  assert.equal(prepDoneText({ food: true }, { scrapsLabel: 'Green Bin' }), 'Scrape the food into the Green Bin.');
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
