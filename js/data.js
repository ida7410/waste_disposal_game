// The only place game data is fetched. See SPEC.md 8.2.
import { validateData } from './validate-core.js';

export const DEFAULT_DATA_URL = 'data/items.json';

// A host app can set window.SortRight = { dataUrl } before the game loads.
export function resolveDataUrl(host = globalThis.window) {
  return host?.SortRight?.dataUrl ?? DEFAULT_DATA_URL;
}

/**
 * Load, validate and return game data. Invalid items are logged and skipped.
 * If a custom URL fails (network, HTTP error, bad JSON or unusable data),
 * falls back to the bundled data/items.json. Throws only if that fails too.
 */
export async function loadGameData(url = resolveDataUrl(), { fetchFn = globalThis.fetch, logger = console } = {}) {
  try {
    return await loadFrom(url, fetchFn, logger);
  } catch (e) {
    if (url === DEFAULT_DATA_URL) throw e;
    logger.warn(`SortRight: could not use ${url} (${e.message}). Falling back to ${DEFAULT_DATA_URL}.`);
    return loadFrom(DEFAULT_DATA_URL, fetchFn, logger);
  }
}

async function loadFrom(url, fetchFn, logger) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();

  const { errors, warnings, fatal, validItems } = validateData(raw);
  for (const w of warnings) logger.warn(`SortRight data warning: ${w}`);
  for (const e of errors) logger.error(`SortRight data error: ${e}`);
  if (fatal) throw new Error('data file is not usable');
  if (!validItems.length) throw new Error('no valid items');
  if (validItems.length < raw.items.length) {
    logger.warn(`SortRight: skipped ${raw.items.length - validItems.length} invalid item(s) from ${url}.`);
  }

  return { ...raw, items: validItems, source: url };
}
