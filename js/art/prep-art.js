// State-aware drawings for Prep & Sort: liquid level, food, loose lid, tape,
// label. Artwork only: which state an item starts in comes from items.json.
// Items with no entry here fall back to the plain Quick Sort drawing.
import { artFor, itemSvg } from './items.js';

const LINE = '#2b3442';
const O = `stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
const LIQUID = { 'water-bottle': '#4ea3ea', 'pop-can': '#7b3f1d', 'milk-carton': '#b9cfe6', 'coffee-cup': '#6b3f22' };

// Containers on the 120x120 canvas. liquid: [top, bottom] of a full fill.
// cap: [x, y, w, h] of the lid; neck: where the lid snaps (centre of cap).
const CONTAINERS = {
  bottle: {
    body: 'M53 21h14v10c11 5 15 11 15 20v52a5 5 0 0 1-5 5H43a5 5 0 0 1-5-5V51c0-9 4-15 15-20z',
    liquid: [40, 108], cap: [51, 12, 18, 9], capFill: '#5a6b7d',
    over: '<rect x="38" y="62" width="44" height="16" fill="#fff" opacity=".55"/>',
  },
  can: {
    body: 'M38 29a7 7 0 0 1 7-7h30a7 7 0 0 1 7 7v66a7 7 0 0 1-7 7H45a7 7 0 0 1-7-7z', liquid: [30, 102],
    over: `<ellipse cx="60" cy="24" rx="22" ry="5" fill="#cfd5dc" ${O}/>`,
  },
  carton: {
    body: 'M38 36l10-20h24l10 20v68H38z', liquid: [40, 104],
    over: `<path d="M48 16h24v-4H48zM38 36h44" fill="none" ${O}/>`,
  },
  cup: {
    body: 'M34 28h52l-7 76H41z', liquid: [34, 104],
    over: `<rect x="30" y="20" width="60" height="10" rx="3" fill="#f2f2f2" ${O}/>`,
  },
  jar: {
    body: 'M34 40a10 10 0 0 1 10-10h32a10 10 0 0 1 10 10v54a10 10 0 0 1-10 10H44a10 10 0 0 1-10-10z',
    cap: [42, 18, 36, 12], capFill: '#8a96a3',
    // [cx, cy, r, colour] - each blob is scraped off on its own.
    food: [[47, 88, 9, '#c0392b'], [64, 92, 9, '#c0392b'], [78, 86, 7, '#c0392b'], [50, 62, 5, '#c0392b'], [70, 68, 5, '#c0392b']],
  },
  tray: {
    body: 'M18 60h84l-10 34H28z',
    under: `<path d="M22 60l12-28h52l12 28" fill="#ffffff" ${O}/>`,
    food: [[44, 72, 8, '#c76b2e'], [64, 78, 7, '#c76b2e'], [80, 70, 6, '#e0a030']],
  },
};

// Overlays for steps that aren't about emptying.
const TAPE = {
  batteries: '<rect x="33" y="21" width="16" height="12" rx="2" fill="#e8c547" opacity=".95"/><rect x="69" y="21" width="16" height="12" rx="2" fill="#e8c547" opacity=".95"/>',
  cell: '<rect x="30" y="22" width="22" height="14" rx="2" fill="#e8c547" opacity=".95"/><rect x="70" y="22" width="22" height="14" rx="2" fill="#e8c547" opacity=".95"/>',
};
const LABELS = {
  'compostable-cup': `<rect x="36" y="78" width="48" height="16" rx="4" fill="#fff" ${O}/><text x="60" y="89.5" text-anchor="middle" font-size="8" font-weight="700" font-family="system-ui,sans-serif" fill="#2e7d32" textLength="40" lengthAdjust="spacingAndGlyphs">COMPOSTABLE</text>`,
  // A text label for now; real hazard symbols to come (owner is checking which ones).
  'spray-paint': `<rect x="36" y="72" width="48" height="16" rx="4" fill="#fff" ${O}/><text x="60" y="83.5" text-anchor="middle" font-size="8" font-weight="700" font-family="system-ui,sans-serif" fill="#b03a2e" textLength="38" lengthAdjust="spacingAndGlyphs">FLAMMABLE</text>`,
};
// What each drawn label shows, in words: the picture can be too small to read,
// and screen readers can't see it. Describes the drawing above, not a rule.
const LABEL_CAPTIONS = {
  'compostable-cup': 'The label says “COMPOSTABLE”.',
  'spray-paint': 'The label says “FLAMMABLE”.',
};

/** Words for an item's drawn label, or '' if it has none. */
export function labelCaption(itemId) {
  return LABEL_CAPTIONS[itemId] ?? '';
}

// Smudges for state.dirty (any item).
const DIRT = '<g class="dirt" fill="#8a6a3f" opacity=".75"><ellipse cx="48" cy="70" rx="7" ry="4"/><ellipse cx="70" cy="84" rx="6" ry="3.5"/><ellipse cx="62" cy="58" rx="4" ry="2.5"/></g>';

let uid = 0;

export function capSvg(cap, fill) {
  const [x, y, w, h] = cap;
  return `<svg viewBox="${x - 2} ${y - 2} ${w + 4} ${h + 4}" aria-hidden="true" focusable="false"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${fill}" ${O}/></svg>`;
}

/**
 * Draw an item in its current state.
 * Returns { svg, cap: [x,y,w,h] | null, capSvg } so the lid interaction can place the loose cap.
 */
export function drawPrepItem(item, state, fill = state.liquid ? 1 : 0) {
  const [shape, color] = artFor(item.id);
  const c = CONTAINERS[shape];
  if (!c) return { svg: withOverlays(item, state, itemSvg(item.id), shape), cap: null };

  const id = `clip-${++uid}`;
  const parts = [`<defs><clipPath id="${id}"><path d="${c.body}"/></clipPath></defs>`, c.under ?? ''];
  parts.push(`<path d="${c.body}" fill="${color}" ${O}/>`);
  if (c.liquid) {
    const [top, bottom] = c.liquid;
    const y = bottom - fill * (bottom - top);
    parts.push(`<rect class="liquid" clip-path="url(#${id})" x="0" y="${y}" width="120" height="${bottom - y}" data-top="${top}" data-bottom="${bottom}" fill="${LIQUID[item.id] ?? '#4ea3ea'}" opacity=".9"/>`);
  }
  if (c.food && state.food) {
    const blobs = c.food.map(([cx, cy, r, fill], i) => `<circle class="blob" data-i="${i}" cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`);
    parts.push(`<g clip-path="url(#${id})">${blobs.join('')}</g>`);
  }
  parts.push(`<path d="${c.body}" fill="none" ${O}/>`, c.over ?? '');
  if (c.cap && state.lid !== false) {
    const [x, y, w, h] = c.cap;
    parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${c.capFill}" ${O}/>`);
  }
  if (LABELS[item.id] && state.labelRead) parts.push(LABELS[item.id]);
  const svg = `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
  return { svg, cap: c.cap ?? null, capSvg: c.cap ? capSvg(c.cap, c.capFill) : '' };
}

function withOverlays(item, state, svg, shape) {
  const extra = (TAPE[shape] && state.terminals === false ? TAPE[shape] : '')
    + (LABELS[item.id] && state.labelRead ? LABELS[item.id] : '')
    + (state.dirty ? DIRT : '');
  return extra ? svg.replace('</svg>', `${extra}</svg>`) : svg;
}

/**
 * For modes with no "Read label" step (Quick Sort, Ask the Questions): the item
 * in its start state, with any label already showing, so the name doesn't have
 * to give it away and the player can still see it.
 */
export function drawWithLabelShowing(item) {
  const state = { ...item.start };
  if (Array.isArray(item.steps) && item.steps.includes('flip')) state.labelRead = true;
  return drawPrepItem(item, state).svg;
}

/** Contamination splash: a sheet of paper in the bin gets stained, with droplets. */
export function splashSvg() {
  return `<svg viewBox="0 0 60 60" aria-hidden="true" focusable="false">
    <g class="splash-drops" fill="#7b5a2e"><circle cx="10" cy="14" r="3.5"/><circle cx="50" cy="10" r="3"/><circle cx="6" cy="34" r="2.5"/><circle cx="54" cy="30" r="3.5"/><circle cx="30" cy="5" r="2.5"/></g>
    <rect class="splash-paper" x="17" y="16" width="26" height="32" rx="2" fill="#fbfbf6" ${O}/>
    <path class="splash-stain" d="M20 30c6-6 10 2 15-3s8 3 6 9-8 8-13 7-11-6-8-13z" fill="#a47a43" opacity=".8"/>
  </svg>`;
}

/** Update the liquid level of an already-drawn item (0..1) without redrawing it. */
export function setFill(rootEl, fill) {
  const rect = rootEl.querySelector('rect.liquid');
  if (!rect) return;
  const top = Number(rect.dataset.top);
  const bottom = Number(rect.dataset.bottom);
  const y = bottom - Math.max(0, Math.min(1, fill)) * (bottom - top);
  rect.setAttribute('y', String(y));
  rect.setAttribute('height', String(bottom - y));
}
