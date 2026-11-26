// Drag-to-target with Pointer Events: one code path for touch, mouse and pen.
// A press that barely moves counts as a tap. The element needs
// `touch-action: none` in CSS so the page doesn't scroll while dragging.

const TAP_SLOP = 8; // px a pointer may move and still count as a tap

export function attachDrag(el, { targets, canStart = () => true, onTap, onDrop }) {
  let d = null;

  function hit(x, y) {
    return targets.find((t) => {
      if (t.disabled) return false;
      const r = t.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }) ?? null;
  }

  function setOver(target) {
    if (target === d.over) return;
    d.over?.classList.remove('is-target');
    target?.classList.add('is-target');
    d.over = target;
  }

  function down(e) {
    if (d || !canStart() || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    el.setPointerCapture(e.pointerId);
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, over: null };
  }

  function move(e) {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP) return;
    if (!d.moved) {
      d.moved = true;
      el.classList.add('is-dragging');
    }
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    setOver(hit(e.clientX, e.clientY));
  }

  function up(e) {
    if (!d || e.pointerId !== d.id) return;
    const { moved, over } = d;
    // After a successful drop, snap home instantly instead of gliding back over the feedback.
    reset({ snap: Boolean(over) });
    if (!moved) onTap?.();
    else if (over) onDrop?.(over);
  }

  function reset({ snap = false } = {}) {
    if (!d) return;
    d.over?.classList.remove('is-target');
    d = null;
    if (snap) el.style.transition = 'none';
    el.style.transform = '';
    el.classList.remove('is-dragging');
    // Bring transitions back once the jump has been painted.
    if (snap) requestAnimationFrame(() => { el.style.transition = ''; });
  }

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  const cancel = () => reset();
  el.addEventListener('pointercancel', cancel);

  return {
    stop() {
      reset();
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', cancel);
    },
  };
}
