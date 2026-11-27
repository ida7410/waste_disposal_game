// Lid (SPEC.md 5.2). A loose cap sits beside the container. Drag it onto the
// neck: it snaps on when the pointer is within ~24 px, and the lid is on.
// auto() ("Lid on" button / keyboard) moves the cap there by itself.
import { attachDrag } from '../drag.js';

const SNAP_PX = 24;
const SNAP_MS = 300; // the cap slides onto the neck before the item is redrawn

let ctx = null;

/**
 * opts: { cap: [x, y, w, h] on the 120 canvas, capSvg, isBlocked(), onBlocked(), reducedMotion }
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
  ctx = { itemEl, capEl, target, neck, onDone, ...opts, timer: 0 };
  ctx.drag = attachDrag(capEl, { targets: [target], onDrop: putOn });
}

export function auto() {
  if (ctx) putOn();
}

export function stop() {
  if (!ctx) return;
  clearTimeout(ctx.timer);
  ctx.drag?.stop();
  ctx.capEl.remove();
  ctx.target.remove();
  ctx = null;
}

function putOn() {
  if (ctx.isBlocked?.()) {
    ctx.onBlocked?.();
    return;
  }
  ctx.drag.stop();
  ctx.drag = null;
  const c = ctx.capEl;
  c.classList.remove('is-loose', 'draggable');
  c.classList.add('on-neck');
  Object.assign(c.style, ctx.neck);
  ctx.timer = setTimeout(finish, ctx.reducedMotion ? 0 : SNAP_MS);
}

function finish() {
  const done = ctx.onDone;
  stop();
  done();
}
