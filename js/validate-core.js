// Shared validation rules for items.json. No DOM and no Node APIs, so the
// same rules run in CI (scripts/validate.mjs) and in the browser (js/data.js).
//
// validateData(data) returns:
//   errors      every problem found (CI fails if there are any)
//   warnings    things a human should look at (do not fail)
//   fatal       true if the file as a whole is unusable (bins/flow/top level)
//   validItems  items with no errors of their own (the browser plays these)
//
// Also exported for js/flow.js: nodeEdges(node), buildRoutes(data).

export const STATE_KEYS = ['liquid', 'food', 'dirty', 'lid', 'parts', 'terminals'];
export const EXTRA_DESTINATIONS = ['donate'];
export const NODE_TYPES = ['question', 'choice', 'prep', 'leaf'];
// Each action needs a matching starting state (lid needs lid: false).
export const ACTION_NEEDS = {
  pour: (s) => s.liquid === true,
  scrape: (s) => s.food === true,
  rinse: (s) => s.dirty === true,
  lid: (s) => s.lid === false,
  tape: (s) => s.terminals === true,
};
const TOP_LEVEL = ['bins', 'flowNodes', 'actions', 'levels', 'items'];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED = ['id', 'name', 'level', 'bin', 'exitNode', 'reason', 'start', 'steps'];
// Each start state must come with the step that fixes it.
const STATE_NEEDS_STEP = [
  [(s) => s.liquid, 'pour', 'starts with liquid but has no "pour" step.'],
  [(s) => s.food, 'scrape', 'starts with food but has no "scrape" step.'],
  [(s) => s.lid === false, 'lid', 'lid starts off but has no "lid" step.'],
];
// An exception's reason must say why it breaks the usual rule.
const EXCEPTION_WORDING = /except|unlike|even though|but /i;

// Outgoing edges of a flow node: [{ answer, to }].
export function nodeEdges(node) {
  if (node?.type === 'question' || node?.type === 'choice') {
    return (Array.isArray(node.options) ? node.options : []).map((o) => ({ answer: o?.answer, to: o?.next }));
  }
  if (node?.type === 'prep') {
    const out = [{ answer: 'ready', to: node.ifReady }];
    if (node.cantEmptyTo !== undefined) out.push({ answer: 'cant-empty', to: node.cantEmptyTo });
    return out;
  }
  return [];
}

// Map of node id -> route from flowStart, as [{ node, answer }].
// Follows known nodes only; loops and duplicates are reported by validateData.
export function buildRoutes(data) {
  const nodes = new Map((Array.isArray(data?.flowNodes) ? data.flowNodes : []).map((n) => [n?.id, n]));
  const routes = new Map();
  if (!nodes.has(data?.flowStart)) return routes;
  const stack = [[data.flowStart, []]];
  while (stack.length) {
    const [id, path] = stack.pop();
    if (routes.has(id)) continue;
    routes.set(id, path);
    for (const e of nodeEdges(nodes.get(id))) {
      if (nodes.has(e.to) && !routes.has(e.to)) stack.push([e.to, [...path, { node: id, answer: e.answer }]]);
    }
  }
  return routes;
}

export function validateData(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { errors: ['Data must be a JSON object.'], warnings, fatal: true, validItems: [] };
  }
  if (data.flow !== undefined) errors.push('"flow" was replaced by "flowStart" + "flowNodes" (v0.2.0). Remove it.');
  for (const key of TOP_LEVEL) {
    if (!Array.isArray(data[key])) errors.push(`Top-level "${key}" must be an array.`);
  }
  if (typeof data.flowStart !== 'string') errors.push('Top-level "flowStart" must be a node id.');
  if (errors.length) return { errors, warnings, fatal: true, validItems: [] };

  const binIds = checkBins(data.bins, errors);
  const nodes = checkFlow(data, binIds, errors);
  // Without valid bins and flow the game can't run at all.
  const fatal = errors.length > 0;

  const ctx = {
    binIds,
    nodes,
    routes: buildRoutes(data),
    actions: new Set(data.actions),
    levels: new Set(data.levels.map((l) => l?.level)),
    ids: new Set(),
  };
  const perLevel = {};
  const validItems = [];

  for (const [n, raw] of data.items.entries()) {
    const it = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const itemErrors = checkItem(it, n, ctx, warnings);
    if (it.verified === false) warnings.push(`${itemLabel(it, n)} is not verified yet. Check it in Toronto's Waste Wizard.`);
    perLevel[it.level] = (perLevel[it.level] ?? 0) + 1;
    errors.push(...itemErrors);
    if (!itemErrors.length) validItems.push(it);
  }

  for (const l of ctx.levels) {
    if ((perLevel[l] ?? 0) < 10) warnings.push(`Level ${l} has ${perLevel[l] ?? 0} items (target: at least 10).`);
  }

  return { errors, warnings, fatal, validItems: fatal ? [] : validItems };
}

function checkBins(bins, errors) {
  const binIds = new Set();
  for (const b of bins) {
    if (!b?.id || !b?.label) errors.push(`Bin missing id or label: ${JSON.stringify(b)}`);
    if (binIds.has(b?.id)) errors.push(`Duplicate bin id "${b.id}".`);
    binIds.add(b?.id);
  }
  return binIds;
}

// Checks every node and the tree shape. Returns Map of id -> node.
function checkFlow(data, binIds, errors) {
  const nodes = new Map();
  for (const n of data.flowNodes) {
    if (!n?.id) { errors.push(`Flow node missing id: ${JSON.stringify(n)?.slice(0, 80)}`); continue; }
    if (nodes.has(n.id)) errors.push(`Duplicate flow node id "${n.id}".`);
    nodes.set(n.id, n);
  }
  for (const n of nodes.values()) checkNode(n, nodes, binIds, errors);
  checkTreeShape(data.flowStart, nodes, buildRoutes(data), errors);
  return nodes;
}

function checkNode(n, nodes, binIds, errors) {
  const where = `Flow node "${n.id}"`;
  if (!NODE_TYPES.includes(n.type)) {
    errors.push(`${where}: type must be one of ${NODE_TYPES.join(', ')}.`);
    return;
  }
  if (n.type === 'leaf') {
    if (!binIds.has(n.bin)) errors.push(`${where}: unknown bin "${n.bin}".`);
    return;
  }
  if (!n.question) errors.push(`${where}: missing question.`);

  if (n.type === 'question') {
    const answers = (Array.isArray(n.options) ? n.options : []).map((o) => o?.answer).sort().join(',');
    if (answers !== 'no,yes') errors.push(`${where}: a question needs exactly a "yes" and a "no" option.`);
  }
  if (n.type === 'choice') {
    const options = Array.isArray(n.options) ? n.options : [];
    if (options.length < 2) errors.push(`${where}: a choice needs at least 2 options.`);
    const seen = new Set();
    for (const o of options) {
      if (!o?.answer || !o?.label) errors.push(`${where}: every option needs "answer" and "label".`);
      if (seen.has(o?.answer)) errors.push(`${where}: duplicate option "${o.answer}".`);
      seen.add(o?.answer);
    }
  }
  if (n.type === 'prep') {
    if (!n.prepQuestion) errors.push(`${where}: missing prepQuestion.`);
    // Both optional (SPEC.md 8): no cantEmptyTo = only "Carry it"; no scrapsTo = scraps disappear.
    if (n.scrapsTo !== undefined && !binIds.has(n.scrapsTo)) errors.push(`${where}: scrapsTo is unknown bin "${n.scrapsTo}".`);
    if (n.cantEmptyTo !== undefined) {
      const leaf = nodes.get(n.cantEmptyTo);
      if (leaf && !(leaf.type === 'leaf' && leaf.partial === true)) {
        errors.push(`${where}: cantEmptyTo must be a leaf with "partial": true.`);
      }
    }
  }
  for (const e of nodeEdges(n)) {
    if (!e.to) errors.push(`${where}: "${e.answer}" has no target.`);
    else if (!nodes.has(e.to)) errors.push(`${where}: "${e.answer}" points to unknown node "${e.to}".`);
  }
}

// Every node reachable from the start, reached from exactly one place, no loops.
function checkTreeShape(start, nodes, routes, errors) {
  if (!nodes.has(start)) {
    errors.push(`flowStart "${start}" is not a flow node.`);
    return;
  }
  const parents = new Map();
  for (const n of nodes.values()) {
    for (const e of nodeEdges(n)) {
      if (!nodes.has(e.to)) continue;
      const loops = e.to === start || (routes.get(n.id) ?? []).some((step) => step.node === e.to);
      if (loops) { errors.push(`Flow has a loop back to "${e.to}".`); continue; }
      parents.set(e.to, (parents.get(e.to) ?? 0) + 1);
    }
  }
  for (const id of nodes.keys()) {
    if (!routes.has(id)) errors.push(`Flow node "${id}" can't be reached from flowStart.`);
  }
  for (const [id, count] of parents) {
    if (count > 1) errors.push(`Flow node "${id}" is reached from ${count} places; each node needs exactly one route.`);
  }
}

function itemLabel(it, n) {
  return `Item "${it.id ?? '#' + (n + 1)}"`;
}

function checkItem(it, n, ctx, warnings) {
  const where = itemLabel(it, n);
  const errs = [];
  const err = (m) => errs.push(`${where}${m}`);
  const warn = (m) => warnings.push(`${where}${m}`);
  checkIdentity(it, ctx, err);
  checkAnswer(it, ctx, err, warn);
  checkStateAndSteps(it, ctx, err, warn);
  return errs;
}

function checkIdentity(it, ctx, err) {
  if (it.exitStep !== undefined) err(': "exitStep" was replaced by "exitNode" (v0.2.0).');
  for (const k of REQUIRED) {
    if (it[k] === undefined) err(` is missing "${k}".`);
  }
  if (typeof it.id === 'string' && !ID_PATTERN.test(it.id)) err(': id must be lowercase-with-dashes.');
  if (ctx.ids.has(it.id)) err(': duplicate id.');
  ctx.ids.add(it.id);
  if (!ctx.levels.has(it.level)) err(`: unknown level ${it.level}.`);
}

// Returns the leaf node if `leafId` is a leaf an item may end at, else null.
function exitLeaf(leafId, field, ctx, err) {
  const leaf = ctx.nodes.get(leafId);
  if (!leaf) { err(`: ${field} "${leafId}" is not a flow node.`); return null; }
  if (leaf.type !== 'leaf') { err(`: ${field} "${leafId}" is a question, not a leaf.`); return null; }
  if (leaf.partial) { err(`: ${field} can't be the partial "${leafId}" leaf; that's a player choice, not an answer.`); return null; }
  return leaf;
}

function checkAnswer(it, ctx, err, warn) {
  if (!ctx.binIds.has(it.bin)) err(`: unknown bin "${it.bin}".`);
  if (it.altBin && !ctx.binIds.has(it.altBin) && !EXTRA_DESTINATIONS.includes(it.altBin)) {
    err(`: unknown altBin "${it.altBin}".`);
  }
  if (typeof it.reason !== 'string' || it.reason.trim().length < 10) err(': reason must be a helpful sentence.');

  const leaf = it.exitNode !== undefined ? exitLeaf(it.exitNode, 'exitNode', ctx, err) : null;
  if (leaf && leaf.bin !== it.bin) {
    if (it.exception !== true) {
      err(`: exitNode "${it.exitNode}" leads to "${leaf.bin}" but bin is "${it.bin}". Fix it, or set "exception": true if this item really breaks the flow's rule.`);
    } else if (!EXCEPTION_WORDING.test(it.reason ?? '')) {
      warn(' is an exception; make sure its reason explains why it breaks the usual rule.');
    }
  }
  if (it.exception === true && leaf && leaf.bin === it.bin) {
    err(': "exception": true but the flow already gives the right bin. Remove it.');
  }

  if (it.alsoExitNodes !== undefined && !Array.isArray(it.alsoExitNodes)) err(': alsoExitNodes must be an array.');
  for (const alt of Array.isArray(it.alsoExitNodes) ? it.alsoExitNodes : []) {
    const altLeaf = exitLeaf(alt, 'alsoExitNodes', ctx, err);
    if (alt === it.exitNode) err(': alsoExitNodes repeats exitNode.');
    if (altLeaf && altLeaf.bin !== it.bin) {
      err(`: alsoExitNodes "${alt}" leads to "${altLeaf.bin}", not "${it.bin}". A second route must end in the same bin.`);
    }
  }
}

function checkStateAndSteps(it, ctx, err, warn) {
  const start = it.start && typeof it.start === 'object' ? it.start : {};
  for (const [k, v] of Object.entries(start)) {
    if (!STATE_KEYS.includes(k)) err(`: unknown start state "${k}".`);
    if (typeof v !== 'boolean') err(`: start.${k} must be true or false.`);
  }

  const steps = Array.isArray(it.steps) ? it.steps : [];
  if (it.steps !== undefined && !Array.isArray(it.steps)) err(': steps must be an array.');
  if (new Set(steps).size !== steps.length) err(': repeated step.');
  for (const s of steps) {
    if (!ctx.actions.has(s)) err(`: unknown action "${s}".`);
    else if (ACTION_NEEDS[s] && !ACTION_NEEDS[s](start)) err(`: step "${s}" doesn't match the start state.`);
  }
  for (const [has, step, message] of STATE_NEEDS_STEP) {
    if (has(start) && !steps.includes(step)) err(`: ${message}`);
  }

  // Items that need emptying should route through the prep node.
  if ((start.liquid || start.food) && ctx.nodes.get(it.exitNode)?.type === 'leaf') {
    const path = ctx.routes.get(it.exitNode) ?? [];
    if (!path.some((step) => ctx.nodes.get(step.node)?.type === 'prep')) {
      warn(' starts with food or liquid but its route skips the "empty it" step.');
    }
  }
}