# AGENTS.md

Instructions for AI coding agents working on this repository. Read `SPEC.md` first; it is the source of truth for features. This file covers how to work.

## Project summary
SortRight is a static web game that teaches Toronto waste sorting by having players act out real disposal steps (pour, scrape, rinse, lid on) before choosing a bin. It is a prototype that will later be embedded in a partner mobile app's WebView.

## Stack and hard constraints
- Plain HTML, CSS, JavaScript (ES modules). **No frameworks, no bundler, no build step, no runtime npm packages.**
- Hosted on GitHub Pages: use **relative paths only** (the site may live under a sub-path like `/repo-name/`).
- No backend, no database, no external network calls, no analytics SDKs, no ML/camera features.
- No partner names, logos or brand colors in the UI. Theme only via `css/theme.css` variables.

## Run locally
`fetch()` does not work from `file://`, so serve the folder:

```
python3 -m http.server 8000   # on Windows: python -m http.server 8000
# open http://localhost:8000
```

## Tests
Pure logic (state, scoring, flow) lives in modules with no DOM access and is tested with Node's built-in runner (no dependencies). Requires **Node 22 or newer** (glob support in `--test`). Name test files `*.test.mjs`.

```
node --test "tests/*.test.mjs"
node scripts/validate.mjs
```

Keep the quotes around the glob so Node expands it, not the shell (works the same on macOS, Linux and Windows).

Before finishing any task: run the tests, load the page in a browser at 390×844 and at desktop width, and check the browser console has no errors.

## Folder structure
```
index.html
css/theme.css          # all colors, fonts, radii as CSS variables (partner reskins here)
css/style.css
js/main.js             # boot, routing between modes and levels
js/data.js             # load + validate items.json
js/validate-core.js    # data rules shared by browser and scripts/validate.mjs - no DOM
js/state.js            # item state model (liquid, food, dirty, lid, ...) - no DOM
js/scoring.js          # scoring rules - no DOM
js/flow.js             # walks flowNodes tree; routeTo(leafId), next(nodeId, answer) - no DOM
js/events.js           # emits window.SortRight.onEvent hook
js/modes/quick-sort.js
js/modes/prep-sort.js
js/modes/ask-questions.js
js/interactions/pour.js
js/interactions/lid.js
js/interactions/scrape.js
js/interactions/rinse.js
js/interactions/fallback.js   # separate, tape, flip
js/art/                 # SVG drawing functions for items, bins, sink
data/items.json
scripts/validate.mjs    # data validator (Node, no deps) - also run by CI
.github/workflows/validate.yml
.github/pull_request_template.md
tests/
```

## Rules about disposal content (important)
- **Never hard-code which bin an item goes in.** All rules, reasons and questions come from `data/items.json`.
- **Do not change any `bin`, `exitNode`, `alsoExitNodes`, `exception`, `reason` or `steps` value, or the questions in `flowNodes`,** unless the human asks or gives a source. These rules are checked against City of Toronto / Circular Materials guidance.
- Do not add new items with guessed answers. If asked to add items, mark them `"verified": false` and list them in your summary for a human to check in Toronto's Waste Wizard.
- Feedback copy: short, friendly, never shaming. Always show the item's `reason`.

## Code conventions
- Use **Pointer Events** (`pointerdown/move/up`, `setPointerCapture`) for all drag gestures; one code path for touch and mouse. Add `touch-action: none` on draggable elements.
- Every gesture must have a button/keyboard alternative that calls the same function.
- Keep modules small and single-purpose (aim < 200 lines). Interactions export `start(itemEl, state, onDone)` and `stop()`.
- State changes go through `state.js`; interactions never mutate state objects directly.
- Wrap `localStorage` access in try/catch; the game must work without it.
- Respect `prefers-reduced-motion`.
- No `alert()`, `confirm()`, `prompt()` or new windows.
- Minimum touch target 44×44 px. Bins must be identifiable by label/icon, not only color.
- Graphics are simple inline SVG drawn in code. Do not add copyrighted images, characters or logos.

## Data loading and validation
- All data loading goes through `loadGameData(url)` in `js/data.js`. No other module fetches data.
- URL is `window.SortRight?.dataUrl ?? 'data/items.json'`. If a custom URL fails, fall back to `data/items.json`.
- Validate in the browser with the same rules as `scripts/validate.mjs`. Put the shared rules in a DOM-free module (e.g. `js/validate-core.js`) and import it from both the browser loader and the Node script, so the rules never drift apart.
- Invalid items are logged to the console and skipped; the game must not crash on bad data.
- Do not build a write API or admin backend. New items are added by pull request (SPEC.md 8.1).
- If you change the `items.json` schema, update `scripts/validate.mjs`, SPEC.md section 8 and the PR template in the same change. The schema is the contract with the partner app.

## Workflow
- Work milestone by milestone (SPEC.md section 12). Stop at the end of each milestone and summarize what was built, what is left, and anything you were unsure about.
- Prefer small, reviewable commits with clear messages (e.g. `feat(pour): tilt-to-pour over sink`).
- If a requirement in SPEC.md is unclear or conflicts with this file, ask rather than guess. This file wins on how; SPEC.md wins on what.

## Definition of done (per feature)
- Works with touch and mouse, and has a keyboard/button alternative.
- No console errors; `node --test "tests/*.test.mjs"` passes.
- Looks right at 360 px and desktop widths.
- Reads all rules from `items.json`.