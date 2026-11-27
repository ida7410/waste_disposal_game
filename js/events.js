// Optional host hook (SPEC.md 10): window.SortRight.onEvent({ type, ... }).
// Events: level_start, item_result, level_end. Never include personal data.

export function emit(type, payload = {}, host = globalThis.window) {
  const handler = host?.SortRight?.onEvent;
  if (typeof handler !== 'function') return false;
  try {
    handler({ type, ...payload });
    return true;
  } catch (e) {
    console.warn('SortRight: onEvent handler threw an error.', e);
    return false;
  }
}
