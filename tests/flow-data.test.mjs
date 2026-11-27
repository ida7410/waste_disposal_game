import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGameData } from '../js/data.js';
import { buildRoutes } from '../js/validate-core.js';
const good = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));
const quiet = { warn() {}, error() {} };
const fake = (map) => async (u) => map[u] === undefined ? { ok: false, status: 404 } : { ok: true, json: async () => structuredClone(map[u]) };

test('loads all 40 v0.2 items', async () => {
  const d = await loadGameData('data/items.json', { fetchFn: fake({ 'data/items.json': good }), logger: quiet });
  assert.equal(d.items.length, 40);
  assert.equal(d.flowStart, 'q-hazard');
});
test('skips a bad item but keeps the rest', async () => {
  const bad = structuredClone(good); bad.items[0].exitNode = 'leaf-paper-green';
  const d = await loadGameData('data/items.json', { fetchFn: fake({ 'data/items.json': bad }), logger: quiet });
  assert.equal(d.items.length, 39);
  assert.ok(!d.items.some((i) => i.id === 'water-bottle'));
});
test('broken tree is fatal, custom URL falls back to bundled file', async () => {
  const bad = structuredClone(good); bad.flowNodes.find((n) => n.id === 'q-alcohol').options[1].next = 'q-hazard';
  const d = await loadGameData('https://partner/items.json', { fetchFn: fake({ 'https://partner/items.json': bad, 'data/items.json': good }), logger: quiet });
  assert.equal(d.source, 'data/items.json');
  assert.equal(d.items.length, 40);
});
test('old v0.1 file is fatal', async () => {
  const old = { ...structuredClone(good), flow: [] }; delete old.flowNodes;
  await assert.rejects(loadGameData('data/items.json', { fetchFn: fake({ 'data/items.json': old }), logger: quiet }));
});
test('every item has a route from the start', () => {
  const routes = buildRoutes(good);
  for (const it of good.items) assert.ok(routes.has(it.exitNode), it.id);
});