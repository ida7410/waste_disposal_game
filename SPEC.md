# SortRight — Prototype Spec

A web prototype of a waste-sorting game that teaches Toronto residents how to dispose of items correctly by **acting out the real steps** (pour, scrape, rinse, put the lid on), not just picking a bin. It is planned to be integrated into a partner mobile app later, so it must be mobile-first, self-contained and easy to embed.

> **Using this with a coding agent:** give the agent this file, `AGENTS.md`, and `data/items.json`, then say:
> "Build the prototype described in SPEC.md, following AGENTS.md. Start with Milestone 1 and stop for review at the end of each milestone."

---

## 1. Problem and goal

People learn sorting rules in quizzes but still sort incorrectly at the real bin. The quiz and the real action are disconnected.

**Goal:** make the in-game actions match the real-world actions, so players practise the habit:
- Notice the item's state (full, dirty, lid off).
- Fix the state if needed (pour, scrape, rinse, lid on).
- Then choose the bin, using a question flow they can reuse on items the game never showed them.

**Success measure (outside the app):** lower contamination in a before/after bin audit during the pilot. In-app, track accuracy per item locally to find what people get wrong.

## 2. Scope

### In scope (prototype)
- Three game modes (section 4), 40 items in 4 levels (`data/items.json`).
- Two fully built interactions: **pour** and **lid**. Then **scrape** and **rinse** if time allows. Remaining actions (`separate`, `tape`, `flip`) can fall back to a single tap with a short animation.
- Toronto rules only.
- Runs as a static site on GitHub Pages. Works offline after first load.

### Out of scope
- Any ML, camera or image recognition.
- Accounts, login, backend, database, leaderboards across devices.
- Any partner branding, logos or names in the UI until approved. Use a neutral theme.
- Collecting personal data.

## 3. Users and context
- Toronto residents, likely on a phone, often for under a minute at a time.
- Must work one-handed with touch, and also with mouse and keyboard.
- Target viewport 360–430 px wide (portrait). Must not break on desktop.

## 4. Game modes

### 4.1 Quick Sort (tap/drag to bin)
- One item at a time. Player drags it (or taps it, then taps a bin) into one of the bins in `bins`.
- Quick Sort is about choosing the bin only. It does not check or change item state.
- For items with `steps`, the feedback lists the prep in plain words, e.g. "Before binning: pour it out, put the lid on." Checking state is Prep & Sort's job.
- Correct: short positive feedback + the item's `reason`.
- Wrong: show the correct bin and the `reason`. No harsh "Wrong!" copy.

### 4.2 Prep & Sort (the main mode)
- The item appears in its `start` state (e.g. bottle with liquid, lid off).
- A small "workstation" shows the tools needed for this level: sink/tap, Green Bin for scraps, and the bins.
- The player must perform the item's `steps` (in any reasonable order unless the item says otherwise), then put it in the correct bin.
- **Bins check state, not just item.** Dropping a still-full container in the Blue Bin triggers a splash animation that stains a paper item in the bin, plus an explanation of contamination.
- **Not every item needs prep.** A clean, empty can should go straight in. Doing unnecessary steps costs a little time but is not "wrong".
- **"Can't empty it now" button** for items with liquid or food: choices are "Carry it" (item moves to an inventory slot and comes back 2 items later) or "Garbage" (partial points). Blue Bin while full = lose points.

### 4.3 Ask the Questions (decision flow)
- The player gets an item and answers the yes/no questions in `flow` in order.
- The game stops at the item's `exitStep` and shows where it goes and why.
- If the player answers wrongly, show which question they missed and the `reason`.
- Purpose: teach a method that works for unknown items.

## 5. Interactions (acceptance criteria)

All interactions use **Pointer Events** (one code path for touch + mouse) and each must have a **keyboard / button alternative** (e.g. "Pour" button that runs the same animation).

### 5.1 Pour — Priority 1
- Player drags the container over the sink zone.
- While over the sink, rotating it (two-finger rotate, or drag horizontally while held, or a rotate handle) past ~100° makes liquid flow; the fill level drops smoothly.
- Liquid stops if tilted back below the threshold or moved off the sink.
- Done when fill level reaches 0. State `liquid` becomes `false`.
- Pouring anywhere other than the sink: liquid spills, short hint "Pour it into a sink or drain."
- Keyboard alternative: focus item, press "Pour" button → plays the pour.

### 5.2 Lid — Priority 1
- A loose cap appears near the bottle.
- Player drags the cap onto the bottle neck (snap within ~24 px), then does a circular swipe (or taps "Twist") to screw it on.
- State `lid` becomes `true`.
- Ontario rule shown in feedback: **keep lids on**.

### 5.3 Scrape — Priority 2
- Food residue shown as blobs inside the container.
- Player rubs/swipes over the residue; each blob clears after enough swipe distance.
- Scraps must be dragged (or auto-flicked) to the Green Bin.
- State `food` becomes `false`.

### 5.4 Rinse — Priority 2
- Press and hold the item under the tap; a progress ring fills over ~1.5 s.
- State `dirty` becomes `false`.

### 5.5 Fallback actions — Priority 3
- `separate` (e.g. greasy vs clean part, sleeve vs cup), `tape` (tape battery terminals), `flip` (read a label like "compostable" or a hazard symbol).
- Prototype: one tap + short animation + a sentence explaining the action.

## 6. Scoring and feedback
- +10 correct bin with correct state.
- +5 partial (e.g. "Garbage" when it could not be emptied).
- −5 contamination (full/dirty item in Blue Bin, or wrong bin).
- Small time bonus in Prep & Sort for skipping unnecessary steps.
- Every result shows the item's one-line `reason`. Feedback copy is short, friendly and never shaming.
- End of level: accuracy, the items missed, and a "Practice missed items" button.

## 7. Levels
From `items.json` → `level`:
1. Easy
2. Toronto surprises
3. Garbage traps
4. Special drop-off

Unlock the next level at ≥70% accuracy. Allow replaying any unlocked level.

## 8. Data

All game content comes from `data/items.json`. **No disposal rule may be hard-coded in JS.** Changing an answer must only require editing the JSON.

Key fields (see file for full schema):
- `bins[]`: `id`, `label`, `color`.
- `flow[]`: ordered yes/no questions; `exitOn` ("yes"/"no") and `exitTo` (bin id) or `action` (for the empty/rinse step).
- `actions[]`: allowed action ids.
- `items[]`: `id`, `name`, `level`, `bin`, `exitStep`, `reason`, `start` (state flags), `steps` (ordered action ids), optional `note`, `altBin`.

State flags used: `liquid`, `food`, `dirty`, `lid` (`false` means lid is off and must be put on), `parts`, `terminals` (battery exposed).

Optional item fields: `exception: true` (bin differs from where its `exitStep` normally leads, e.g. chemical-soiled paper towel), `verified: false` (not yet checked against Waste Wizard; validator warns).

### 8.1 Adding items (no API in the prototype)
There is deliberately no write API. GitHub Pages can't host one, and every new item must be checked against Toronto's rules before players see it.

Process:
1. Edit `data/items.json` (GitHub web editor is fine) on a branch.
2. Run `node scripts/validate.mjs`.
3. Open a pull request. The template asks for Waste Wizard results for each new item.
4. A GitHub Action runs the validator on every PR. A teammate reviews and merges. GitHub Pages redeploys automatically.

`scripts/validate.mjs` fails on: unknown bins/actions/levels/state flags, duplicate or badly formatted ids, missing or empty `reason`, `exitStep` that isn't an exit or doesn't match `bin` (unless `exception: true`), and steps that don't match the start state (e.g. liquid but no `pour`). It warns on `verified: false` and levels with fewer than 10 items.

### 8.2 Data source is swappable (future API)
All loading goes through one function: `loadGameData(url)` in `js/data.js`.
- Default URL: `data/items.json`.
- Override: if the host sets `window.SortRight = { dataUrl: '<url>' }` before the game loads, use that URL instead.
- The response must match the `items.json` schema exactly, and is validated in the browser with the same rules (errors logged to console; invalid items skipped, not crashing the game).
- If the remote URL fails, fall back to the bundled `data/items.json`.

This makes `items.json`'s schema the contract with the partner: later, their backend can serve the same JSON (e.g. per city, or updated without an app release) with no game code changes.

## 9. Technical constraints
- Plain HTML, CSS and JavaScript (ES modules). **No framework, no build step, no npm dependencies at runtime.**
- Load data with `fetch('data/items.json')`.
- Graphics: simple inline SVG drawn in code. No copyrighted images, characters or logos.
- Local storage only for progress (wrap in try/catch; game must work if storage is unavailable).
- No network calls besides loading the site's own files. No analytics SDKs.
- Respect `prefers-reduced-motion` (replace animations with instant state changes).

## 10. Partner-app readiness
The prototype should drop into a mobile app WebView later with minimal changes:
- Fully self-contained static files, relative paths only.
- Item data can come from the partner's own endpoint via `window.SortRight.dataUrl` (section 8.2).
- Theme through CSS custom properties in one place (`css/theme.css`) so the partner can reskin it.
- Safe-area insets respected (`env(safe-area-inset-*)`).
- An optional event hook so the host app can listen to game events without changing game code:
  `window.SortRight?.onEvent?.({ type: 'item_result', itemId, correct, bin, ms })`
  Events: `level_start`, `item_result`, `level_end`. No personal data in events.
- No pop-ups, `alert()` or new windows.

## 11. Accessibility
- All drag interactions have button/keyboard alternatives.
- Text contrast ≥ 4.5:1; bins are distinguishable by label and icon, not color alone.
- Minimum touch target 44×44 px.
- Screen-reader labels for items, bins and results (`aria-live="polite"` for feedback).

## 12. Milestones
Assumed deadline: about Dec 7, 2026 (three weeks from Nov 16). Adjust as needed.

| # | Due | Deliverable |
|---|---|---|
| 1 | Nov 29 | Project skeleton, `loadGameData` with URL override + fallback + in-browser validation, Quick Sort mode working for all 40 items |
| 2 | Dec 2 | Prep & Sort with **pour** and **lid**, contamination splash, scoring |
| 3 | Dec 4 | Ask the Questions mode, scrape + rinse (or fallbacks), level unlocks |
| 4 | Dec 6 | Polish, accessibility pass, mobile testing, deploy to GitHub Pages, pilot |

## 13. Open questions
- Exact deadline and pilot location.
- Does the partner app need a specific WebView API or event format?
- Should rules be re-checked against Toronto's Waste Wizard before the pilot? (Recommended: yes, check every item.)