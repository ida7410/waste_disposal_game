// Item state model (SPEC.md 8): liquid, food, dirty, lid, parts, terminals.
// No DOM. Every function returns a new state; nothing is mutated.
// Interactions never touch state: they call back, and the mode calls applyAction().

// Leftovers that contaminate recycling (SPEC.md 6: "full/dirty item").
export const CONTAMINANT_FLAGS = ['liquid', 'food', 'dirty'];

// What each action needs, what it changes, and how to tell it's done.
// `flip` (read the label) has no start flag, so it sets an internal `labelRead`.
const ACTIONS = {
  pour: { applies: (s) => s.liquid === true, apply: (s) => ({ ...s, liquid: false }), done: (s) => s.liquid !== true },
  scrape: { applies: (s) => s.food === true, apply: (s) => ({ ...s, food: false }), done: (s) => s.food !== true },
  rinse: { applies: (s) => s.dirty === true, apply: (s) => ({ ...s, dirty: false }), done: (s) => s.dirty !== true },
  lid: { applies: (s) => s.lid === false, apply: (s) => ({ ...s, lid: true }), done: (s) => s.lid !== false },
  tape: { applies: (s) => s.terminals === true, apply: (s) => ({ ...s, terminals: false }), done: (s) => s.terminals !== true },
  separate: { applies: (s) => s.parts === true, apply: (s) => ({ ...s, parts: false }), done: (s) => s.parts !== true },
  flip: { applies: (s) => s.labelRead !== true, apply: (s) => ({ ...s, labelRead: true }), done: (s) => s.labelRead === true },
};

export function createItemState(item) {
  return { ...item.start };
}

/** Why an action can't happen yet: 'empty-first' (lid on a full container), or null. */
export function blockedReason(state, action) {
  if (action === 'lid' && state.lid === false && needsEmptying(state)) return 'empty-first';
  return null;
}

export function canApply(state, action) {
  return (ACTIONS[action]?.applies(state) ?? false) && !blockedReason(state, action);
}

/** Returns { state, changed }. An action that doesn't apply leaves state as is. */
export function applyAction(state, action) {
  if (!canApply(state, action)) return { state, changed: false };
  return { state: ACTIONS[action].apply(state), changed: true };
}

/** The item's required steps (from data) that are not done yet, in order. */
export function pendingSteps(item, state) {
  return (item.steps ?? []).filter((s) => !(ACTIONS[s]?.done(state) ?? true));
}

export function isReady(item, state) {
  return pendingSteps(item, state).length === 0;
}

export function contaminants(state) {
  return CONTAMINANT_FLAGS.filter((f) => state[f] === true);
}

/** SPEC.md 4.2: items with liquid or food get the "Can't empty it now" option. */
export function needsEmptying(state) {
  return state.liquid === true || state.food === true;
}
