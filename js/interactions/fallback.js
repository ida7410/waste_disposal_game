// Fallback actions (SPEC.md 5.5): one tap, a short animation, then onDone().
// Used for separate, tape and flip, and for scrape/rinse until they get
// their own gestures (Milestone 3). The explaining sentence is shown by the
// workstation (text.actionDoneText).

const DURATION_MS = 700;
let current = null;

/** opts: { action, reducedMotion } */
export function start(itemEl, state, onDone, { action, reducedMotion }) {
  stop();
  if (reducedMotion) {
    onDone();
    return;
  }
  const cls = `fx-${action}`;
  itemEl.classList.add('fx', cls);
  current = {
    itemEl,
    cls,
    timer: setTimeout(() => {
      stop();
      onDone();
    }, DURATION_MS),
  };
}

export function stop() {
  if (!current) return;
  clearTimeout(current.timer);
  current.itemEl.classList.remove('fx', current.cls);
  current = null;
}
