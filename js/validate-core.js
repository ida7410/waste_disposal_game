// Shared validation rules for items.json. No DOM and no Node APIs, so the
// same rules run in CI (scripts/validate.mjs) and in the browser (js/data.js).
//
// validateData(data) returns:
//   errors      every problem found (CI fails if there are any)
//   warnings    things a human should look at (do not fail)
//   fatal       true if the file as a whole is unusable (bins/flow/top level)
//   validItems  items with no errors of their own (the browser plays these)

export const STATE_KEYS = ['liquid', 'food', 'dirty', 'lid', 'parts', 'terminals'];
export const EXTRA_DESTINATIONS = ['donate'];
// Each action needs a matching starting state (lid needs lid: false).
export const ACTION_NEEDS = {
  pour: (s) => s.liquid === true,
  scrape: (s) => s.food === true,
  rinse: (s) => s.dirty === true,
  lid: (s) => s.lid === false,
  tape: (s) => s.terminals === true,
};
const TOP_LEVEL = ['bins', 'flow', 'actions', 'levels', 'items'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED = ['id', 'name', 'level', 'bin', 'exitStep', 'reason', 'start', 'steps'];

export function validateData(data) {
  const errors = [];
  const warnings = [];
  const fatalResult = () => ({ errors, warnings, fatal: true, validItems: [] });

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    errors.push('Data must be a JSON object.');
    return fatalResult();
  }
  for (const key of TOP_LEVEL) {
    if (!Array.isArray(data[key])) errors.push(`Top-level "${key}" must be an array.`);
  }
  if (errors.length) return fatalResult();

  const binIds = new Set();
  for (const b of data.bins) {
    if (!b?.id || !b?.label) errors.push(`Bin missing id or label: ${JSON.stringify(b)}`);
    if (binIds.has(b?.id)) errors.push(`Duplicate bin id "${b.id}".`);
    binIds.add(b?.id);
  }

  data.flow.forEach((f, i) => {
    if (f?.step !== i + 1) errors.push(`Flow step at position ${i + 1} has step ${f?.step}; steps must be 1, 2, 3... in order.`);
    if (f?.exitTo && !binIds.has(f.exitTo)) errors.push(`Flow step ${f.step} exits to unknown bin "${f.exitTo}".`);
    if (!f?.question) errors.push(`Flow step ${f?.step} has no question.`);
  });
  // Without valid bins and flow the game can't run at all.
  const fatal = errors.length > 0;

  const ctx = {
    binIds,
    flowByStep: new Map(data.flow.map((f) => [f?.step, f])),
    actions: new Set(data.actions),
    levels: new Set(data.levels.map((l) => l?.level)),
    ids: new Set(),
  };
  const perLevel = {};
  const validItems = [];

  for (const [n, raw] of data.items.entries()) {
    const it = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const itemErrors = checkItem(it, n, ctx, warnings);
    perLevel[it.level] = (perLevel[it.level] ?? 0) + 1;
    errors.push(...itemErrors);
    if (!itemErrors.length) validItems.push(it);
  }

  for (const l of ctx.levels) {
    if ((perLevel[l] ?? 0) < 10) warnings.push(`Level ${l} has ${perLevel[l] ?? 0} items (target: at least 10).`);
  }

  return { errors, warnings, fatal, validItems: fatal ? [] : validItems };
}

function checkItem(it, n, ctx, warnings) {
  const errs = [];
  const err = (m) => errs.push(m);
  const where = `Item "${it.id ?? `#${n + 1}`}"`;

  for (const k of REQUIRED) {
    if (it[k] === undefined) err(`${where} is missing "${k}".`);
  }
  if (typeof it.id === 'string' && !ID_PATTERN.test(it.id)) {
    err(`${where}: id must be lowercase-with-dashes.`);
  }
  if (ctx.ids.has(it.id)) err(`${where}: duplicate id.`);
  ctx.ids.add(it.id);

  if (!ctx.levels.has(it.level)) err(`${where}: unknown level ${it.level}.`);

  if (!ctx.binIds.has(it.bin)) err(`${where}: unknown bin "${it.bin}".`);
  if (it.altBin && !ctx.binIds.has(it.altBin) && !EXTRA_DESTINATIONS.includes(it.altBin)) {
    err(`${where}: unknown altBin "${it.altBin}".`);
  }
  if (typeof it.reason !== 'string' || it.reason.trim().length < 10) {
    err(`${where}: reason must be a helpful sentence.`);
  }

  const flowStep = ctx.flowByStep.get(it.exitStep);
  if (!flowStep) {
    err(`${where}: exitStep ${it.exitStep} is not a flow step.`);
  } else if (!flowStep.exitTo) {
    err(`${where}: exitStep ${it.exitStep} ("${flowStep.id}") is not an exit.`);
  } else if (flowStep.exitTo !== it.bin && it.exception !== true) {
    err(`${where}: exitStep ${it.exitStep} leads to "${flowStep.exitTo}" but bin is "${it.bin}". Fix it, or set "exception": true if this is a real exception.`);
  }

  const start = it.start && typeof it.start === 'object' ? it.start : {};
  for (const [k, v] of Object.entries(start)) {
    if (!STATE_KEYS.includes(k)) err(`${where}: unknown start state "${k}".`);
    if (typeof v !== 'boolean') err(`${where}: start.${k} must be true or false.`);
  }

  const steps = Array.isArray(it.steps) ? it.steps : [];
  if (it.steps !== undefined && !Array.isArray(it.steps)) err(`${where}: steps must be an array.`);
  if (new Set(steps).size !== steps.length) err(`${where}: repeated step.`);
  for (const s of steps) {
    if (!ctx.actions.has(s)) err(`${where}: unknown action "${s}".`);
    else if (ACTION_NEEDS[s] && !ACTION_NEEDS[s](start)) {
      err(`${where}: step "${s}" doesn't match the start state.`);
    }
  }
  if (start.liquid && !steps.includes('pour')) err(`${where}: starts with liquid but has no "pour" step.`);
  if (start.food && !steps.includes('scrape')) err(`${where}: starts with food but has no "scrape" step.`);
  if (start.lid === false && !steps.includes('lid')) err(`${where}: lid starts off but has no "lid" step.`);

  if (it.verified === false) warnings.push(`${where} is not verified yet. Check it in Toronto's Waste Wizard.`);
  return errs;
}
