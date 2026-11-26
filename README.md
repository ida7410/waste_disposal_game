# SortRight (prototype)

A web game that teaches Toronto waste sorting by acting out the real steps: pour it out, scrape it, put the lid on, then pick the bin.

- `SPEC.md`: what to build
- `AGENTS.md`: how to build it (for people and AI coding agents)
- `data/items.json`: all items, bins, sorting questions and answers

## Run locally
```
python3 -m http.server 8000
```
Then open http://localhost:8000. (Opening `index.html` directly won't load the JSON.)

## Deploy
Push to GitHub, then Settings → Pages → deploy from the `main` branch, root folder.

## Adding or editing items
All answers live in `data/items.json`. Rules were checked on 2026-11-26 against City of Toronto and Circular Materials guidance.

1. Look the item up in Toronto's Waste Wizard (toronto.ca/WasteWizard).
2. Add it to `data/items.json` on a new branch (GitHub's web editor works).
3. Run `node scripts/validate.mjs` (or let GitHub run it on your pull request).
4. Open a pull request, fill in the checklist, and have a teammate review it.

Merging to `main` updates the live site.

Item fields: `id` (lowercase-with-dashes), `name`, `level` (1-4), `bin`, `exitStep` (which flow question sends it to its bin), `reason` (one sentence), `start` (e.g. `{"liquid": true}`), `steps` (e.g. `["pour", "lid"]`). See SPEC.md section 8.

## Using a different data source
A host app can serve the same JSON from its own server by setting `window.SortRight = { dataUrl: "https://..." }` before the game loads. If that URL fails, the game uses the bundled file.