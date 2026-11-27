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

// ---- Prep & Sort ----

const TOOL_LABELS = {
  pour: 'Pour out',
  scrape: 'Scrape',
  rinse: 'Rinse',
  lid: 'Lid on',
  separate: 'Separate',
  tape: 'Tape ends',
  flip: 'Read label',
};

// What the player sees after doing an action (fallback actions use these as their explanation).
const ACTION_DONE = {
  pour: 'Poured out. Empty containers keep paper in the bin clean.',
  scrape: 'Scraped out.',
  rinse: 'Rinsed. A quick rinse is enough.',
  lid: 'Lid on.',
  separate: 'Separated. Different parts can go to different bins.',
  tape: 'Ends taped. Taped batteries can’t spark and start a fire.',
  flip: 'Label checked. Words like “compostable” and hazard symbols change where things go.',
};

const NOTHING_TO_DO = {
  pour: 'Nothing to pour out.',
  scrape: 'Nothing to scrape out.',
  rinse: 'It’s already clean.',
  lid: 'No lid to put on.',
  separate: 'Nothing to separate.',
  tape: 'Nothing to tape.',
  flip: 'You’ve already read the label.',
};

const STATE_WORDS = {
  liquid: 'Has liquid',
  food: 'Food inside',
  dirty: 'Dirty',
  terminals: 'Ends not taped',
};

export function toolLabel(action) {
  return TOOL_LABELS[action] ?? action;
}

/** scrapsLabel: label of the bin scraps go to (from data), if known. */
export function actionDoneText(action, { scrapsLabel } = {}) {
  const text = ACTION_DONE[action] ?? 'Done.';
  return action === 'scrape' && scrapsLabel ? `${text} The scraps went in the ${scrapsLabel}.` : text;
}

// ---- Ask the Questions ----

export function askHeading(correct, destinationLabel) {
  return correct ? `Right! It goes to: ${destinationLabel}.` : `Good try. It goes to: ${destinationLabel}.`;
}

export function missedQuestionText(stepNumber, question, expected) {
  return `Question ${stepNumber} was the tricky one: “${question}” The answer is ${expected === 'yes' ? 'Yes' : 'No'}.`;
}

export function yesNo(answer) {
  return answer === 'yes' ? 'Yes' : 'No';
}

export function nothingToDoText(action) {
  return NOTHING_TO_DO[action] ?? 'Nothing to do.';
}

/** Short visible chips describing the item's state, e.g. ['Has liquid', 'Lid off']. */
export function stateChips(state) {
  const chips = Object.entries(STATE_WORDS).filter(([k]) => state[k] === true).map(([, v]) => v);
  if (state.lid === false) chips.push('Lid off');
  return chips;
}

const PREP_HEADINGS = {
  correct: 'Right bin, ready to go!',
  partial: 'Right bin! One step was missed.',
  contaminated: 'Splash! It needed emptying first.',
  'gave-up': 'Garbage is OK when you can’t empty it.',
};

export function prepHeading(outcome, correctBinLabel) {
  if (outcome === 'wrong') return `Good try. The answer is ${correctBinLabel}.`;
  return PREP_HEADINGS[outcome] ?? '';
}

/** Why leftovers matter, naming the bin that got splashed. */
export function contaminationText(binLabel) {
  return `Leftovers in the ${binLabel} soak paper and cardboard, and can spoil a whole load.`;
}

export function nextTimeSentence(pending = []) {
  if (!pending.length) return '';
  return `Next time: ${pending.map(actionPhrase).join(', ')}.`;
}

export function summaryHeading(accuracy) {
  if (accuracy >= 0.9) return 'Excellent sorting!';
  if (accuracy >= 0.7) return 'Great work!';
  return 'Good practice!';
}

export function percent(fraction) {
  return `${Math.round(fraction * 100)}%`;
}
