// Picks a drawing for each item id. This is artwork only: it never decides a
// bin. Items without an entry (e.g. new ones from a partner feed) get a
// generic shape; their name is always shown under the drawing.
import { SHAPES } from './shapes.js';

const ART = {
  'water-bottle': ['bottle', '#a9d4f5'],
  'pop-can': ['can', '#d94a4a'],
  'sauce-jar': ['jar', '#dbe7ef'],
  'cereal-box': ['box', '#f2a93b'],
  'milk-carton': ['carton', '#f5f5f5'],
  flyers: ['paper', '#fbfbf6'],
  'banana-peel': ['peel', '#f4d03f'],
  'apple-core': ['blob', '#e8c07d'],
  eggshells: ['shells', '#f4e6d0'],
  'chicken-bones': ['bone', '#f1e6cf'],
  'coffee-cup': ['cup', '#e9dcc6'],
  'chip-bag': ['crinkle', '#e2574c'],
  'toothpaste-tube': ['tube', '#5bb7c9'],
  'foam-takeout': ['tray', '#ffffff'],
  'grocery-bag': ['sack', '#eef2f5'],
  tissue: ['tissue', '#ffffff'],
  'coffee-grounds': ['blob', '#6f4e37'],
  diaper: ['pack', '#dff0fb'],
  'dog-poop': ['sack', '#7bbf6a'],
  'greasy-pizza-box': ['pizzabox', '#d9b98a'],
  'compostable-cup': ['cup', '#cfe8c4'],
  'baby-wipes': ['pack', '#9fd3e6'],
  mask: ['mask', '#a9cdeb'],
  'ceramic-mug': ['mug', '#e76f51'],
  'drinking-glass': ['tumbler', '#bfe3f0'],
  'old-tshirt': ['shirt', '#6c8ebf'],
  'plastic-toy': ['toy', '#f15a5a'],
  chopsticks: ['sticks', '#d8b27a'],
  'pet-hair': ['hair', '#8a6a4a'],
  'chemical-paper-towel': ['towel', '#ffffff'],
  'aa-batteries': ['batteries', '#3f4a57'],
  'lithium-battery': ['cell', '#4a5a6a'],
  charger: ['charger', '#f4f4f4'],
  paint: ['paintcan', '#4c9be8'],
  needle: ['needle', '#e9f3f8'],
  medication: ['pills', '#e8913a'],
  propane: ['cylinder', '#4f7fb8'],
  'fluorescent-bulb': ['bulb', '#f1f4f6'],
  'spray-paint': ['spray', '#c0392b'],
  'wine-bottle': ['wine', '#3f7d4a'],
};

export function itemSvg(itemId) {
  const [shape, color] = ART[itemId] ?? ['generic', '#c9d2dc'];
  return `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">${SHAPES[shape](color)}</svg>`;
}
