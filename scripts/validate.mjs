// Validates data/items.json. No dependencies.
// Usage: node scripts/validate.mjs [path/to/items.json]
// Exits with code 1 if there are errors. Warnings do not fail.

import { readFileSync } from 'node:fs';

const path = process.argv[2] ?? new URL('../data/items.json', import.meta.url);
const errors = [];
const warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`Could not read or parse ${path}: ${e.message}`);
  process.exit(1);
}

const STATE_KEYS = ['liquid', 'food', 'dirty', 'lid', 'parts', 'terminals'];
const EXTRA_DESTINATIONS = ['donate'];
// Each action needs a matching starting state (lid needs lid: false).
const ACTION_NEEDS = {
  pour: (s) => s.liquid === true,
  scrape: (s) => s.food === true,
  rinse: (s) => s.dirty === true,
  lid: (s) => s.lid === false,
  tape: (s) => s.terminals === true,
};

for (const key of ['bins', 'flow', 'actions', 'levels', 'items']) {
  if (!Array.isArray(data[key])) err(`Top-level "${key}" must be an array.`);
}
if (errors.length) report();

const binIds = new Set();
for (const b of data.bins) {
  if (!b.id || !b.label) err(`Bin missing id or label: ${JSON.stringify(b)}`);
  if (binIds.has(b.id)) err(`Duplicate bin id "${b.id}".`);
  binIds.add(b.id);
}

data.flow.forEach((f, i) => {
  if (f.step !== i + 1) err(`Flow step at position ${i + 1} has step ${f.step}; steps must be 1, 2, 3... in order.`);
  if (f.exitTo && !binIds.has(f.exitTo)) err(`Flow step ${f.step} exits to unknown bin "${f.exitTo}".`);
  if (!f.question) err(`Flow step ${f.step} has no question.`);
});
const flowByStep = new Map(data.flow.map((f) => [f.step, f]));

const actions = new Set(data.actions);
const levels = new Set(data.levels.map((l) => l.level));
const ids = new Set();
const perLevel = {};

for (const [n, it] of data.items.entries()) {
  const where = `Item "${it.id ?? `#${n + 1}`}"`;

  for (const k of ['id', 'name', 'level', 'bin', 'exitStep', 'reason', 'start', 'steps']) {
    if (it[k] === undefined) err(`${where} is missing "${k}".`);
  }
  if (typeof it.id === 'string' && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(it.id)) {
    err(`${where}: id must be lowercase-with-dashes.`);
  }
  if (ids.has(it.id)) err(`${where}: duplicate id.`);
  ids.add(it.id);

  if (!levels.has(it.level)) err(`${where}: unknown level ${it.level}.`);
  perLevel[it.level] = (perLevel[it.level] ?? 0) + 1;

  if (!binIds.has(it.bin)) err(`${where}: unknown bin "${it.bin}".`);
  if (it.altBin && !binIds.has(it.altBin) && !EXTRA_DESTINATIONS.includes(it.altBin)) {
    err(`${where}: unknown altBin "${it.altBin}".`);
  }
  if (typeof it.reason !== 'string' || it.reason.trim().length < 10) {
    err(`${where}: reason must be a helpful sentence.`);
  }

  const flowStep = flowByStep.get(it.exitStep);
  if (!flowStep) {
    err(`${where}: exitStep ${it.exitStep} is not a flow step.`);
  } else if (!flowStep.exitTo) {
    err(`${where}: exitStep ${it.exitStep} ("${flowStep.id}") is not an exit.`);
  } else if (flowStep.exitTo !== it.bin && it.exception !== true) {
    err(`${where}: exitStep ${it.exitStep} leads to "${flowStep.exitTo}" but bin is "${it.bin}". Fix it, or set "exception": true if this is a real exception.`);
  }

  const start = it.start ?? {};
  for (const [k, v] of Object.entries(start)) {
    if (!STATE_KEYS.includes(k)) err(`${where}: unknown start state "${k}".`);
    if (typeof v !== 'boolean') err(`${where}: start.${k} must be true or false.`);
  }

  const steps = it.steps ?? [];
  if (new Set(steps).size !== steps.length) err(`${where}: repeated step.`);
  for (const s of steps) {
    if (!actions.has(s)) err(`${where}: unknown action "${s}".`);
    else if (ACTION_NEEDS[s] && !ACTION_NEEDS[s](start)) {
      err(`${where}: step "${s}" doesn't match the start state.`);
    }
  }
  if (start.liquid && !steps.includes('pour')) err(`${where}: starts with liquid but has no "pour" step.`);
  if (start.food && !steps.includes('scrape')) err(`${where}: starts with food but has no "scrape" step.`);
  if (start.lid === false && !steps.includes('lid')) err(`${where}: lid starts off but has no "lid" step.`);

  if (it.verified === false) warn(`${where} is not verified yet. Check it in Toronto's Waste Wizard.`);
}

for (const l of levels) {
  if ((perLevel[l] ?? 0) < 10) warn(`Level ${l} has ${perLevel[l] ?? 0} items (target: at least 10).`);
}

report();

function report() {
  for (const w of warnings) console.warn(`warning: ${w}`);
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length) {
    console.error(`\n${errors.length} error(s). Fix them before merging.`);
    process.exit(1);
  }
  console.log(`items.json OK: ${data.items.length} items, ${warnings.length} warning(s).`);
  process.exit(0);
}