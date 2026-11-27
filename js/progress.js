// Local progress (best accuracy per level). No DOM.
// Every storage call is wrapped: the game must work when storage is blocked.

const KEY = 'sortright.progress.v1';

function defaultStore() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function loadProgress(store = defaultStore()) {
  try {
    const raw = store?.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function bestAccuracy(level, store = defaultStore()) {
  const best = loadProgress(store).levels?.[level]?.best;
  return typeof best === 'number' ? best : null;
}

export function recordLevel(level, accuracy, store = defaultStore()) {
  try {
    const progress = loadProgress(store);
    const levels = progress.levels && typeof progress.levels === 'object' ? progress.levels : {};
    const prev = levels[level]?.best ?? 0;
    levels[level] = { best: Math.max(prev, accuracy) };
    store?.setItem(KEY, JSON.stringify({ ...progress, levels }));
    return true;
  } catch {
    return false;
  }
}
