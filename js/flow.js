// Walks the flowNodes question tree (SPEC.md 4.3, 8). No DOM.
// Routes come from the tree itself (buildRoutes/nodeEdges, shared with the
// validator); items only name the leaf they end at, so nothing is hard-coded.
import { buildRoutes, nodeEdges } from './validate-core.js';
import { createItemState, needsEmptying } from './state.js';

/** Index the tree once per data file. */
export function createFlow(data) {
  const nodes = new Map(data.flowNodes.map((n) => [n.id, n]));
  return {
    start: data.flowStart,
    nodes,
    routes: buildRoutes(data),
    prepNode: data.flowNodes.find((n) => n.type === 'prep') ?? null,
  };
}

export function nodeById(flow, id) {
  return flow.nodes.get(id) ?? null;
}

/** The node an answer leads to, or null. Prep nodes answer 'ready' or 'cant-empty'. */
export function next(flow, nodeId, answer) {
  return nodeEdges(flow.nodes.get(nodeId)).find((e) => e.answer === answer)?.to ?? null;
}

/** Steps from flowStart to a node: [{ node, answer }], or null if unreachable. */
export function routeTo(flow, leafId) {
  return flow.routes.get(leafId) ?? null;
}

// ---- One item's walk (Ask the Questions) ----
// A walk is a plain object; every function returns a new one.
// stage: 'ask' at most nodes; at the prep node 'empty' ("Is it empty?") then
// 'can-empty' ("Can you empty it now?").

export function startWalk(flow, item) {
  const leaves = [item.exitNode, ...(Array.isArray(item.alsoExitNodes) ? item.alsoExitNodes : [])];
  const fair = leaves.map((leaf) => ({ leaf, steps: routeTo(flow, leaf) ?? [] }));
  return { item, at: flow.start, depth: 0, stage: stageFor(nodeById(flow, flow.start)), fair, answers: [], done: false, outcome: null, missed: null, leaf: null, prepped: false };
}

function stageFor(node) {
  return node?.type === 'prep' ? 'empty' : 'ask';
}

/**
 * What to show for the walk's current step:
 * { node, kind: 'question' | 'choice', text, examples, options: [{ answer, label, examples }] }
 */
export function currentPrompt(flow, walk) {
  if (walk.done) return null;
  const node = nodeById(flow, walk.at);
  if (node.type === 'prep') {
    const yesNo = [{ answer: 'yes', label: 'Yes' }, { answer: 'no', label: 'No' }];
    if (walk.stage === 'empty') return { node, kind: 'question', text: node.question, options: yesNo };
    // "No" here ends at cantEmptyTo, so it's only offered if that leaf exists.
    const options = node.cantEmptyTo ? yesNo : yesNo.slice(0, 1);
    return { node, kind: 'question', text: node.prepQuestion, options };
  }
  return {
    node,
    kind: node.type === 'choice' ? 'choice' : 'question',
    text: node.question,
    examples: node.examples ?? '',
    options: node.options.map((o) => ({ answer: o.answer, label: o.label ?? o.answer, examples: o.examples ?? '' })),
  };
}

/** The right answer to "Is it empty?" comes from the item's start state. */
export function expectedEmptyAnswer(item) {
  return needsEmptying(createItemState(item)) ? 'no' : 'yes';
}

/** Answer the current prompt. Leaving every fair route stops the walk at this node. */
export function answerWalk(flow, walk, answer) {
  if (walk.done) return walk;
  const node = nodeById(flow, walk.at);
  if (node.type === 'prep') return answerPrep(flow, walk, node, answer);

  const alive = walk.fair.filter((r) => r.steps[walk.depth]?.node === node.id && r.steps[walk.depth]?.answer === answer);
  const answers = [...walk.answers, { node: node.id, stage: 'ask', answer, ok: alive.length > 0 }];
  if (!alive.length) return miss(walk, answers, node, 'ask', fairAnswers(walk, node));
  return moveTo(flow, { ...walk, answers, fair: alive }, next(flow, node.id, answer));
}

function answerPrep(flow, walk, node, answer) {
  if (walk.stage === 'empty') {
    const expected = expectedEmptyAnswer(walk.item);
    const ok = answer === expected;
    const answers = [...walk.answers, { node: node.id, stage: 'empty', answer, ok }];
    if (!ok) return miss(walk, answers, node, 'empty', [expected]);
    if (answer === 'yes') return moveTo(flow, { ...walk, answers }, node.ifReady);
    return { ...walk, answers, stage: 'can-empty' };
  }
  // "Can you empty it now?" is the player's choice: never a miss.
  const answers = [...walk.answers, { node: node.id, stage: 'can-empty', answer, ok: true, prep: answer === 'yes' }];
  if (answer === 'yes') return moveTo(flow, { ...walk, answers, prepped: true }, node.ifReady);
  return { ...walk, answers, at: node.cantEmptyTo, done: true, outcome: 'gave-up', leaf: nodeById(flow, node.cantEmptyTo) };
}

function moveTo(flow, walk, nodeId) {
  const node = nodeById(flow, nodeId);
  const moved = { ...walk, at: nodeId, depth: walk.depth + 1, stage: stageFor(node) };
  if (node?.type !== 'leaf') return moved;
  const exception = walk.item.exception === true && nodeId === walk.item.exitNode;
  return { ...moved, done: true, leaf: node, outcome: exception ? 'exception' : 'correct' };
}

function miss(walk, answers, node, stage, expected) {
  return { ...walk, answers, done: true, outcome: 'missed', missed: { node, stage, expected } };
}

// The answers at `node` that stay on a fair route (more than one for e.g. the cereal box).
function fairAnswers(walk, node) {
  return [...new Set(walk.fair.filter((r) => r.steps[walk.depth]?.node === node.id).map((r) => r.steps[walk.depth].answer))];
}

/** Where the item really goes: its own bin (exceptions included), or the partial leaf's bin. */
export function destinationOf(walk) {
  return walk.outcome === 'gave-up' ? walk.leaf?.bin ?? walk.item.bin : walk.item.bin;
}
