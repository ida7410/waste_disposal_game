// Lid (SPEC.md 5.2). A loose cap sits beside the container. Drag it onto the
// neck (it snaps when the pointer is within ~24 px), then twist it on with a
// circular swipe. auto() ("Lid on" button / keyboard) runs the same steps.
import { attachDrag } from '../drag.js';

const TWIST_DEG = 270; // how far the player circles to screw it on
const SNAP_PX = 24;

let ctx = null;

/**
 * opts: { cap: [x, y, w, h] on the 120 canvas, capSvg, isBlocked(), onBlocked(), onSnap(), onTwistHint(), reducedMotion }
 * itemEl is the element the cap is positioned in (same box as the drawing).
 */
export function start(itemEl, state, onDone, opts) {
  stop();
  if (state.lid !== false || !opts.cap) return;
  const [x, y, w, h] = opts.cap;
  const neck = { left: `${((x + w / 2) / 120) * 100}%`, top: `${((y + h / 2) / 120) * 100}%` };

  const capEl = document.createElement('div');
  capEl.className = 'cap draggable is-loose';
  capEl.setAttribute('aria-hidden', 'true');
  capEl.innerHTML = opts.capSvg;
  const svg = capEl.firstElementChild;
  if (svg) svg.style.width = `${(itemEl.getBoundingClientRect().width * (w + 4)) / 120}px`;

  const target = document.createElement('div');
  target.className = 'neck-target';
  target.setAttribute('aria-hidden', 'true');
  Object.assign(target.style, { ...neck, width: `${SNAP_PX * 2}px`, height: `${SNAP_PX * 2}px` });

  itemEl.append(target, capEl);
  ctx = { itemEl, capEl, target, neck, onDone, ...opts, snapped: false, twist: null, turned: 0, timer: 0 };
  ctx.drag = attachDrag(capEl, { targets: [target], onDrop: () => tryToSnap() });
}

export function auto() {
  if (!ctx) return;
  if (ctx.isBlocked?.()) {
    ctx.onBlocked?.();
    return;
  }
  if (ctx.reducedMotion) {
    finish();
    return;
  }
  if (!ctx.snapped) snap();
  ctx.capEl.classList.add('is-twisting');
  ctx.timer = setTimeout(finish, 700);
}

export function stop() {
  if (!ctx) return;
  clearTimeout(ctx.timer);
  ctx.drag?.stop();
  const c = ctx.capEl;
  c.removeEventListener('pointerdown', onDown);
  c.removeEventListener('pointermove', onMove);
  c.removeEventListener('pointerup', onUp);
  c.removeEventListener('pointercancel', onUp);
  c.remove();
  ctx.target.remove();
  ctx = null;
}

function finish() {
  const done = ctx.onDone;
  stop();
  done();
}

function tryToSnap() {
  if (ctx.isBlocked?.()) {
    ctx.onBlocked?.();
    return;
  }
  snap();
  ctx.onSnap?.();
}

function snap() {
  ctx.drag.stop();
  ctx.drag = null;
  ctx.snapped = true;
  ctx.target.remove();
  const c = ctx.capEl;
  c.classList.remove('is-loose', 'draggable');
  // Sits crooked with a ↻ badge until it's twisted, so it never looks finished.
  c.classList.add('on-neck', 'needs-twist');
  const badge = document.createElement('span');
  badge.className = 'twist-badge';
  badge.textContent = '↻';
  c.append(badge);
  Object.assign(c.style, ctx.neck);
  c.addEventListener('pointerdown', onDown);
  c.addEventListener('pointermove', onMove);
  c.addEventListener('pointerup', onUp);
  c.addEventListener('pointercancel', onUp);
}

function angleAt(e) {
  const r = ctx.capEl.getBoundingClientRect();
  return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
}

function onDown(e) {
  if (!ctx || ctx.twist) return;
  e.preventDefault();
  e.stopPropagation();
  ctx.capEl.setPointerCapture(e.pointerId);
  ctx.twist = { id: e.pointerId, prev: angleAt(e) };
}

function onMove(e) {
  const t = ctx?.twist;
  if (!t || e.pointerId !== t.id) return;
  const a = angleAt(e);
  let d = a - t.prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  t.prev = a;
  ctx.turned += Math.abs(d);
  ctx.capEl.style.setProperty('--twist', String(Math.min(1, ctx.turned / TWIST_DEG)));
  if (ctx.turned >= TWIST_DEG) finish();
}

function onUp(e) {
  if (ctx?.twist?.id !== e.pointerId) return;
  ctx.twist = null;
  // A tap or a short wiggle: explain the gesture.
  if (ctx.turned < 60) ctx.onTwistHint?.();
}

/** True once the cap is on the neck but not yet twisted (for feedback). */
export function isSnappedNotTwisted() {
  return Boolean(ctx?.snapped);
}
