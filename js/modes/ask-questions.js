// Ask the Questions (SPEC.md 4.3): walk the question tree from flowStart.
// Yes/No for questions, one button per option for the "What is it mostly?"
// choice, and the two-part "Is it empty?" prep node. Stops at a leaf, or at
// the first answer that leaves every fair route. Keys: Y / N, or 1-4.
import { el, mount, announce } from '../dom.js';
import { createRound, currentItem, record, next, isDone, summarize, score } from '../round.js';
import { createFlow, nodeById, startWalk, answerWalk, currentPrompt, destinationOf } from '../flow.js';
import { scoreQuestions } from '../scoring.js';
import { askHeading, missedQuestionText, emptyFact, prepDoneText } from '../text.js';
import { emit } from '../events.js';
import { binIconSvg } from '../art/bins.js';
import { drawWithLabelShowing } from '../art/prep-art.js';
import { createItemState } from '../state.js';

const MODE = 'ask-questions';

export function startAskQuestions(root, { data, items, level, title, practice = false, onExit, onFinish }) {
  const flow = createFlow(data);
  const binOf = (id) => data.bins.find((b) => b.id === id);
  const scrapsLabel = binOf(flow.prepNode?.scrapsTo)?.label;
  let round = createRound(items, { level, practice });
  let walk = null;
  let prompt = null;
  let shownAt = 0;

  const progressEl = el('span', { class: 'pill' });
  const scoreEl = el('span', { class: 'pill' });
  const artEl = el('div', { class: 'item ask-art', 'aria-hidden': 'true' });
  const nameEl = el('p', { class: 'item-name' });
  const trailEl = el('ol', { class: 'trail', 'aria-label': 'Your answers' });
  const qNum = el('p', { class: 'card-kicker' });
  const qText = el('h2', { class: 'question-text', id: 'ask-q' });
  const qNote = el('p', { class: 'question-note' });
  const answersEl = el('div', { class: 'answers' });
  const qCard = el('section', { class: 'question', 'aria-labelledby': 'ask-q' }, qNum, qText, qNote, answersEl);

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
    if (!prompt || e.target.closest?.('input, textarea')) return;
    const k = e.key.toLowerCase();
    const byKey = prompt.kind === 'choice'
      ? prompt.options[Number(k) - 1]
      : prompt.options.find((o) => (k === 'y' && o.answer === 'yes') || (k === 'n' && o.answer === 'no'));
    if (byKey) respond(byKey.answer);
  };
  document.addEventListener('keydown', onKey);

  emit('level_start', { mode: MODE, level, practice, count: round.items.length });
  showItem();

  function showItem() {
    const item = currentItem(round);
    walk = startWalk(flow, item);
    artEl.innerHTML = drawWithLabelShowing(item);
    nameEl.textContent = item.name;
    trailEl.replaceChildren();
    feedback.hidden = true;
    qCard.hidden = false;
    progressEl.textContent = `${round.index + 1} / ${round.items.length}`;
    scoreEl.textContent = `${score(round)} pts`;
    shownAt = performance.now();
    showPrompt(`Item ${round.index + 1} of ${round.items.length}: ${item.name}.`);
  }

  function showPrompt(prefix = '') {
    prompt = currentPrompt(flow, walk);
    // Numbered by how many have been asked, never "of N": that would give the route away.
    qNum.textContent = `Question ${walk.answers.length + 1}`;
    qText.textContent = prompt.text;
    qNote.textContent = prompt.examples ? `For example: ${prompt.examples}` : '';
    qNote.hidden = !prompt.examples;
    answersEl.className = `answers${prompt.kind === 'choice' ? ' is-choice' : ''}`;
    answersEl.replaceChildren(...prompt.options.map((o, i) => el('button', {
      class: 'btn btn-primary answer', type: 'button', 'data-answer': o.answer, onclick: () => respond(o.answer),
    }, prompt.kind === 'choice' ? el('span', { class: 'answer-key', 'aria-hidden': 'true' }, `${i + 1}`) : null,
    el('span', { class: 'answer-label' }, o.label),
    o.examples ? el('span', { class: 'answer-examples' }, o.examples) : null)));
    announce(`${prefix} ${prompt.text}${prompt.examples ? ` For example: ${prompt.examples}.` : ''}`);
  }

  function respond(answer) {
    if (!prompt || walk.done) return;
    const asked = prompt;
    walk = answerWalk(flow, walk, answer);
    const last = walk.answers.at(-1);
    const label = asked.options.find((o) => o.answer === answer)?.label ?? answer;
    const note = last.prep ? prepDoneText(createItemState(walk.item), { liquidTo: flow.prepNode?.liquidTo, scrapsLabel }) : '';
    trailEl.append(el('li', { class: last.ok ? 'is-ok' : 'is-miss' },
      el('span', { class: 'trail-q' }, asked.text),
      el('strong', {}, ` ${label} ${last.ok ? '✓' : '↻'}`),
      note ? el('span', { class: 'trail-note' }, note) : null));
    if (walk.done) finish(asked);
    else showPrompt(note);
  }

  function finish(lastPrompt) {
    prompt = null;
    const item = walk.item;
    const ms = Math.round(performance.now() - shownAt);
    const r = { ...scoreQuestions(walk), ms };
    round = record(round, r).round;
    const destId = destinationOf(walk);
    emit('item_result', { mode: MODE, level, itemId: item.id, correct: r.correct, bin: walk.outcome === 'missed' ? null : destId, ms, outcome: r.outcome, missedNode: r.missedNode });

    const bin = binOf(destId);
    const heading = askHeading(walk.outcome, bin?.label ?? destId);
    const missed = walk.missed ? missedText(walk.missed, lastPrompt) : '';
    // The reached leaf's note, except for exceptions (that note is about the usual rule);
    // after a miss, the note on the leaf the item should have reached.
    const noteLeaf = walk.outcome === 'missed' ? nodeById(flow, item.exitNode) : walk.outcome === 'exception' ? null : walk.leaf;
    const note = noteLeaf?.note ?? '';

    fbTitle.textContent = `${r.correct ? '✓' : '↻'} ${heading}`;
    fbBin.replaceChildren(
      el('span', { class: 'bin-icon', style: { '--bin-color': bin?.color ?? '#5f6b7a' }, html: binIconSvg(destId) }),
      el('span', { class: 'dest-label' }, bin?.label ?? destId));
    fbMissed.textContent = missed;
    fbMissed.hidden = !missed;
    fbReason.textContent = item.reason;
    fbNote.textContent = note;
    fbNote.hidden = !note;
    feedback.className = `feedback ${r.correct ? 'is-good' : 'is-try'}`;
    feedback.hidden = false;
    qCard.hidden = true;
    scoreEl.textContent = `${score(round)} pts`;
    nextBtn.textContent = round.index + 1 >= round.items.length ? 'See results' : 'Next';
    announce(`${heading} ${missed} ${item.reason} ${note}`);
    nextBtn.focus({ preventScroll: true });
  }

  // "Is it empty?" misses say what the item holds; others name the fair answer(s).
  function missedText(m, lastPrompt) {
    if (m.stage === 'empty') return `${missedQuestionText(lastPrompt.text, [m.expected[0] === 'yes' ? 'Yes' : 'No'])} ${emptyFact(createItemState(walk.item))}`;
    const labels = m.expected.map((a) => lastPrompt.options.find((o) => o.answer === a)?.label ?? a);
    return missedQuestionText(lastPrompt.text, labels);
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
    prompt = null;
  }

  function exit() {
    stop();
    onExit();
  }

  return { stop };
}
