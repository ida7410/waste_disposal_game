import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateData } from '../js/validate-core.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const clone = () => structuredClone(real);
const item = (data, id) => data.items.find((it) => it.id === id);

function expectItemError(mutate, fragment) {
  const data = clone();
  const badId = mutate(data);
  const res = validateData(data);
  assert.equal(res.fatal, false, 'item errors must not be fatal');
  assert.ok(res.errors.some((e) => e.includes(fragment)), `expected error containing "${fragment}", got:\n${res.errors.join('\n')}`);
  if (badId) assert.ok(!res.validItems.some((it) => it === item(data, badId)), 'bad item must be skipped');
  return res;
}

test('real items.json is valid with all 40 items', () => {
  const res = validateData(real);
  assert.deepEqual(res.errors, []);
  assert.equal(res.fatal, false);
  assert.equal(res.validItems.length, 40);
});

test('non-object or missing top-level arrays are fatal', () => {
  assert.equal(validateData(null).fatal, true);
  assert.equal(validateData([]).fatal, true);
  const data = clone();
  delete data.bins;
  const res = validateData(data);
  assert.equal(res.fatal, true);
  assert.deepEqual(res.validItems, []);
  assert.ok(res.errors[0].includes('"bins" must be an array'));
});

test('broken bins or flow are fatal', () => {
  const dupBin = clone();
  dupBin.bins.push({ ...dupBin.bins[0] });
  assert.equal(validateData(dupBin).fatal, true);

  const badTarget = clone();
  badTarget.flowNodes.find((n) => n.id === 'q-hazard').options[0].next = 'q-moon';
  assert.equal(validateData(badTarget).fatal, true);

  const unknownLeafBin = clone();
  unknownLeafBin.flowNodes.find((n) => n.id === 'leaf-special').bin = 'moon';
  assert.equal(validateData(unknownLeafBin).fatal, true);
});

test('item rules: each one is caught and the item skipped', () => {
  expectItemError((d) => { item(d, 'pop-can').bin = 'moon'; return 'pop-can'; }, 'unknown bin "moon"');
  expectItemError((d) => { item(d, 'pop-can').level = 9; return 'pop-can'; }, 'unknown level 9');
  expectItemError((d) => { item(d, 'pop-can').reason = ''; return 'pop-can'; }, 'reason must be a helpful sentence');
  expectItemError((d) => { delete item(d, 'pop-can').reason; return 'pop-can'; }, 'is missing "reason"');
  expectItemError((d) => { item(d, 'pop-can').id = 'Pop_Can'; return 'Pop_Can'; }, 'lowercase-with-dashes');
  expectItemError((d) => { item(d, 'pop-can').steps = ['juggle']; return 'pop-can'; }, 'unknown action "juggle"');
  expectItemError((d) => { item(d, 'pop-can').steps = ['pour', 'pour']; return 'pop-can'; }, 'repeated step');
  expectItemError((d) => { item(d, 'pop-can').start.sticky = true; return 'pop-can'; }, 'unknown start state "sticky"');
  expectItemError((d) => { item(d, 'pop-can').start.liquid = 'yes'; return 'pop-can'; }, 'must be true or false');
  expectItemError((d) => { item(d, 'pop-can').steps = []; return 'pop-can'; }, 'starts with liquid but has no "pour"');
  expectItemError((d) => { item(d, 'cereal-box').steps = ['lid']; return 'cereal-box'; }, 'step "lid" doesn\'t match');
  expectItemError((d) => { item(d, 'pop-can').exitNode = 'leaf-moon'; return 'pop-can'; }, 'is not a flow node');
  expectItemError((d) => { item(d, 'pop-can').exitNode = 'q-empty'; return 'pop-can'; }, 'is a question, not a leaf');
  expectItemError((d) => { item(d, 'pop-can').exitNode = 'leaf-organics-green'; return 'pop-can'; }, 'leads to "green" but bin is "blue"');
  expectItemError((d) => { item(d, 'pop-can').altBin = 'moon'; return 'pop-can'; }, 'unknown altBin');
  expectItemError((d) => { item(d, 'pop-can').steps = 'pour'; return 'pop-can'; }, 'steps must be an array');
});

test('duplicate id: the second copy is skipped, the first kept', () => {
  const data = clone();
  const copy = { ...item(data, 'pop-can'), name: 'Copy' };
  data.items.push(copy);
  const res = validateData(data);
  assert.ok(res.errors.some((e) => e.includes('duplicate id')));
  assert.ok(res.validItems.includes(item(data, 'pop-can')));
  assert.ok(!res.validItems.includes(copy));
});

test('junk entries in items do not crash', () => {
  const data = clone();
  data.items.push(null, 42, 'text');
  const res = validateData(data);
  assert.equal(res.validItems.length, 40);
  assert.equal(res.fatal, false);
});

test('warnings: unverified items and small levels, without errors', () => {
  const data = clone();
  item(data, 'pop-can').verified = false;
  data.items = data.items.filter((it) => it.id !== 'wine-bottle');
  const res = validateData(data);
  assert.deepEqual(res.errors, []);
  assert.ok(res.warnings.some((w) => w.includes('"pop-can" is not verified')));
  assert.ok(res.warnings.some((w) => w.includes('Level 4 has 9 items')));
  assert.ok(res.validItems.some((it) => it.id === 'pop-can'), 'unverified items are still playable');
});
