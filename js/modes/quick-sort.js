// Quick Sort (SPEC.md 4.1): pick the bin. Bins are buttons, so tap, click
// and keyboard all go through choose(). No dragging here (that's Prep & Sort).
import { el, mount, announce } from '../dom.js';
import { createRound, currentItem, answer, next, isDone, summarize, score } from '../round.js';
import { prepSentence, resultHeading } from '../text.js';
import { emit } from '../events.js';
import { binIconSvg } from '../art/bins.js';
import { drawWithLabelShowing } from '../art/prep-art.js';

const MODE = 'quick-sort';
const HINT = 'Which bin does it go in? Tap a bin.';

export function startQuickSort(root, { bins, items, level, title, practice = false, onExit, onFinish }) {
  let round = createRound(items, { level, practice });
  let shownAt = 0;
  let answered = false;
  const binLabel = (id) => bins.find((b) => b.id === id)?.label ?? id;

  const progressEl = el('span', { class: 'pill' });
  const scoreEl = el('span', { class: 'pill' });
  const itemEl = el('div', { class: 'item', 'aria-hidden': 'true' });
  const nameEl = el('p', { class: 'item-name' });
  const hintEl = el('p', { class: 'hint' });
  const fbTitle = el('h2', { class: 'feedback-title' });
  const fbReason = el('p', { class: 'feedback-reason' });
  const fbPrep = el('p', { class: 'feedback-prep' });
  const nextBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: goNext }, 'Next');
  const feedback = el('div', { class: 'feedback', hidden: true }, fbTitle, fbReason, fbPrep, nextBtn);

  const binEls = bins.map((b) => el('button', {
    class: 'bin', type: 'button', 'data-bin': b.id, style: { '--bin-color': b.color ?? '#5f6b7a' },
    onclick: () => choose(b.id),
  }, el('span', { class: 'bin-icon', html: binIconSvg(b.id) }), el('span', { class: 'bin-label' }, b.label)));

  mount(root, el('div', { class: 'screen play' },
    el('header', { class: 'topbar' },
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit }, '‹ Levels'),
      el('h1', { class: 'topbar-title', tabindex: '-1', 'data-autofocus': true }, practice ? `${title}: practice` : title),
      progressEl, scoreEl),
    el('section', { class: 'stage', 'aria-label': 'Item to sort' }, itemEl, nameEl, hintEl, feedback),
    el('nav', { class: 'bins', 'aria-label': 'Bins', style: { '--bin-count': String(bins.length) } }, binEls)));

  emit('level_start', { mode: MODE, level, practice, count: round.items.length });
  showItem();

  function showItem() {
    const item = currentItem(round);
    answered = false;
    itemEl.innerHTML = drawWithLabelShowing(item);
    nameEl.textContent = item.name;
    hintEl.textContent = HINT;
    hintEl.hidden = false;
    feedback.hidden = true;
    root.querySelector('.stage').classList.remove('has-feedback');
    for (const b of binEls) {
      b.classList.remove('is-correct', 'is-chosen', 'is-dim');
      b.disabled = false;
      b.setAttribute('aria-label', b.textContent);
    }
    progressEl.textContent = `${round.index + 1} / ${round.items.length}`;
    scoreEl.textContent = `${score(round)} pts`;
    announce(`Item ${round.index + 1} of ${round.items.length}: ${item.name}. Choose a bin.`);
    shownAt = performance.now();
  }

  function choose(binId) {
    if (answered || isDone(round)) return;
    answered = true;
    const ms = Math.round(performance.now() - shownAt);
    const out = answer(round, binId, ms);
    round = out.round;
    const r = out.result;
    emit('item_result', { mode: MODE, level, itemId: r.itemId, correct: r.correct, bin: binId, ms });

    for (const b of binEls) {
      const id = b.dataset.bin;
      b.disabled = true;
      b.classList.toggle('is-correct', id === r.correctBin);
      b.classList.toggle('is-chosen', id === binId);
      b.classList.toggle('is-dim', id !== r.correctBin && id !== binId);
      if (id === r.correctBin) b.setAttribute('aria-label', `${b.textContent} (right bin)`);
    }
    const heading = resultHeading(r.correct, binLabel(r.correctBin), round.index);
    const prep = prepSentence(r.steps);
    fbTitle.textContent = `${r.correct ? '✓' : '↻'} ${heading}`;
    fbReason.textContent = r.reason;
    fbPrep.textContent = prep;
    fbPrep.hidden = !prep;
    feedback.className = `feedback ${r.correct ? 'is-good' : 'is-try'}`;
    feedback.hidden = false;
    hintEl.hidden = true;
    root.querySelector('.stage').classList.add('has-feedback');
    scoreEl.textContent = `${score(round)} pts`;
    nextBtn.textContent = round.index + 1 >= round.items.length ? 'See results' : 'Next';
    announce(`${heading} ${r.reason} ${prep}`);
    nextBtn.focus({ preventScroll: true });
  }

  function goNext() {
    round = next(round);
    if (!isDone(round)) return showItem();
    const summary = summarize(round);
    emit('level_end', {
      mode: MODE, level, practice, correct: summary.correct, total: summary.total,
      accuracy: summary.accuracy, score: summary.score,
    });
    onFinish(summary);
  }

  function exit() {
    onExit();
  }

  // All listeners live on this screen's own elements, so there is nothing to tear down.
  return { stop() {} };
}
