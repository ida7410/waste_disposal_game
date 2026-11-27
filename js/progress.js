// Local progress: best accuracy per mode and level. No DOM.
// Every storage call is wrapped: the game must work when storage is blocked.
// Shape: { modes: { 'quick-sort': { 1: { best: 0.9 } } } }

const KEY = 'sortright.progress.v2';
// SPEC.md 7: the next level unlocks at 70% accuracy on the one before.
export const UNLOCK_ACCURACY = 0.7;

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

/**
 * The first level is always open; each later one opens once the level before
 * it (in `levelOrder`) has a best of at least UNLOCK_ACCURACY in this mode.
 */
export function isUnlocked(mode, level, levelOrder, store = defaultStore()) {
  const i = levelOrder.indexOf(level);
  if (i <= 0) return true;
  const prev = bestAccuracy(mode, levelOrder[i - 1], store);
  return prev !== null && prev >= UNLOCK_ACCURACY;
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
