// Decision-flow logic for Ask the Questions (SPEC.md 4.3). No DOM.
// Questions, exits and notes all come from data.flow; the expected answer
// for an item is derived from its exitStep and start state, never hard-coded.
import { createItemState, contaminants } from './state.js';

const opposite = (a) => (a === 'yes' ? 'no' : 'yes');

/**
 * The answer that keeps an item on its path at a flow step:
 * - its exit step: the step's exitOn (null for the final "everything else" step)
 * - the prep step ("Is it empty?"): exitOn if the item starts with liquid/food/dirt
 *   (empty it, then continue), otherwise the opposite
 * - any other earlier step: the opposite of exitOn, so it doesn't exit there
 */
export function expectedAnswer(flowStep, item) {
  if (flowStep.step === item.exitStep) return flowStep.exitOn ?? null;
  if (flowStep.action) {
    return contaminants(createItemState(item)).length ? flowStep.exitOn : opposite(flowStep.exitOn);
  }
  return flowStep.exitOn ? opposite(flowStep.exitOn) : null;
}

/** The steps an item goes through, up to and including its exit step. */
export function pathFor(flow, item) {
  return flow
    .filter((f) => f.step <= item.exitStep)
    .map((f) => {
      const expected = expectedAnswer(f, item);
      return {
        flowStep: f,
        expected,
        exits: f.step === item.exitStep,
        prep: Boolean(f.action) && expected === f.exitOn,
      };
    });
}

export function startFlow(flow, item) {
  return skipAutomatic({ item, path: pathFor(flow, item), index: 0, answers: [], done: false, correct: null, missed: null });
}

export function currentEntry(fs) {
  return fs.path[fs.index] ?? null;
}

/**
 * Answer the current question ('yes' | 'no'). A wrong answer ends the flow
 * and records which question was missed; reaching the exit ends it correctly.
 */
export function answerFlow(fs, answer) {
  if (fs.done) return fs;
  const entry = currentEntry(fs);
  const ok = answer === entry.expected;
  const answers = [...fs.answers, { step: entry.flowStep.step, answer, expected: entry.expected, ok, prep: ok && entry.prep }];
  if (!ok) return { ...fs, answers, done: true, correct: false, missed: entry };
  if (entry.exits) return { ...fs, answers, done: true, correct: true };
  return skipAutomatic({ ...fs, answers, index: fs.index + 1 });
}

// The final step ("Everything else") has no yes/no: reaching it is the answer.
function skipAutomatic(fs) {
  const entry = currentEntry(fs);
  if (entry && entry.expected === null && entry.exits) return { ...fs, done: true, correct: true, auto: entry };
  return fs;
}

/** Where the flow sends this item: the exit step's bin, or the item's own bin for exceptions. */
export function destinationOf(fs) {
  const exit = fs.path[fs.path.length - 1]?.flowStep;
  return fs.item.exception === true ? fs.item.bin : exit?.exitTo ?? fs.item.bin;
}
