// state.js, scorePrep, defer() and the Prep & Sort copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createItemState, applyAction, canApply, pendingSteps, isReady, contaminants, needsEmptying, blockedReason,
} from '../js/state.js';
import { scorePrep, POINTS, STRAIGHT_IN_BONUS } from '../js/scoring.js';
import { createRound, currentItem, defer, answer, next, remaining } from '../js/round.js';
import { stateChips, prepHeading, nextTimeSentence, toolLabel } from '../js/text.js';
import { validateData } from '../js/validate-core.js';
import { createFlow, nodeById } from '../js/flow.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const byId = (id) => real.items.find((it) => it.id === id);
const doAll = (item) => item.steps.reduce((s, a) => applyAction(s, a).state, createItemState(item));

test('state starts from item.start and is never mutated', () => {
  const bottle = byId('water-bottle');
  const s0 = createItemState(bottle);
  assert.deepEqual(s0, { liquid: true, lid: false });
  const { state: s1, changed } = applyAction(s0, 'pour');
  assert.equal(changed, true);
  assert.equal(s1.liquid, false);
  assert.equal(s0.liquid, true, 'original untouched');
  assert.equal(bottle.start.liquid, true, 'data untouched');
});

test('actions that do not apply change nothing', () => {
  const box = createItemState(byId('cereal-box'));
  for (const a of ['pour', 'scrape', 'rinse', 'lid', 'tape', 'separate']) {
    assert.equal(canApply(box, a), false, a);
    assert.equal(applyAction(box, a).state, box);
  }
  const once = applyAction(box, 'flip').state;
  assert.equal(applyAction(once, 'flip').changed, false, 'label can only be read once');
});

test('pending steps follow the data, in order, until done', () => {
  const bottle = byId('water-bottle');
  let s = createItemState(bottle);
  assert.deepEqual(pendingSteps(bottle, s), ['pour', 'lid']);
  s = applyAction(s, 'pour').state;
  assert.deepEqual(pendingSteps(bottle, s), ['lid']);
  s = applyAction(s, 'lid').state;
  assert.equal(isReady(bottle, s), true);
});

test('lid waits until the container is empty', () => {
  const bottle = createItemState(byId('water-bottle'));
  assert.equal(blockedReason(bottle, 'lid'), 'empty-first');
  assert.equal(applyAction(bottle, 'lid').changed, false);
  const jar = createItemState(byId('sauce-jar'));
  assert.equal(blockedReason(jar, 'lid'), 'empty-first');
  assert.equal(blockedReason(applyAction(jar, 'scrape').state, 'lid'), null);
  assert.equal(blockedReason(bottle, 'pour'), null);
});

test('every item in the data can be made ready using its own steps', () => {
  for (const item of real.items) assert.equal(isReady(item, doAll(item)), true, item.id);
});

test('contaminants and the "can\'t empty" option', () => {
  assert.deepEqual(contaminants(createItemState(byId('water-bottle'))), ['liquid']);
  assert.deepEqual(contaminants(createItemState(byId('sauce-jar'))), ['food']);
  assert.equal(needsEmptying(createItemState(byId('pop-can'))), true);
  assert.equal(needsEmptying(createItemState(byId('aa-batteries'))), false);
});

test('scorePrep: right bin and ready is correct', () => {
  const bottle = byId('water-bottle');
  const r = scorePrep(bottle, doAll(bottle), bottle.bin, { actionsUsed: 2 });
  assert.equal(r.outcome, 'correct');
  assert.equal(r.correct, true);
  assert.equal(r.points, POINTS.correct);
  assert.equal(r.reason, bottle.reason);
});

test('scorePrep: full container in its (recycling) bin splashes and loses its full mark', () => {
  const bottle = byId('water-bottle');
  const r = scorePrep(bottle, createItemState(bottle), bottle.bin);
  assert.equal(r.outcome, 'contaminated');
  assert.equal(r.splash, true);
  assert.equal(r.points, 0);
  assert.deepEqual(r.contaminants, ['liquid']);
});

test('scorePrep: emptied but lid off loses its full mark', () => {
  const bottle = byId('water-bottle');
  const s = applyAction(createItemState(bottle), 'pour').state;
  const r = scorePrep(bottle, s, bottle.bin);
  assert.equal(r.outcome, 'partial');
  assert.equal(r.points, 0);
  assert.deepEqual(r.pending, ['lid']);
  assert.equal(r.correct, false);
});

test('scorePrep: untaped batteries in the right bin get no marks', () => {
  const aa = byId('aa-batteries');
  const r = scorePrep(aa, createItemState(aa), aa.bin);
  assert.equal(r.points, POINTS.missedStep);
  assert.equal(r.splash, false);
  assert.deepEqual(r.pending, ['tape']);
});

test('scorePrep: wrong bin, and giving up', () => {
  const can = byId('pop-can');
  const wrong = scorePrep(can, doAll(can), 'green');
  assert.equal(wrong.outcome, 'wrong');
  assert.equal(wrong.points, POINTS.contamination);
  assert.equal(wrong.splash, false);

  const gaveUp = scorePrep(can, createItemState(can), 'garbage', { gaveUp: true });
  assert.equal(gaveUp.outcome, 'gave-up');
  assert.equal(gaveUp.points, POINTS.partial);
});

test('scorePrep: straight-in bonus only for no-prep items with no extra actions', () => {
  const box = byId('cereal-box');
  assert.equal(scorePrep(box, createItemState(box), box.bin).points, POINTS.correct + STRAIGHT_IN_BONUS);
  assert.equal(scorePrep(box, createItemState(box), box.bin, { actionsUsed: 1 }).points, POINTS.correct);
  const can = byId('pop-can');
  assert.equal(scorePrep(can, doAll(can), can.bin).bonus, 0);
});

test('defer moves the current item two places later, or to the end', () => {
  const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, bin: 'blue' }));
  let r = createRound(items, { rng: null });
  r = defer(r, 2);
  assert.deepEqual(r.items.map((i) => i.id), ['b', 'c', 'a', 'd', 'e']);
  assert.equal(currentItem(r).id, 'b');

  let end = createRound(items, { rng: null });
  end = { ...end, index: 4 };
  assert.equal(remaining(end), 0);
  assert.deepEqual(defer(end, 2).items.map((i) => i.id), ['a', 'b', 'c', 'd', 'e']);

  // Answered items can't be deferred.
  const answered = answer(createRound(items, { rng: null }), 'blue').round;
  assert.equal(defer(answered), answered);
  assert.equal(currentItem(next(answered)).id, 'b');
});

test('Prep & Sort reads "can\'t empty" and scraps from the prep node', () => {
  // (The tree rules for these fields are covered in validate-tree.test.mjs.)
  const flow = createFlow(real);
  assert.equal(flow.prepNode.id, 'q-empty');
  const leaf = nodeById(flow, flow.prepNode.cantEmptyTo);
  assert.equal(leaf.partial, true);
  assert.equal(leaf.bin, 'garbage');
  assert.ok(leaf.note.length > 10, 'gave-up feedback comes from the leaf note');
  assert.equal(flow.prepNode.scrapsTo, 'green');
  assert.equal(nodeById(flow, byId('water-bottle').exitNode).note, 'Keep lids on.');
  assert.deepEqual(validateData(real).errors, []);
});

test('prep copy', () => {
  assert.deepEqual(stateChips({ liquid: true, lid: false }), ['Has liquid', 'Lid off']);
  assert.deepEqual(stateChips({ lid: true }), []);
  assert.ok(prepHeading('wrong', 'Green Bin').includes('Green Bin'));
  assert.ok(!/wrong/i.test(prepHeading('wrong', 'Green Bin')));
  assert.equal(nextTimeSentence(['lid']), 'Next time: put the lid on.');
  assert.equal(nextTimeSentence(['lid'], { lidHalfOn: true }), 'Next time: twist the lid on until it’s tight.');
  assert.equal(toolLabel('pour'), 'Pour out');
});
