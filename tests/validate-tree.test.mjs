// Tree checks in js/validate-core.js (SPEC.md 8, 8.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData, buildRoutes } from '../js/validate-core.js';

const good = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const copy = () => structuredClone(good);
const item = (d, id) => d.items.find((i) => i.id === id);
const node = (d, id) => d.flowNodes.find((n) => n.id === id);
const hasError = (r, text) => r.errors.some((e) => e.includes(text));

test('bundled data passes with no errors or warnings', () => {
  const r = validateData(good);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.equal(r.fatal, false);
  assert.equal(r.validItems.length, 40);
});

test('exitNode leading to the wrong bin is an item error', () => {
  const d = copy();
  item(d, 'water-bottle').exitNode = 'leaf-paper-green';
  const r = validateData(d);
  assert.ok(hasError(r, 'Item "water-bottle": exitNode "leaf-paper-green" leads to "green"'));
  assert.equal(r.fatal, false);
  assert.ok(!r.validItems.some((i) => i.id === 'water-bottle'));
  assert.equal(r.validItems.length, 39);
});

test('second route ending in a different bin is an item error', () => {
  const d = copy();
  item(d, 'cereal-box').alsoExitNodes = ['leaf-paper-green'];
  const r = validateData(d);
  assert.ok(hasError(r, 'alsoExitNodes "leaf-paper-green" leads to "green", not "blue"'));
  assert.ok(!r.validItems.some((i) => i.id === 'cereal-box'));
});

test('second route ending in the same bin is fine', () => {
  const r = validateData(good);
  assert.deepEqual(item(good, 'cereal-box').alsoExitNodes, ['leaf-packaging-blue']);
  assert.ok(r.validItems.some((i) => i.id === 'cereal-box'));
});

test('an item may not end at the partial "can\'t empty" leaf', () => {
  const d = copy();
  item(d, 'flyers').exitNode = 'leaf-cant-empty';
  const r = validateData(d);
  assert.ok(hasError(r, 'Item "flyers": exitNode can\'t be the partial "leaf-cant-empty" leaf'));
});

test('exitNode must be a leaf, not a question', () => {
  const d = copy();
  item(d, 'flyers').exitNode = 'q-paper-dirty';
  assert.ok(hasError(validateData(d), 'is a question, not a leaf'));
});

test('a loop in the tree is fatal', () => {
  const d = copy();
  node(d, 'q-alcohol').options.find((o) => o.answer === 'no').next = 'q-hazard';
  const r = validateData(d);
  assert.ok(hasError(r, 'Flow has a loop back to "q-hazard"'));
  assert.equal(r.fatal, true);
  assert.deepEqual(r.validItems, []);
});

test('a node reached from two places is fatal', () => {
  const d = copy();
  node(d, 'q-paper-dirty').options.find((o) => o.answer === 'no').next = 'leaf-packaging-blue';
  const r = validateData(d);
  assert.ok(hasError(r, 'Flow node "leaf-packaging-blue" is reached from 2 places'));
  assert.equal(r.fatal, true);
});

test('an unreachable node is fatal', () => {
  const d = copy();
  d.flowNodes.push({ id: 'leaf-orphan', type: 'leaf', bin: 'garbage' });
  const r = validateData(d);
  assert.ok(hasError(r, 'Flow node "leaf-orphan" can\'t be reached from flowStart'));
  assert.equal(r.fatal, true);
});

test('coffee-pod exception passes, and its warning only fires on unverified data', () => {
  const d = copy();
  d.items.push({
    id: 'coffee-pod', name: 'Compostable coffee pod', level: 2, bin: 'blue',
    exitNode: 'leaf-compostable-garbage', exception: true,
    reason: 'Unlike compostable cups, Toronto takes coffee pods of any material in the Blue Bin. Empty it and keep the lid on.',
    start: {}, steps: [], verified: false,
  });
  const r = validateData(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.validItems.some((i) => i.id === 'coffee-pod'));
  assert.ok(r.warnings.some((w) => w.includes('"coffee-pod" is not verified yet')));
});

test('exception without a reason that explains it gets a warning', () => {
  const d = copy();
  d.items.push({
    id: 'coffee-pod', name: 'Compostable coffee pod', level: 2, bin: 'blue',
    exitNode: 'leaf-compostable-garbage', exception: true,
    reason: 'Coffee pods go in the Blue Bin.', start: {}, steps: [],
  });
  const r = validateData(d);
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('"coffee-pod" is an exception')));
});

test('exception on an item the tree already gets right is an error', () => {
  const d = copy();
  item(d, 'flyers').exception = true;
  assert.ok(hasError(validateData(d), '"exception": true but the flow already gives the right bin'));
});

test('cantEmptyTo and scrapsTo are optional', () => {
  const d = copy();
  const prep = node(d, 'q-empty');
  delete prep.cantEmptyTo;
  delete prep.scrapsTo;
  d.flowNodes = d.flowNodes.filter((n) => n.id !== 'leaf-cant-empty');
  assert.deepEqual(validateData(d).errors, []);
});

test('scrapsTo must be a bin; cantEmptyTo must be a partial leaf', () => {
  const d = copy();
  node(d, 'q-empty').scrapsTo = 'compost';
  assert.ok(hasError(validateData(d), 'scrapsTo is unknown bin "compost"'));

  const d2 = copy();
  node(d2, 'leaf-cant-empty').partial = false;
  assert.ok(hasError(validateData(d2), 'cantEmptyTo must be a leaf with "partial": true'));
});

test('old v0.1 fields are rejected', () => {
  const d = copy();
  item(d, 'pop-can').exitStep = 7;
  assert.ok(hasError(validateData(d), '"exitStep" was replaced by "exitNode"'));

  const d2 = copy();
  d2.flow = [];
  const r = validateData(d2);
  assert.ok(hasError(r, '"flow" was replaced'));
  assert.equal(r.fatal, true);
});

test('every item has a route, and food/liquid items pass the prep node', () => {
  const routes = buildRoutes(good);
  for (const it of good.items) {
    assert.ok(routes.has(it.exitNode), it.id);
    if (it.start.liquid || it.start.food) {
      assert.ok(routes.get(it.exitNode).some((s) => s.node === 'q-empty'), it.id);
    }
  }
});