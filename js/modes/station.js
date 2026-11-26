// Prep & Sort workstation: the item (drag it to the sink or into a bin), the
// sink, a loose cap, the level's tool buttons and "Can't empty it now".
// It runs the interactions but never changes state: finished actions are
// reported with onAction(action), and the mode calls render() with the new state.
import { el } from '../dom.js';
import { attachDrag } from '../drag.js';
import { drawPrepItem, setFill } from '../art/prep-art.js';
import { sinkSvg } from '../art/sink.js';
import { canApply, blockedReason, needsEmptying } from '../state.js';
import { toolLabel, nothingToDoText, stateChips } from '../text.js';
import * as pour from '../interactions/pour.js';
import * as lid from '../interactions/lid.js';
import * as fallback from '../interactions/fallback.js';

const EMPTY_FIRST = 'Empty it first, then put the lid on.';
function stopInteractions() {
  pour.stop();
  lid.stop();
  fallback.stop();
}

const reducedMotion = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * tools: action ids offered in this level. binEls: drop targets.
 * Callbacks: onAction(action), onNoop(action), onBin(binId), onCantEmpty(), say(text)
 */
export function createStation({ tools, binEls, onAction, onNoop, onBin, onCantEmpty, say }) {
  const tilt = el('div', { class: 'tilt' });
  const itemEl = el('div', { class: 'item draggable' }, tilt);
  const handle = el('div', { class: 'tilt-handle', 'aria-hidden': 'true', title: 'Turn to pour' }, '↻');
  const holder = el('div', { class: 'item-holder', 'aria-hidden': 'true' }, itemEl, handle);
  const sink = tools.includes('pour') ? el('div', { class: 'sink', 'aria-hidden': 'true', html: sinkSvg() }) : null;
  const chips = el('ul', { class: 'chips', role: 'list', 'aria-label': 'Item state' });
  const toolBtns = tools.map((a) => el('button', { class: 'btn tool', type: 'button', 'data-action': a, onclick: () => useTool(a) }, toolLabel(a)));
  const cantBtn = el('button', { class: 'btn btn-ghost tool-cant', type: 'button', onclick: () => onCantEmpty() }, 'Can’t empty it now');

  const rootEl = el('div', { class: `station${sink ? ' has-sink' : ''}` }, chips, el('div', { class: 'bench' }, holder, sink));
  const toolsEl = el('div', { class: 'tools', role: 'group', 'aria-label': 'Prep tools' }, toolBtns, cantBtn);

  let item = null;
  let state = null;
  let docked = false;
  let busy = false;

  const drag = attachDrag(itemEl, {
    targets: [sink, ...binEls].filter(Boolean),
    canStart: () => Boolean(item) && !busy,
    onDrop: (t) => (t === sink ? dock(true) : onBin(t.dataset.bin)),
  });

  function show(nextItem, nextState) {
    item = nextItem;
    undock();
    render(nextState);
  }

  function render(nextState) {
    state = nextState;
    busy = false;
    const art = drawPrepItem(item, state);
    tilt.innerHTML = art.svg;
    chips.replaceChildren(...stateChips(state).map((t) => el('li', { class: 'chip' }, t)));
    cantBtn.hidden = !needsEmptying(state);
    handle.hidden = !(state.liquid && sink);
    stopInteractions();
    const rm = reducedMotion();
    if (state.liquid && sink) {
      pour.start(holder, state, () => finished('pour'), {
        tiltEl: tilt, handleEl: handle, sinkEl: sink, isDocked: () => docked,
        onFill: (f) => setFill(tilt, f), onSpill: () => say('Pour it into a sink or drain.'), reducedMotion: rm,
      });
    }
    if (state.lid === false && art.cap) {
      lid.start(holder, state, () => finished('lid'), {
        cap: art.cap, capSvg: art.capSvg, reducedMotion: rm,
        isBlocked: () => blockedReason(state, 'lid'), onBlocked: () => say(EMPTY_FIRST),
        onSnap: () => say('Now twist it on: circle the cap, or press “Lid on”.'),
      });
    }
  }

  function finished(action) {
    if (action === 'pour') setTimeout(undock, reducedMotion() ? 0 : 300);
    onAction(action);
  }

  function useTool(action) {
    if (!item || busy) return;
    if (!canApply(state, action)) {
      onNoop(action);
      say(blockedReason(state, action) === 'empty-first' ? EMPTY_FIRST : nothingToDoText(action));
      return;
    }
    busy = true;
    if (action === 'pour' && sink) {
      dock(false);
      setTimeout(() => pour.auto(), reducedMotion() ? 0 : 380);
    } else if (action === 'lid' && holder.querySelector('.cap')) {
      lid.auto();
    } else {
      fallback.start(holder, state, () => finished(action), { action, reducedMotion: reducedMotion() });
    }
  }

  function dock(fromDrag) {
    if (!sink || docked) return;
    const h = holder.getBoundingClientRect();
    const s = sink.getBoundingClientRect();
    const dx = s.left + s.width * 0.36 - (h.left + h.width / 2);
    const dy = s.top - h.height * 0.1 - (h.top + h.height / 2);
    holder.style.transform = `translate(${dx}px, ${dy}px) scale(.8)`;
    holder.classList.add('is-docked');
    docked = true;
    if (fromDrag && state.liquid) say('Over the sink. Now turn it with ↻ to pour.');
  }

  function undock() {
    holder.style.transform = '';
    holder.classList.remove('is-docked');
    docked = false;
  }


  /** Stop all gestures (after the item is binned). */
  function freeze() {
    stopInteractions();
    item = null;
    undock();
  }

  function destroy() {
    freeze();
    drag.stop();
  }

  return { rootEl, toolsEl, show, render, freeze, destroy };
}
