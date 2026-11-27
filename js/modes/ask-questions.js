// Ask the Questions (SPEC.md 4.3): answer the flow's yes/no questions in
// order. The game stops at the item's exit step and shows where it goes and
// why; a wrong answer shows which question was missed. Y / N keys work too.
import { el, mount, announce } from '../dom.js';
import { createRound, currentItem, record, next, isDone, summarize, score } from '../round.js';
import { startFlow, answerFlow, currentEntry, destinationOf } from '../flow.js';
import { scoreQuestions } from '../scoring.js';
import { askHeading, missedQuestionText, yesNo } from '../text.js';
import { emit } from '../events.js';
import { binIconSvg } from '../art/bins.js';
import { drawPrepItem } from '../art/prep-art.js';
import { createItemState } from '../state.js';

const MODE = 'ask-questions';

export function startAskQuestions(root, { data, items, level, title, practice = false, onExit, onFinish }) {
  const binOf = (id) => data.bins.find((b) => b.id === id);
  let round = createRound(items, { level, practice });
  let fs = null;
  let shownAt = 0;

  const progressEl = el('span', { class: 'pill' });
  const scoreEl = el('span', { class: 'pill' });
  const artEl = el('div', { class: 'item ask-art', 'aria-hidden': 'true' });
  const nameEl = el('p', { class: 'item-name' });
  const trailEl = el('ol', { class: 'trail', 'aria-label': 'Your answers' });
  const qNum = el('p', { class: 'card-kicker' });
  const qText = el('h2', { class: 'question-text', id: 'ask-q' });
  const qNote = el('p', { class: 'question-note' });
  const yesBtn = el('button', { class: 'btn btn-primary answer', type: 'button', onclick: () => respond('yes') }, 'Yes');
  const noBtn = el('button', { class: 'btn btn-primary answer', type: 'button', onclick: () => respond('no') }, 'No');
  const qCard = el('section', { class: 'question', 'aria-labelledby': 'ask-q' },
    qNum, qText, qNote, el('div', { class: 'answers' }, yesBtn, noBtn));

  const fbTitle = el('h2', { class: 'feedback-title' });
  const fbBin = el('div', { class: 'dest' });
  const fbMissed = el('p', { class: 'feedback-extra' });
  const fbReason = el('p', { class: 'feedback-reason' });
  const fbNote = el('p', { class: 'feedback-prep' });
  const nextBtn = el('button', { class: 'btn btn-primary', type: 'button', onclick: goNext }, 'Next');
  const feedback = el('div', { class: 'feedback', hidden: true }, fbTitle, fbBin, fbMissed, fbReason, fbNote, nextBtn);

  mount(root, el('div', { class: 'screen play ask' },
    el('header', { class: 'topbar' },
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: exit }, '‹ Levels'),
      el('h1', { class: 'topbar-title', tabindex: '-1', 'data-autofocus': true }, practice ? `${title}: practice` : title),
      progressEl, scoreEl),
    el('section', { class: 'stage ask-stage', 'aria-label': 'Item' }, el('div', { class: 'ask-item' }, artEl, nameEl), trailEl, qCard, feedback)));

  const onKey = (e) => {
    if (e.target.closest?.('input, textarea') || !fs || fs.done) return;
    const k = e.key.toLowerCase();
    if (k === 'y') respond('yes');
    if (k === 'n') respond('no');
  };
  document.addEventListener('keydown', onKey);

  emit('level_start', { mode: MODE, level, practice, count: round.items.length });
  showItem();

  function showItem() {
    const item = currentItem(round);
    fs = startFlow(data.flow, item);
    artEl.innerHTML = drawPrepItem(item, createItemState(item)).svg;
    nameEl.textContent = item.name;
    trailEl.replaceChildren();
    feedback.hidden = true;
    qCard.hidden = false;
    progressEl.textContent = `${round.index + 1} / ${round.items.length}`;
    scoreEl.textContent = `${score(round)} pts`;
    shownAt = performance.now();
    showQuestion(`Item ${round.index + 1} of ${round.items.length}: ${item.name}.`);
  }

  function showQuestion(prefix = '') {
    const { flowStep } = currentEntry(fs);
    qNum.textContent = `Question ${flowStep.step}`;
    qText.textContent = flowStep.question;
    qNote.textContent = flowStep.exception ? `Exception: ${flowStep.exception}` : '';
    qNote.hidden = !flowStep.exception;
    announce(`${prefix} Question ${flowStep.step}: ${flowStep.question}`);
  }

  function respond(answer) {
    if (!fs || fs.done) return;
    const entry = currentEntry(fs);
    fs = answerFlow(fs, answer);
    const last = fs.answers.at(-1);
    trailEl.append(el('li', { class: last.ok ? 'is-ok' : 'is-miss' },
      el('span', { class: 'trail-q' }, `${entry.flowStep.step}. ${entry.flowStep.question}`),
      el('strong', {}, ` ${yesNo(answer)} ${last.ok ? '✓' : '↻'}`),
      last.prep && entry.flowStep.note ? el('span', { class: 'trail-note' }, entry.flowStep.note) : null));
    if (fs.done) finish();
    else showQuestion(last.prep ? entry.flowStep.note : '');
  }

  function finish() {
    const item = fs.item;
    const ms = Math.round(performance.now() - shownAt);
    const r = { ...scoreQuestions(fs), ms };
    round = record(round, r).round;
    const dest = destinationOf(fs);
    emit('item_result', { mode: MODE, level, itemId: item.id, correct: r.correct, bin: r.correct ? dest : null, ms, missedStep: r.missedStep });

    const exit = fs.path.at(-1).flowStep;
    const bin = binOf(item.bin);
    const heading = askHeading(r.correct, bin?.label ?? item.bin);
    const missed = fs.missed ? missedQuestionText(fs.missed.flowStep.step, fs.missed.flowStep.question, fs.missed.expected) : '';
    const notes = [item.exception && exit.exception, exit.note].filter(Boolean).join(' ');

    fbTitle.textContent = `${r.correct ? '✓' : '↻'} ${heading}`;
    fbBin.replaceChildren(
      el('span', { class: 'bin-icon', style: { '--bin-color': bin?.color ?? '#5f6b7a' }, html: binIconSvg(item.bin) }),
      el('span', { class: 'dest-label' }, bin?.label ?? item.bin));
    fbMissed.textContent = missed;
    fbMissed.hidden = !missed;
    fbReason.textContent = item.reason;
    fbNote.textContent = notes;
    fbNote.hidden = !notes;
    feedback.className = `feedback ${r.correct ? 'is-good' : 'is-try'}`;
    feedback.hidden = false;
    qCard.hidden = true;
    scoreEl.textContent = `${score(round)} pts`;
    nextBtn.textContent = round.index + 1 >= round.items.length ? 'See results' : 'Next';
    announce(`${heading} ${missed} ${item.reason} ${notes}`);
    nextBtn.focus({ preventScroll: true });
  }

  function goNext() {
    round = next(round);
    if (!isDone(round)) return showItem();
    const summary = summarize(round);
    stop();
    emit('level_end', {
      mode: MODE, level, practice, correct: summary.correct, total: summary.total,
      accuracy: summary.accuracy, score: summary.score,
    });
    onFinish(summary);
  }

  function stop() {
    document.removeEventListener('keydown', onKey);
    fs = null;
  }

  function exit() {
    stop();
    onExit();
  }

  return { stop };
}
