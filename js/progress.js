// Local progress: best accuracy per mode and level. No DOM.
// Every storage call is wrapped: the game must work when storage is blocked.
// Shape: { modes: { 'quick-sort': { 1: { best: 0.9 } } } }

const KEY = 'sortright.progress.v2';

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

export function bestAccuracy(mode, level, store = defaultStore()) {
  const best = loadProgress(store).modes?.[mode]?.[level]?.best;
  return typeof best === 'number' ? best : null;
}

export function recordLevel(mode, level, accuracy, store = defaultStore()) {
  try {
    const progress = loadProgress(store);
    const modes = progress.modes && typeof progress.modes === 'object' ? progress.modes : {};
    const levels = modes[mode] && typeof modes[mode] === 'object' ? modes[mode] : {};
    const prev = levels[level]?.best ?? 0;
    levels[level] = { best: Math.max(prev, accuracy) };
    modes[mode] = levels;
    store?.setItem(KEY, JSON.stringify({ ...progress, modes }));
    return true;
  } catch {
    return false;
  }
}
