import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadGameData, resolveDataUrl, DEFAULT_DATA_URL } from '../js/data.js';

const real = JSON.parse(readFileSync(new URL('../data/items.json', import.meta.url), 'utf8'));

// Fake fetch: routes map url -> data object, Error (network failure) or number (HTTP status).
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const r = routes[url];
    if (r instanceof Error || r === undefined) throw r ?? new Error('not found');
    if (typeof r === 'number') return { ok: false, status: r, json: async () => ({}) };
    if (typeof r === 'string') return { ok: true, status: 200, json: async () => JSON.parse(r) };
    return { ok: true, status: 200, json: async () => structuredClone(r) };
  };
  fn.calls = calls;
  return fn;
}

function quietLogger() {
  const log = { warn: [], error: [] };
  return { log, warn: (m) => log.warn.push(m), error: (m) => log.error.push(m) };
}

test('resolveDataUrl uses window.SortRight.dataUrl when set', () => {
  assert.equal(resolveDataUrl(undefined), DEFAULT_DATA_URL);
  assert.equal(resolveDataUrl({}), DEFAULT_DATA_URL);
  assert.equal(resolveDataUrl({ SortRight: {} }), DEFAULT_DATA_URL);
  assert.equal(resolveDataUrl({ SortRight: { dataUrl: 'https://x.test/a.json' } }), 'https://x.test/a.json');
});

test('loads the default file', async () => {
  const fetchFn = fakeFetch({ [DEFAULT_DATA_URL]: real });
  const logger = quietLogger();
  const data = await loadGameData(DEFAULT_DATA_URL, { fetchFn, logger });
  assert.equal(data.items.length, 40);
  assert.equal(data.source, DEFAULT_DATA_URL);
  assert.deepEqual(logger.log.error, []);
});

test('uses a working custom URL without touching the default', async () => {
  const custom = structuredClone(real);
  custom.items = custom.items.filter((it) => it.level === 1);
  const fetchFn = fakeFetch({ 'https://x.test/a.json': custom, [DEFAULT_DATA_URL]: real });
  const data = await loadGameData('https://x.test/a.json', { fetchFn, logger: quietLogger() });
  assert.equal(data.items.length, 10);
  assert.deepEqual(fetchFn.calls, ['https://x.test/a.json']);
});

for (const [label, failure] of [
  ['network error', new Error('offline')],
  ['HTTP 500', 500],
  ['bad JSON', '{not json'],
  ['unusable data', { bins: 'nope' }],
]) {
  test(`custom URL ${label} falls back to the bundled file`, async () => {
    const fetchFn = fakeFetch({ 'https://x.test/a.json': failure, [DEFAULT_DATA_URL]: real });
    const logger = quietLogger();
    const data = await loadGameData('https://x.test/a.json', { fetchFn, logger });
    assert.equal(data.source, DEFAULT_DATA_URL);
    assert.equal(data.items.length, 40);
    assert.ok(logger.log.warn.some((m) => m.includes('Falling back')));
  });
}

test('invalid items are logged and skipped, valid ones kept', async () => {
  const broken = structuredClone(real);
  broken.items[0].bin = 'moon';
  broken.items[1].reason = '';
  const fetchFn = fakeFetch({ [DEFAULT_DATA_URL]: broken });
  const logger = quietLogger();
  const data = await loadGameData(DEFAULT_DATA_URL, { fetchFn, logger });
  assert.equal(data.items.length, 38);
  // bin "moon" also breaks the exitStep match, so 3 errors for 2 items.
  assert.equal(logger.log.error.length, 3);
  assert.ok(!data.items.some((it) => it.id === real.items[0].id));
});

test('throws when the bundled file itself fails', async () => {
  const fetchFn = fakeFetch({ [DEFAULT_DATA_URL]: 404 });
  await assert.rejects(loadGameData(DEFAULT_DATA_URL, { fetchFn, logger: quietLogger() }), /HTTP 404/);
});
