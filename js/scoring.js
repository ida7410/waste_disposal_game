// Scoring rules (SPEC.md 6). No DOM. The right answer always comes from the item data.

export const POINTS = Object.freeze({ correct: 10, partial: 5, contamination: -5 });

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
