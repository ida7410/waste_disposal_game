// Boot and routing between screens.
import { loadGameData, resolveDataUrl } from './data.js';
import { itemsForLevel } from './round.js';
import { bestAccuracy, recordLevel, isUnlocked, UNLOCK_ACCURACY } from './progress.js';
import { MODES, renderHome, renderLevels, renderSummary, renderError } from './screens.js';
import { percent } from './text.js';
import { startQuickSort } from './modes/quick-sort.js';
import { startPrepSort } from './modes/prep-sort.js';
import { startAskQuestions } from './modes/ask-questions.js';

// Every import loaded: tell js/boot-check.js not to show its "couldn't start" screen.
document.documentElement.dataset.booted = 'true';

const root = document.getElementById('app');
let data = null;
let active = null; // running mode, so it can be stopped when we leave

async function boot() {
  root.setAttribute('aria-busy', 'true');
  try {
    data = await loadGameData(resolveDataUrl());
    showHome();
  } catch (e) {
    console.error('SortRight: could not load game data.', e);
    renderError(root, { onRetry: boot });
  } finally {
    root.removeAttribute('aria-busy');
  }
}

function leaveMode() {
  active?.stop();
  active = null;
}

function showHome() {
  leaveMode();
  renderHome(root, { onMode: showLevels });
}

function levelName(level) {
  return data.levels.find((l) => l.level === level)?.name ?? `Level ${level}`;
}

function binLabel(id) {
  return data.bins.find((b) => b.id === id)?.label ?? id;
}

/** Tools for a level: every action any of its items needs, in the data's action order. */
function toolsForLevel(level) {
  const levelItems = itemsForLevel(data.items, level);
  return data.actions.filter((a) => levelItems.some((it) => it.steps.includes(a)));
}

function levelOrder() {
  return data.levels.map((l) => l.level);
}

function showLevels(mode) {
  leaveMode();
  const order = levelOrder();
  const levels = data.levels.map((l, i) => ({
    level: l.level,
    name: l.name,
    count: itemsForLevel(data.items, l.level).length,
    best: bestAccuracy(mode, l.level),
    unlocked: isUnlocked(mode, l.level, order),
    lockHint: i > 0 ? `Get ${percent(UNLOCK_ACCURACY)} on Level ${order[i - 1]} to unlock.` : '',
  }));
  const modeName = MODES.find((m) => m.id === mode)?.name ?? '';
  renderLevels(root, { modeName, levels, onPick: (level) => play(mode, level), onBack: showHome });
}

/** After a level: did it just unlock the next one, or what's still needed? */
function unlockNoteFor(mode, level, wasUnlocked) {
  const order = levelOrder();
  const nextLevel = order[order.indexOf(level) + 1];
  if (nextLevel === undefined) return null;
  if (isUnlocked(mode, nextLevel, order)) {
    return wasUnlocked ? null : { unlocked: true, text: `🔓 Level ${nextLevel}: ${levelName(nextLevel)} is unlocked!` };
  }
  return { unlocked: false, text: `Get ${percent(UNLOCK_ACCURACY)} to unlock Level ${nextLevel}.` };
}

const STARTERS = {
  'quick-sort': (options) => startQuickSort(root, { ...options, bins: data.bins }),
  'prep-sort': (options) => startPrepSort(root, { ...options, data, tools: toolsForLevel(options.level) }),
  'ask-questions': (options) => startAskQuestions(root, { ...options, data }),
};

function play(mode, level, items = itemsForLevel(data.items, level), practice = false) {
  leaveMode();
  const title = `Level ${level}: ${levelName(level)}`;
  const order = levelOrder();
  const nextLevel = order[order.indexOf(level) + 1];
  const options = {
    items,
    level,
    title,
    practice,
    onExit: () => showLevels(mode),
    onFinish: (summary) => {
      active = null;
      const wasUnlocked = nextLevel === undefined || isUnlocked(mode, nextLevel, order);
      if (!practice) recordLevel(mode, level, summary.accuracy);
      renderSummary(root, {
        summary,
        title,
        binLabel,
        unlockNote: practice ? null : unlockNoteFor(mode, level, wasUnlocked),
        onPractice: () => play(mode, level, summary.missed, true),
        onReplay: () => play(mode, level),
        onLevels: () => showLevels(mode),
      });
    },
  };
  active = (STARTERS[mode] ?? STARTERS['quick-sort'])(options);
}

boot();
