// Prep & Sort (SPEC.md 4.2): get the item ready (pour, lid on, ...), then put
// it in a bin by dragging it or tapping the bin. Bins check state, not just
// the item. "Can't empty it now" offers Carry it (comes back 2 items later)
// or the data's fallback bin for partial points.
import { el, mount, announce } from '../dom.js';
import { createRound, currentItem, record, next, isDone, summarize, score, defer, remaining } from '../round.js';
import { createItemState, applyAction } from '../state.js';
import { scorePrep } from '../scoring.js';
import {
  actionDoneText, prepHeading, contaminationText, nextTimeSentence, stateChips,
} from '../text.js';
import { emit } from '../events.js';
import { binIconSvg } from '../art/bins.js';
import { drawPrepItem, splashSvg } from '../art/prep-art.js';
import { createStation } from './station.js';
import { createFlow, nodeById } from '../flow.js';

const MODE = 'prep-sort';
const HINT = 'Get it ready, then drag it into a bin (or tap a bin).';

export function startPrepSort(root, { data, items, level, title, tools, practice = false, onExit, onFinish }) {
  const bins = data.bins;
  // Both read from the prep node in flowNodes (SPEC.md 8). cantEmptyTo is a partial leaf.
  const flow = createFlow(data);
  const cantEmptyLeaf = nodeById(flow, flow.prepNode?.cantEmptyTo);
  const cantEmptyTo = cantEmptyLeaf?.bin ?? null;
  const scrapsTo = flow.prepNode?.scrapsTo ?? null;
  const binLabel = (id) => bins.find((b) => b.id === id)?.label ?? id;
  // The note on the leaf the item ends at, e.g. "Keep lids on." for the Blue Bin.
  const exitNote = (item) => nodeById(flow, item.exitNode)?.note ?? '';

  let round = createRound(items, { level, practice });
  const states = new Map(); // item id -> state (kept while an item is carried)
  const used = new Map(); // item id -> tool uses, for the straight-in bonus
  const carried = new Set();
  let item = null;
  let state = null;
  let shownAt = 0;
  let answered = false;

  const progressEl = el('span', { class: 'pill' });
  const scoreEl = el('span', { class: 'pill' });
  const nameEl = el('p', { class: 'item-name' });
  const sayEl = el('p', { class: 'hint say' });
  const carryEl = el('p', { class: 'carry', hidden: true });
  const resultArt = el('div', { class: 'item result-art', 'aria-hidden': 'true', hidden: true });
  const fbTitle = el('h2', { class: 'feedback-title' });
  const fbReason = el('p', { class: 'feedback-reason' });
  const fbExtra = el('p', { class: 'feedback-extra' });
  const fbPrep = el('p', { class: 'feedback-prep' });
  const nextBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: goNext }, 'Next');
  const feedback = el('div', { class: 'feedback', hidden: true }, fbTitle, fbReason, fbExtra, fbPrep, nextBtn);

  const binEls = bins.map((b) => el('button', {
    class: 'bin', type: 'button', 'data-bin': b.id, style: { '--bin-color': b.color ?? '#5f6b7a' },
    onclick: () => choose(b.id),
  }, el('span', { class: 'bin-icon', html: binIconSvg(b.id) }), el('span', { class: 'bin-label' }, b.label)));

  const station = createStation({
    tools, binEls, scrapsBin: scrapsTo, onAction, onBin: (id) => choose(id), onCantEmpty: openCantPanel, say,
    onNoop: () => used.set(item.id, (used.get(item.id) ?? 0) + 1),
  });

  const carryBtn = el('button', { class: 'btn', type: 'button', onclick: carry }, 'Carry it');
  const giveUpBtn = el('button', { class: 'btn', type: 'button', onclick: () => choose(cantEmptyTo, true), hidden: !cantEmptyTo },
    `Put it in ${binLabel(cantEmptyTo)}`);
  const cantPanel = el('div', { class: 'cant-panel', role: 'group', 'aria-label': 'Can’t empty it now', hidden: true },
    el('p', {}, 'Can’t empty it right now?'), carryBtn, giveUpBtn,
    el('button', { class: 'btn btn-ghost', type: 'button', onclick: closeCantPanel }, 'Cancel'));

  mount(root, el('div', { class: 'screen play prep' },
    el('header', { class: 'topbar' },
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit }, '‹ Levels'),
      el('h1', { class: 'topbar-title', tabindex: '-1', 'data-autofocus': true }, practice ? `${title}: practice` : title),
      progressEl, scoreEl),
    el('section', { class: 'stage', 'aria-label': 'Workstation' }, nameEl, station.rootEl, resultArt, sayEl, carryEl, feedback),
    station.toolsEl, cantPanel,
    el('nav', { class: 'bins', 'aria-label': 'Bins', style: { '--bin-count': String(bins.length) } }, binEls)));

  emit('level_start', { mode: MODE, level, practice, count: round.items.length });
  showItem();

  function say(text) {
    sayEl.textContent = text;
    announce(text);
  }

  function showItem() {
    item = currentItem(round);
    carried.delete(item.id);
    state = states.get(item.id) ?? createItemState(item);
    answered = false;
    nameEl.textContent = item.name;
    station.rootEl.hidden = false;
    station.toolsEl.hidden = false;
    station.show(item, state);
    resultArt.hidden = true;
    feedback.hidden = true;
    closeCantPanel();
    sayEl.hidden = false;
    sayEl.textContent = HINT;
    for (const b of binEls) {
      b.classList.remove('is-correct', 'is-chosen', 'is-dim');
      b.querySelector('.splash')?.remove();
      b.disabled = false;
      b.setAttribute('aria-label', b.textContent);
    }
    carryEl.hidden = carried.size === 0;
    carryEl.textContent = `Carrying: ${[...carried].map((id) => round.items.find((i) => i.id === id)?.name).join(', ')}`;
    progressEl.textContent = `${round.index + 1} / ${round.items.length}`;
    scoreEl.textContent = `${score(round)} pts`;
    const chips = stateChips(state).join(', ');
    announce(`Item ${round.index + 1} of ${round.items.length}: ${item.name}. ${chips}`);
    shownAt = performance.now();
  }

  function onAction(action) {
    if (answered) return;
    state = applyAction(state, action).state;
    states.set(item.id, state);
    used.set(item.id, (used.get(item.id) ?? 0) + 1);
    const note = action === 'lid' ? exitNote(item) : '';
    const done = actionDoneText(action, { scrapsLabel: scrapsTo ? binLabel(scrapsTo) : null });
    say(note ? `${done} ${note}` : done);
    station.render(state);
  }

  function openCantPanel() {
    const left = remaining(round);
    carryBtn.disabled = left === 0;
    carryBtn.textContent = left === 0 ? 'Carry it (this is the last item)' : `Carry it (back in ${Math.min(2, left)})`;
    cantPanel.hidden = false;
    station.toolsEl.hidden = true;
    (carryBtn.disabled ? giveUpBtn : carryBtn).focus();
  }

  function closeCantPanel() {
    cantPanel.hidden = true;
    if (!answered) station.toolsEl.hidden = false;
  }

  function carry() {
    if (answered || remaining(round) === 0) return;
    states.set(item.id, state);
    carried.add(item.id);
    round = defer(round, 2);
    station.freeze();
    showItem();
    say(`You’re carrying it. It comes back soon. ${HINT}`);
  }

  function choose(binId, gaveUp = false) {
    if (answered || !binId || isDone(round)) return;
    answered = true;
    station.freeze();
    const ms = Math.round(performance.now() - shownAt);
    const r = { ...scorePrep(item, state, binId, { gaveUp, actionsUsed: used.get(item.id) ?? 0 }), ms };
    round = record(round, r).round;
    emit('item_result', { mode: MODE, level, itemId: r.itemId, correct: r.correct, bin: binId, ms, outcome: r.outcome });
    markBins(r, binId);
    showFeedback(r);
  }

  function markBins(r, binId) {
    for (const b of binEls) {
      const id = b.dataset.bin;
      b.disabled = true;
      b.classList.toggle('is-correct', id === r.correctBin);
      b.classList.toggle('is-chosen', id === binId);
      b.classList.toggle('is-dim', id !== r.correctBin && id !== binId);
      if (id === r.correctBin) b.setAttribute('aria-label', `${b.textContent} (right bin)`);
      if (r.splash && id === binId) b.append(el('span', { class: 'splash', 'aria-hidden': 'true', html: splashSvg() }));
    }
  }

  function showFeedback(r) {
    const heading = prepHeading(r.outcome, binLabel(r.correctBin));
    let extra = '';
    if (r.splash) extra = contaminationText(binLabel(r.chosenBin));
    else if (r.outcome === 'gave-up') extra = cantEmptyLeaf?.note ?? '';
    const prep = r.correct ? '' : nextTimeSentence(r.pending);
    fbTitle.textContent = `${r.correct ? '✓' : '↻'} ${heading}`;
    fbReason.textContent = r.reason;
    fbExtra.textContent = extra;
    fbExtra.hidden = !extra;
    fbPrep.textContent = prep;
    fbPrep.hidden = !prep;
    feedback.className = `feedback ${r.correct ? 'is-good' : 'is-try'}`;
    resultArt.innerHTML = drawPrepItem(item, state).svg;
    resultArt.hidden = false;
    station.rootEl.hidden = true;
    station.toolsEl.hidden = true;
    cantPanel.hidden = true;
    sayEl.hidden = true;
    feedback.hidden = false;
    scoreEl.textContent = `${score(round)} pts`;
    nextBtn.textContent = round.index + 1 >= round.items.length ? 'See results' : 'Next';
    announce(`${heading} ${r.reason} ${extra} ${prep}`);
    nextBtn.focus({ preventScroll: true });
  }

  function goNext() {
    round = next(round);
    if (!isDone(round)) return showItem();
    const summary = summarize(round);
    station.destroy();
    emit('level_end', {
      mode: MODE, level, practice, correct: summary.correct, total: summary.total,
      accuracy: summary.accuracy, score: summary.score,
    });
    onFinish(summary);
  }

  function exit() {
    station.destroy();
    onExit();
  }

  return { stop: station.destroy };
}
