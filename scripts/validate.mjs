// Validates data/items.json. No dependencies.
// Usage: node scripts/validate.mjs [path/to/items.json]
// Exits with code 1 if there are errors. Warnings do not fail.
// The rules live in js/validate-core.js so the browser uses the same ones.

import { readFileSync } from 'node:fs';
import { validateData } from '../js/validate-core.js';

const path = process.argv[2] ?? new URL('../data/items.json', import.meta.url);

let data;
try {
  data = JSON.parse(readFileSync(path, 'utf8'));
} catch (e) {
  console.error(`Could not read or parse ${path}: ${e.message}`);
  process.exit(1);
}

const { errors, warnings } = validateData(data);

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s). Fix them before merging.`);
  process.exit(1);
}
console.log(`items.json OK: ${data.items.length} items, ${warnings.length} warning(s).`);
