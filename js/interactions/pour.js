// Pour (SPEC.md 5.1). The player drags the container over the sink (the
// workstation docks it there), then turns it with the tilt handle. Past
// ~100 degrees liquid flows and the fill level drops; tilting back or being
// off the sink stops it. Tilting away from the sink spills and shows a hint.
// Done when the fill reaches 0. auto() is the button/keyboard alternative.

const THRESHOLD = 100; // degrees before liquid flows
const MAX_TILT = 150;
const AUTO_TILT = 115;
const DRAIN_MS = 1500; // full to empty while pouring

let ctx = null;

/**
 * opts: { tiltEl, handleEl, sinkEl, isDocked(), onFill(fill), onSpill(), onEmpty(), reducedMotion }
 * The interaction never changes state; it calls onDone() when the container is empty.
 * It also runs for items with nothing in them (so the handle doesn't give the
 * answer away): tipping those over the sink calls onEmpty() instead.
 */
export function start(itemEl, state, onDone, opts) {
  stop();
  const fill = state.liquid === true ? 1 : 0;
  ctx = { itemEl, onDone, ...opts, fill, tilt: 0, turning: null, spillHinted: false, emptyHinted: false, last: performance.now(), raf: 0 };
  const h = ctx.handleEl;
  h.addEventListener('pointerdown', onDown);
  h.addEventListener('pointermove', onMove);
  h.addEventListener('pointerup', onUp);
  h.addEventListener('pointercancel', onUp);
  ctx.raf = requestAnimationFrame(tick);
}

/** Button alternative: the caller docks the item first, then this tips it and drains. */
export function auto() {
  if (!ctx) return;
  if (ctx.reducedMotion) {
    ctx.fill = 0;
    ctx.onFill?.(0);
    finish();
    return;
  }
  ctx.auto = true;
  setTilt(AUTO_TILT);
}

export function stop() {
  if (!ctx) return;
  cancelAnimationFrame(ctx.raf);
  const h = ctx.handleEl;
  h.removeEventListener('pointerdown', onDown);
  h.removeEventListener('pointermove', onMove);
  h.removeEventListener('pointerup', onUp);
  h.removeEventListener('pointercancel', onUp);
  ctx.sinkEl?.classList.remove('is-pouring');
  ctx.itemEl.classList.remove('is-spilling');
  ctx.tiltEl.classList.remove('is-turning');
  ctx.tiltEl.style.transform = '';
  ctx = null;
}

function finish() {
  const done = ctx.onDone;
  stop();
  done();
}

function setTilt(deg) {
  ctx.tilt = Math.max(-MAX_TILT, Math.min(MAX_TILT, deg));
  ctx.tiltEl.style.transform = ctx.tilt ? `rotate(${ctx.tilt}deg)` : '';
}

function angleAt(e) {
  const r = ctx.tiltEl.getBoundingClientRect();
  return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
}

function onDown(e) {
  if (!ctx || ctx.auto || ctx.turning) return;
  e.preventDefault();
  e.stopPropagation();
  ctx.handleEl.setPointerCapture(e.pointerId);
  ctx.turning = { id: e.pointerId, prev: angleAt(e) };
  ctx.tiltEl.classList.add('is-turning');
}

function onMove(e) {
  const t = ctx?.turning;
  if (!t || e.pointerId !== t.id) return;
  const a = angleAt(e);
  let d = a - t.prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  t.prev = a;
  setTilt(ctx.tilt + d);
}

function onUp(e) {
  const t = ctx?.turning;
  if (!t || e.pointerId !== t.id) return;
  ctx.turning = null;
  ctx.tiltEl.classList.remove('is-turning');
  setTilt(0); // springs back upright (CSS transition)
}

function tick(now) {
  if (!ctx) return;
  const dt = Math.min(64, now - ctx.last);
  ctx.last = now;
  const tipped = Math.abs(ctx.tilt) >= THRESHOLD;
  const docked = ctx.isDocked();
  const hasLiquid = ctx.fill > 0;
  const pouring = tipped && docked && hasLiquid;

  ctx.sinkEl?.classList.toggle('is-pouring', pouring);
  ctx.itemEl.classList.toggle('is-spilling', tipped && !docked && hasLiquid);
  if (tipped && !docked && hasLiquid && !ctx.spillHinted) {
    ctx.spillHinted = true;
    ctx.onSpill?.();
  }
  if (tipped && !hasLiquid && !ctx.emptyHinted) {
    ctx.emptyHinted = true;
    ctx.onEmpty?.();
  }
  if (!tipped) {
    ctx.spillHinted = false;
    ctx.emptyHinted = false;
  }

  if (pouring) {
    ctx.fill = Math.max(0, ctx.fill - dt / DRAIN_MS);
    ctx.onFill?.(ctx.fill);
    if (ctx.fill <= 0) {
      finish();
      return;
    }
  }
  ctx.raf = requestAnimationFrame(tick);
}
