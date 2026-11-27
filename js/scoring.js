// Scoring rules (SPEC.md 6). No DOM. The right answer always comes from the item data.
import { pendingSteps, contaminants } from './state.js';

// missedStep: right bin, but a prep step wasn't done. The item loses its full mark.
export const POINTS = Object.freeze({ correct: 10, partial: 5, missedStep: 0, contamination: -5 });
// Small time bonus in Prep & Sort for sending a no-prep item straight in.
export const STRAIGHT_IN_BONUS = 2;

/**
 * Score a Prep & Sort answer. Bins check state, not just the item:
 * - gaveUp ("Can't empty it now" -> the fallback bin): partial
 * - wrong bin: contamination
 * - right bin but liquid/food/dirt left: no marks + splash
 * - right bin, other steps left (lid off, ends not taped, label unread): no marks
 * - right bin, ready: correct (+ bonus if it needed no prep and none was done)
 */
export function scorePrep(item, state, binId, { gaveUp = false, actionsUsed = 0 } = {}) {
  const pending = pendingSteps(item, state);
  const dirt = contaminants(state);
  const base = {
    itemId: item.id,
    chosenBin: binId,
    correctBin: item.bin,
    reason: item.reason,
    steps: Array.isArray(item.steps) ? item.steps : [],
    pending,
    contaminants: dirt,
    splash: false,
    bonus: 0,
    correct: false,
  };
  if (gaveUp) return { ...base, outcome: 'gave-up', points: POINTS.partial };
  if (binId !== item.bin) return { ...base, outcome: 'wrong', points: POINTS.contamination };
  if (dirt.length) return { ...base, outcome: 'contaminated', points: POINTS.missedStep, splash: true };
  if (pending.length) return { ...base, outcome: 'partial', points: POINTS.missedStep };
  const bonus = base.steps.length === 0 && actionsUsed === 0 ? STRAIGHT_IN_BONUS : 0;
  return { ...base, outcome: 'correct', correct: true, points: POINTS.correct + bonus, bonus };
}

/** Score a finished Ask the Questions flow (js/flow.js). */
export function scoreQuestions(fs) {
  const { item } = fs;
  return {
    itemId: item.id,
    correctBin: item.bin,
    correct: fs.correct === true,
    points: fs.correct ? POINTS.correct : POINTS.contamination,
    reason: item.reason,
    missedStep: fs.missed?.flowStep.step ?? null,
    steps: Array.isArray(item.steps) ? item.steps : [],
  };
}

/** Score a Quick Sort answer: bin choice only, no state check. */
export function scoreSort(item, binId) {
  const correct = binId === item.bin;
  return {
    itemId: item.id,
    chosenBin: binId,
    correctBin: item.bin,
    correct,
    points: correct ? POINTS.correct : POINTS.contamination,
    reason: item.reason,
    steps: Array.isArray(item.steps) ? item.steps : [],
  };
}

/** Share of correct results, 0..1 (0 when empty). */
export function accuracy(results) {
  if (!results.length) return 0;
  return results.filter((r) => r.correct).length / results.length;
}

/** Running total that never drops below zero, so a rough start never shows a negative score. */
export function totalScore(results) {
  return results.reduce((sum, r) => Math.max(0, sum + r.points), 0);
}
