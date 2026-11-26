// Player-facing copy built from data. No DOM. Keep it short and friendly.
// These phrases describe *how* to do an action; which actions an item needs
// always comes from items.json.

const ACTION_PHRASES = {
  pour: 'pour it out',
  scrape: 'scrape out the food',
  rinse: 'give it a quick rinse',
  lid: 'put the lid on',
  separate: 'separate the parts',
  tape: 'tape the ends',
  flip: 'check the label',
};

const CHEERS = ['Right bin!', 'Nice sorting!', 'Spot on!', 'You got it!'];

export function actionPhrase(action) {
  return ACTION_PHRASES[action] ?? action;
}

/** "Before binning: pour it out, put the lid on." or '' if nothing to do. */
export function prepSentence(steps = []) {
  if (!steps.length) return '';
  return `Before binning: ${steps.map(actionPhrase).join(', ')}.`;
}

/** Heading for a result. `n` picks a cheer so they vary without randomness. */
export function resultHeading(correct, correctBinLabel, n = 0) {
  if (correct) return CHEERS[n % CHEERS.length];
  return `Good try. The answer is ${correctBinLabel}.`;
}

export function summaryHeading(accuracy) {
  if (accuracy >= 0.9) return 'Excellent sorting!';
  if (accuracy >= 0.7) return 'Great work!';
  return 'Good practice!';
}

export function percent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}
