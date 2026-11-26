// One play-through of a level (or a practice set). No DOM.
// Rounds are plain objects; every function returns a new round.
import { scoreSort, accuracy, totalScore } from './scoring.js';

export function itemsForLevel(items, level) {
  return items.filter((it) => it.level === level);
}

export function shuffled(list, rng = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Pass rng: null to keep the given order. */
export function createRound(items, { level = null, practice = false, rng = Math.random } = {}) {
  return {
    level,
    practice,
    items: rng === null ? [...items] : shuffled(items, rng),
    index: 0,
    results: [],
  };
}

export function currentItem(round) {
  return round.items[round.index] ?? null;
}

export function isDone(round) {
  return round.index >= round.items.length;
}

export function isAnswered(round) {
  return round.results.length > round.index;
}

/**
 * Record a scored result ({ itemId, correct, points, ... }) for the current item.
 * Recording twice keeps the first result.
 */
export function record(round, result) {
  if (!currentItem(round)) throw new Error('No current item to answer.');
  if (isAnswered(round)) return { round, result: round.results[round.index] };
  return { round: { ...round, results: [...round.results, result] }, result };
}

/** Quick Sort: score a bin choice for the current item and record it. */
export function answer(round, binId, ms = 0) {
  const item = currentItem(round);
  if (!item) throw new Error('No current item to answer.');
  return record(round, { ...scoreSort(item, binId), ms });
}

/** How many items come after the current one. */
export function remaining(round) {
  return Math.max(0, round.items.length - round.index - 1);
}

/**
 * "Carry it" (SPEC.md 4.2): move the current, unanswered item `by` places
 * later, so it comes back after that many other items (or last, if fewer remain).
 */
export function defer(round, by = 2) {
  if (isAnswered(round) || !currentItem(round)) return round;
  const items = [...round.items];
  const [item] = items.splice(round.index, 1);
  items.splice(Math.min(round.index + by, items.length), 0, item);
  return { ...round, items };
}

export function next(round) {
  if (!isAnswered(round)) return round;
  return { ...round, index: round.index + 1 };
}

export function score(round) {
  return totalScore(round.results);
}

export function summarize(round) {
  const missedIds = new Set(round.results.filter((r) => !r.correct).map((r) => r.itemId));
  return {
    level: round.level,
    practice: round.practice,
    total: round.results.length,
    correct: round.results.filter((r) => r.correct).length,
    accuracy: accuracy(round.results),
    score: totalScore(round.results),
    missed: round.items.filter((it) => missedIds.has(it.id)),
  };
}
