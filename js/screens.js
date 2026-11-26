// Menu screens: home, level picker, end-of-level summary, load error.
import { el, mount } from './dom.js';
import { percent, summaryHeading } from './text.js';

const MODES = [
  { id: 'quick-sort', name: 'Quick Sort', blurb: 'Pick the right bin for each item.', ready: true },
  { id: 'prep-sort', name: 'Prep & Sort', blurb: 'Pour, scrape and put lids on, then sort.', ready: false },
  { id: 'ask-questions', name: 'Ask the Questions', blurb: 'Learn the questions that sort anything.', ready: false },
];

export function renderHome(root, { onMode }) {
  mount(root, el('div', { class: 'screen menu' },
    el('header', { class: 'hero' },
      el('h1', { class: 'hero-title', tabindex: '-1', 'data-autofocus': true }, 'SortRight'),
      el('p', { class: 'hero-sub' }, 'Practise sorting household waste the Toronto way.')),
    el('ul', { class: 'card-list', role: 'list' }, MODES.map((m) => el('li', {},
      el('button', {
        class: 'card', type: 'button', disabled: !m.ready,
        onclick: m.ready ? () => onMode(m.id) : null,
      },
      el('span', { class: 'card-title' }, m.name),
      el('span', { class: 'card-sub' }, m.ready ? m.blurb : `${m.blurb} Coming soon.`)))))));
}

export function renderLevels(root, { levels, onPick, onBack }) {
  mount(root, el('div', { class: 'screen menu' },
    el('header', { class: 'topbar' },
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: onBack }, '‹ Home'),
      el('h1', { class: 'topbar-title', tabindex: '-1', 'data-autofocus': true }, 'Quick Sort: choose a level')),
    el('ul', { class: 'card-list', role: 'list' }, levels.map((l) => el('li', {},
      el('button', {
        class: 'card', type: 'button', disabled: l.count === 0,
        onclick: l.count ? () => onPick(l.level) : null,
      },
      el('span', { class: 'card-kicker' }, `Level ${l.level}`),
      el('span', { class: 'card-title' }, l.name),
      el('span', { class: 'card-sub' },
        `${l.count} items`, l.best != null ? ` · Best ${percent(l.best)}` : '')))))));
}

export function renderSummary(root, { summary, title, binLabel, onPractice, onReplay, onLevels }) {
  const { correct, total, accuracy, score, missed, practice } = summary;
  mount(root, el('div', { class: 'screen menu' },
    el('header', { class: 'hero' },
      el('p', { class: 'card-kicker' }, practice ? `${title}: practice` : title),
      el('h1', { class: 'hero-title', tabindex: '-1', 'data-autofocus': true }, summaryHeading(accuracy)),
      el('p', { class: 'hero-sub' }, `You sorted ${correct} of ${total} right (${percent(accuracy)}). Score: ${score}.`)),
    missed.length
      ? el('section', { class: 'missed' },
        el('h2', {}, 'Worth another look'),
        el('ul', { role: 'list' }, missed.map((it) => el('li', { class: 'missed-item' },
          el('strong', {}, it.name), el('span', { class: 'missed-bin' }, ` → ${binLabel(it.bin)}`),
          el('p', {}, it.reason)))))
      : el('p', { class: 'all-right' }, 'Every item in the right bin. Nice!'),
    el('div', { class: 'actions' },
      missed.length ? el('button', { class: 'btn btn-primary', type: 'button', onclick: onPractice }, 'Practice missed items') : null,
      el('button', { class: missed.length ? 'btn' : 'btn btn-primary', type: 'button', onclick: onReplay }, 'Play level again'),
      el('button', { class: 'btn btn-ghost', type: 'button', onclick: onLevels }, 'Choose another level'))));
}

export function renderError(root, { onRetry }) {
  mount(root, el('div', { class: 'screen menu' },
    el('header', { class: 'hero' },
      el('h1', { class: 'hero-title', tabindex: '-1', 'data-autofocus': true }, 'Couldn’t load the items'),
      el('p', { class: 'hero-sub' }, 'Check your connection and try again.')),
    el('div', { class: 'actions' },
      el('button', { class: 'btn btn-primary', type: 'button', onclick: onRetry }, 'Try again'))));
}
