// Rinse (SPEC.md 5.4). With the item over the sink, press and hold it under
// the tap: a progress ring fills over ~1.5 s, then it's clean. Moving the
// pointer (a drag) or letting go early stops it. auto() ("Rinse" button /
// keyboard) fills the ring by itself; the caller docks the item first.

const HOLD_MS = 1500;
const MOVE_SLOP = 12; // px: moving more than this is a drag, not a hold

let ctx = null;

/** opts: { sinkEl, isDocked(), onHint(text), reducedMotion } */
export function start(itemEl, state, onDone, opts) {
  stop();
  if (state.dirty !== true) return;
  const ring = document.createElement('div');
  ring.className = 'rinse-ring';
  ring.setAttribute('aria-hidden', 'true');
  itemEl.append(ring);
  ctx = { itemEl, ring, onDone, ...opts, hold: null, raf: 0, progress: 0 };
  itemEl.addEventListener('pointerdown', onDown);
  itemEl.addEventListener('pointermove', onMove);
  itemEl.addEventListener('pointerup', onUp);
  itemEl.addEventListener('pointercancel', onUp);
}

export function auto() {
  if (!ctx) return;
  if (ctx.reducedMotion) {
    finish();
    return;
  }
  begin(null);
}

export function stop() {
  if (!ctx) return;
  cancelAnimationFrame(ctx.raf);
  const h = ctx.itemEl;
  h.removeEventListener('pointerdown', onDown);
  h.removeEventListener('pointermove', onMove);
  h.removeEventListener('pointerup', onUp);
  h.removeEventListener('pointercancel', onUp);
  ctx.sinkEl?.classList.remove('is-rinsing');
  ctx.ring.remove();
  ctx = null;
}

function finish() {
  const done = ctx.onDone;
  stop();
  done();
}

function setProgress(p) {
  ctx.progress = p;
  ctx.ring.style.setProperty('--p', String(p));
  ctx.ring.classList.toggle('is-on', p > 0);
}

// pointer: { id, x, y } for a held press, or null for auto().
function begin(pointer) {
  ctx.hold = { pointer, t0: performance.now() };
  ctx.sinkEl?.classList.add('is-rinsing');
  const tick = (now) => {
    if (!ctx?.hold) return;
    const p = Math.min(1, (now - ctx.hold.t0) / HOLD_MS);
    setProgress(p);
    if (p >= 1) {
      finish();
      return;
    }
    ctx.raf = requestAnimationFrame(tick);
  };
  ctx.raf = requestAnimationFrame(tick);
}

function cancel(hint) {
  cancelAnimationFrame(ctx.raf);
  ctx.hold = null;
  ctx.sinkEl?.classList.remove('is-rinsing');
  setProgress(0);
  if (hint) ctx.onHint?.(hint);
}

function onDown(e) {
  if (!ctx || ctx.hold || !ctx.isDocked()) return;
  begin({ id: e.pointerId, x: e.clientX, y: e.clientY });
}

function onMove(e) {
  const p = ctx?.hold?.pointer;
  if (!p || e.pointerId !== p.id) return;
  if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > MOVE_SLOP) cancel();
}

function onUp(e) {
  const p = ctx?.hold?.pointer;
  if (!p || e.pointerId !== p.id) return;
  cancel('Hold it under the tap a little longer.');
}
