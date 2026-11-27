// Scrape (SPEC.md 5.3). Food residue is drawn as blobs inside the container.
// Rub/swipe over them: each blob clears after enough swipe distance. When
// all are gone the scraps are flicked into the scraps bin (the prep node's scrapsTo).
// auto() ("Scrape" button / keyboard) clears them one by one.

const SCRUB_PX = 70; // swipe distance over a blob before it clears
const HIT_PAD = 12; // px around a blob that still counts as "on" it

let ctx = null;

/** opts: { binEl (where scraps go, or null), reducedMotion } */
export function start(itemEl, state, onDone, opts) {
  stop();
  if (state.food !== true) return;
  const blobs = [...itemEl.querySelectorAll('circle.blob')];
  if (!blobs.length) return;
  ctx = { itemEl, onDone, ...opts, blobs: blobs.map((node) => ({ node, rubbed: 0, gone: false })), scrub: null, timers: [] };
  // Capture phase on the holder: a press on food scrapes instead of starting a drag.
  itemEl.addEventListener('pointerdown', onDown, true);
  itemEl.addEventListener('pointermove', onMove);
  itemEl.addEventListener('pointerup', onUp);
  itemEl.addEventListener('pointercancel', onUp);
}

export function auto() {
  if (!ctx) return;
  const left = ctx.blobs.filter((b) => !b.gone);
  if (ctx.reducedMotion) {
    left.forEach(clear);
    flick();
    return;
  }
  left.forEach((b, i) => ctx.timers.push(setTimeout(() => ctx && clear(b), 150 * (i + 1))));
  ctx.timers.push(setTimeout(() => ctx && flick(), 150 * (left.length + 1)));
}

export function stop() {
  if (!ctx) return;
  ctx.timers.forEach(clearTimeout);
  const h = ctx.itemEl;
  h.removeEventListener('pointerdown', onDown, true);
  h.removeEventListener('pointermove', onMove);
  h.removeEventListener('pointerup', onUp);
  h.removeEventListener('pointercancel', onUp);
  h.classList.remove('is-scraping');
  ctx = null;
}

function blobAt(x, y) {
  return ctx.blobs.find((b) => {
    if (b.gone) return false;
    const r = b.node.getBoundingClientRect();
    return x >= r.left - HIT_PAD && x <= r.right + HIT_PAD && y >= r.top - HIT_PAD && y <= r.bottom + HIT_PAD;
  });
}

function onDown(e) {
  if (!ctx || ctx.scrub || !blobAt(e.clientX, e.clientY)) return;
  e.stopPropagation(); // don't let the item drag start
  e.preventDefault();
  ctx.itemEl.setPointerCapture(e.pointerId);
  ctx.scrub = { id: e.pointerId, x: e.clientX, y: e.clientY };
  ctx.itemEl.classList.add('is-scraping');
}

function onMove(e) {
  const s = ctx?.scrub;
  if (!s || e.pointerId !== s.id) return;
  const d = Math.hypot(e.clientX - s.x, e.clientY - s.y);
  s.x = e.clientX;
  s.y = e.clientY;
  const blob = blobAt(e.clientX, e.clientY);
  if (!blob) return;
  blob.rubbed += d;
  blob.node.style.opacity = String(Math.max(0.15, 1 - blob.rubbed / SCRUB_PX));
  if (blob.rubbed >= SCRUB_PX) clear(blob);
  if (ctx.blobs.every((b) => b.gone)) flick();
}

function onUp(e) {
  if (ctx?.scrub?.id !== e.pointerId) return;
  ctx.scrub = null;
  ctx.itemEl.classList.remove('is-scraping');
}

function clear(blob) {
  blob.gone = true;
  blob.node.style.opacity = '0';
}

// Send the scraps to their bin, then report done.
function flick() {
  const { itemEl, binEl, reducedMotion } = ctx;
  const done = ctx.onDone;
  stop();
  if (!binEl || reducedMotion || !itemEl.animate) {
    done();
    return;
  }
  const from = itemEl.getBoundingClientRect();
  const to = binEl.getBoundingClientRect();
  const scrap = document.createElement('div');
  scrap.className = 'scrap-fly';
  scrap.setAttribute('aria-hidden', 'true');
  Object.assign(scrap.style, { left: `${from.left + from.width / 2 - 12}px`, top: `${from.top + from.height * 0.7 - 12}px` });
  document.body.append(scrap);
  const dx = to.left + to.width / 2 - (from.left + from.width / 2);
  const dy = to.top + to.height * 0.3 - (from.top + from.height * 0.7);
  const anim = scrap.animate(
    [{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 60}px) scale(1.1)` }, { transform: `translate(${dx}px, ${dy}px) scale(.6)`, opacity: 0.6 }],
    { duration: 550, easing: 'ease-in' },
  );
  anim.onfinish = () => {
    scrap.remove();
    binEl.classList.add('is-fed');
    setTimeout(() => binEl.classList.remove('is-fed'), 400);
    done();
  };
}
