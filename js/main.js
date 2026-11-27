// Boot and routing between screens.
import { loadGameData, resolveDataUrl } from './data.js';
import { itemsForLevel } from './round.js';
import { bestAccuracy, recordLevel } from './progress.js';
import { MODES, renderHome, renderLevels, renderSummary, renderError } from './screens.js';
import { startQuickSort } from './modes/quick-sort.js';
import { startPrepSort } from './modes/prep-sort.js';

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

function showLevels(mode) {
  leaveMode();
  const levels = data.levels.map((l) => ({
    level: l.level,
    name: l.name,
    count: itemsForLevel(data.items, l.level).length,
    best: bestAccuracy(mode, l.level),
  }));
  const modeName = MODES.find((m) => m.id === mode)?.name ?? '';
  renderLevels(root, { modeName, levels, onPick: (level) => play(mode, level), onBack: showHome });
}

function play(mode, level, items = itemsForLevel(data.items, level), practice = false) {
  leaveMode();
  const title = `Level ${level}: ${levelName(level)}`;
  const options = {
    items,
    level,
    title,
    practice,
    onExit: () => showLevels(mode),
    onFinish: (summary) => {
      active = null;
      if (!practice) recordLevel(mode, level, summary.accuracy);
      renderSummary(root, {
        summary,
        title,
        binLabel,
        onPractice: () => play(mode, level, summary.missed, true),
        onReplay: () => play(mode, level),
        onLevels: () => showLevels(mode),
      });
    },
  };
  active = mode === 'prep-sort'
    ? startPrepSort(root, { ...options, data, tools: toolsForLevel(level) })
    : startQuickSort(root, { ...options, bins: data.bins });
}

boot();
