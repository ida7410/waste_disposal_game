// Boot and routing between screens.
import { loadGameData, resolveDataUrl } from './data.js';
import { itemsForLevel } from './round.js';
import { bestAccuracy, recordLevel } from './progress.js';
import { renderHome, renderLevels, renderSummary, renderError } from './screens.js';
import { startQuickSort } from './modes/quick-sort.js';

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
  renderHome(root, { onMode: (id) => { if (id === 'quick-sort') showLevels(); } });
}

function levelName(level) {
  return data.levels.find((l) => l.level === level)?.name ?? `Level ${level}`;
}

function binLabel(id) {
  return data.bins.find((b) => b.id === id)?.label ?? id;
}

function showLevels() {
  leaveMode();
  const levels = data.levels.map((l) => ({
    level: l.level,
    name: l.name,
    count: itemsForLevel(data.items, l.level).length,
    best: bestAccuracy(l.level),
  }));
  renderLevels(root, { levels, onPick: (level) => play(level), onBack: showHome });
}

function play(level, items = itemsForLevel(data.items, level), practice = false) {
  leaveMode();
  const title = `Level ${level}: ${levelName(level)}`;
  active = startQuickSort(root, {
    bins: data.bins,
    items,
    level,
    title,
    practice,
    onExit: showLevels,
    onFinish: (summary) => {
      active = null;
      if (!practice) recordLevel(level, summary.accuracy);
      renderSummary(root, {
        summary,
        title,
        binLabel,
        onPractice: () => play(level, summary.missed, true),
        onReplay: () => play(level),
        onLevels: showLevels,
      });
    },
  });
}

boot();
