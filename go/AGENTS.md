# AGENTS — Instructions for Codex, Claude Code, and other AI coding agents

This file is mandatory reading before editing the project.

You are working on **Пригоди Равлика**, a small static educational PWA game published at:

```text
ravlyk.org/go
```

The owner wants a **soft technical refactor**, not a redesign and not a platform rewrite.

---

## Product constraints

The project must remain:

- one standalone game;
- exactly 20 levels;
- all levels open from the start;
- hosted on GitHub Pages;
- static HTML/CSS/JS;
- no backend;
- no registration;
- no cookies;
- no analytics;
- no external CDN;
- no build step;
- no framework;
- no persistent progress after closing the tab.

The game must work at:

```text
https://ravlyk.org/go
```

Use relative paths compatible with `/go`.

---

## Primary refactor goal

Refactor the code from a global-object architecture:

```js
window.SnailGame
```

to native ES modules:

```html
<script type="module" src="./js/main.js"></script>
```

Do not significantly change the UI or gameplay.

---

## Non-goals

Do **not**:

- add React, Vue, Svelte, Angular, Vite, Webpack, Parcel, or any other framework/build tool;
- add TypeScript unless explicitly requested later;
- add npm runtime dependencies;
- add backend/API calls;
- add login, accounts, users, profiles, or teacher dashboard;
- add analytics;
- add cookies;
- add `localStorage`;
- add remote fonts, remote icons, remote images, or CDN assets;
- redesign the game;
- change the visual identity unless needed to fix a bug;
- change the number of levels;
- lock levels behind progression;
- remove offline/PWA support.

---

## Current technical context

Current files include:

```text
index.html
manifest.json
offline.html
sw.js
css/tokens.css
css/base.css
css/game.css
js/main.js
js/levels.js
js/texts.uk.js
js/gameState.js
js/renderDrag.js
js/renderSnail.js
js/render.js
js/engineRoute.js
js/engine.js
js/uiAudio.js
js/uiModals.js
js/ui.js
assets/*
tests/*
```

Current tests run with:

```bash
npm test
```

Keep this command working.

---

## Desired target structure

Refactor toward this structure:

```text
js/
  main.js

  core/
    config.js
    constants.js
    levels.js
    texts.uk.js

  engine/
    simulator.js
    route.js
    validation.js
    levelRules.js

  state/
    sessionStore.js
    gameState.js

  ui/
    dom.js
    renderBoard.js
    renderPalette.js
    renderLevelMap.js
    renderProgress.js
    modals.js
    focus.js

  features/
    audio.js
    speech.js
    confetti.js
    pwaRegister.js
```

This exact structure can be adjusted if needed, but preserve the separation of responsibilities.

---

## Required behavior

### Progress/session behavior

Use `sessionStorage` only.

The game must preserve within the current tab:

- current level;
- arrows placed by the player;
- completed level ids.

After reload in the same tab:

- restore current level;
- restore arrows;
- restore completed level highlighting.

After closing the tab:

- browser clears `sessionStorage`;
- the next visit starts from scratch.

Add or preserve a **“Почати гру спочатку”** action:

- asks for confirmation;
- clears session state;
- returns to level 1;
- clears completed highlights;
- clears placed arrows.

### Level map behavior

- Show all 20 levels.
- Allow jumping to any level at any time.
- Highlight current level.
- Highlight completed levels only within the current session.
- Do not lock levels.

### PWA behavior

- Game works offline after first successful load.
- Service worker must be registered with `./sw.js`.
- Manifest and asset paths must be relative.
- Update `sw.js` app shell when files move.
- Bump cache version when changing cached files.

---

## Module responsibilities

### `js/main.js`

Allowed:

- import modules;
- initialize app;
- wire event handlers;
- trigger first render;
- call PWA registration.

Avoid:

- large UI rendering code;
- route simulation logic;
- storage implementation details;
- hardcoded level data.

---

### `js/core/levels.js`

Must export:

```js
export const levels = [...];
```

Rules:

- exactly 20 levels;
- no DOM access;
- no storage access;
- no global mutation;
- no `window.SnailGame`;
- preserve current level content unless intentionally fixing a bug.

---

### `js/core/texts.uk.js`

Must export Ukrainian UI text constants:

```js
export const textsUk = {...};
```

Do not hardcode repeated UI text across modules.

---

### `js/state/sessionStore.js`

The only allowed file to access `window.sessionStorage`.

Must export something like:

```js
export function loadSession() {}
export function saveSession(payload) {}
export function clearSession() {}
export function isSessionStorageAvailable() {}
```

Requirements:

- fail safely if storage is unavailable;
- ignore invalid JSON;
- ignore invalid schema;
- never throw during normal gameplay;
- never use `localStorage`.

Expected payload:

```js
{
  version: 1,
  currentLevelId: 7,
  arrowsByLevel: {
    "7": {
      "1,2": "right",
      "1,3": "down"
    }
  },
  completedLevelIds: [1, 2, 3]
}
```

---

### `js/state/gameState.js`

Owns app state and state transitions.

Should expose functions such as:

```js
createInitialState(levels, savedSession)
setCurrentLevel(state, levelId)
placeArrow(state, levelId, key, direction)
removeArrow(state, levelId, key)
markLevelComplete(state, levelId)
restartGame(state)
```

Keep this module independent from DOM.

---

### `js/engine/simulator.js`

Pure gameplay simulation.

Input example:

```js
simulateLevel({ level, arrows, config })
```

Output example:

```js
{
  success: true,
  path: [...],
  reason: null
}
```

Failure output example:

```js
{
  success: false,
  path: [...],
  reason: 'missing-arrow'
}
```

Allowed reasons may include:

```js
'missing-arrow'
'blocked'
'out-of-board'
'loop'
'wrong-turn'
'max-steps'
```

Hard rule: engine must not access DOM, audio, storage, or global app state.

---

### `js/engine/validation.js`

Validate levels and optionally game moves.

Minimum checks:

- exactly 20 levels;
- unique ids;
- valid type;
- valid board size;
- valid start/apple coordinates;
- no obstacles on start/apple;
- valid tile ids;
- valid preset arrow coordinates;
- level is solvable.

---

### `js/ui/*`

UI modules may access DOM, but should not implement route simulation or storage internals.

Expected split:

- `dom.js` — collect DOM refs;
- `renderBoard.js` — board rendering;
- `renderPalette.js` — arrow palette;
- `renderLevelMap.js` — level map;
- `renderProgress.js` — progress text/bar/ARIA;
- `modals.js` — modal dialogs;
- `focus.js` — focus trap and keyboard support.

---

### `js/features/*`

Feature modules:

- `audio.js` — sound effects;
- `speech.js` — task narration;
- `confetti.js` — success animation;
- `pwaRegister.js` — service worker registration.

Each feature must degrade gracefully if unsupported.

---

## Security rules

Hard rules:

- no `eval`;
- no `new Function`;
- no `document.write`;
- no `localStorage`;
- no external scripts;
- no external stylesheets;
- no analytics;
- no cookies;
- no user personal data;
- no remote assets.

Prefer:

```js
element.textContent = text;
element.replaceChildren();
document.createElement('div');
```

Avoid:

```js
element.innerHTML = html;
```

If `innerHTML` remains temporarily, it must be limited to safe, non-user-controlled content and covered by tests or a documented whitelist.

---

## Accessibility rules

Preserve or improve:

- keyboard navigation;
- visible focus;
- skip link;
- modal focus trap;
- `aria-live` status messages;
- touch-friendly target sizes;
- `prefers-reduced-motion` support.

Important fix:

- `aria-valuenow` must be updated on the element that has `role="progressbar"`, not on a child fill element.

Destructive actions must have explicit cancel buttons, not only an `×` close button.

---

## Path rules for `/go`

Use relative paths:

```html
<link rel="manifest" href="./manifest.json">
<script type="module" src="./js/main.js"></script>
<img src="./assets/snail.svg" alt="">
```

Use relative service worker registration:

```js
navigator.serviceWorker.register('./sw.js');
```

Do not use root-relative paths:

```text
/js/main.js
/css/game.css
/assets/snail.svg
/sw.js
```

These may break under `/go`.

---

## Refactor sequence

Follow this sequence. Do not attempt a massive rewrite in one step.

### Step 1 — Documentation and tests baseline

- Ensure `npm test` passes before editing.
- Read `README.md`, `ARCHITECTURE.md`, `SECURITY.md`, `LEVELS.md`, `PWA.md`, `PROJECT_STANDARDS.md`.
- Do not change UX.

### Step 2 — Convert data modules

- Convert `js/levels.js` to `js/core/levels.js` with `export const levels`.
- Convert `js/texts.uk.js` to `js/core/texts.uk.js` with `export const textsUk`.
- Preserve content.
- Update tests.

### Step 3 — Extract constants/config

- Create `js/core/constants.js`.
- Create `js/core/config.js`.
- Move tile definitions, directions, config values.
- Keep behavior unchanged.

### Step 4 — Extract storage

- Create `js/state/sessionStore.js`.
- Move all `sessionStorage` access there.
- Add arrows persistence by level.
- Add defensive schema handling.
- Ensure no `localStorage`.

### Step 5 — Extract game state

- Create `js/state/gameState.js`.
- Move state creation and transitions.
- Keep state DOM-free.

### Step 6 — Extract engine

- Create `js/engine/simulator.js`, `route.js`, `levelRules.js`, `validation.js`.
- Make route simulation pure.
- UI should consume simulation result, not drive the domain logic.

### Step 7 — Extract UI modules

- Split rendering into `ui/*` files.
- Keep visual output as close as possible to current output.
- Preserve drag/drop, click/tap, keyboard behavior.

### Step 8 — Update entrypoint

- Update `index.html` to load only:

```html
<script type="module" src="./js/main.js"></script>
```

- Remove old script tags.
- Ensure app initializes correctly.

### Step 9 — PWA update

- Update `sw.js` APP_SHELL for the new files.
- Bump `STATIC_CACHE` version.
- Ensure `manifest.json` uses relative paths compatible with `/go`.
- Ensure service worker registration uses `./sw.js`.

### Step 10 — Test hardening

Add or update tests for:

- exactly 20 levels;
- level validity;
- solvability;
- no external URLs;
- no `localStorage`;
- `sessionStorage` only through `sessionStore.js`;
- no `eval`, `new Function`, `document.write`;
- PWA cached files exist;
- manifest is `/go` compatible;
- no BOM in text files;
- progressbar ARIA.

---

## Testing requirements

Run after every meaningful change:

```bash
npm test
```

If you change the service worker, also manually verify offline behavior.

If tests fail:

1. Do not ignore the failure.
2. Identify whether the test or implementation is wrong.
3. Fix the smallest possible scope.
4. Do not remove tests just to pass.

---

## Coding style

- Use plain JavaScript ES modules.
- Use `const` by default, `let` only when reassignment is needed.
- Prefer pure functions for domain logic.
- Prefer small modules with clear responsibility.
- Avoid hidden global state.
- Avoid broad mutation.
- Keep comments useful and concise.
- UI text should be in Ukrainian.
- Technical comments may be in English if clearer.

---

## DOM rules

Prefer:

```js
const button = document.createElement('button');
button.type = 'button';
button.textContent = 'Запустити';
```

For clearing:

```js
element.replaceChildren();
```

For classes:

```js
element.classList.toggle('is-active', isActive);
```

Avoid:

```js
element.innerHTML = '...';
element.style.cssText = '...';
```

Inline style is allowed only where there is a clear need and no simple CSS-class alternative.

---

## UX preservation rules

The owner explicitly wants the current visual appearance to remain mostly unchanged.

Allowed changes:

- bug fixes;
- accessibility fixes;
- code-driven layout stability fixes;
- mobile/touch fixes;
- adding “Почати гру спочатку”;
- small wording improvements.

Not allowed without explicit approval:

- redesigning the main screen;
- replacing the visual style;
- changing game mechanics;
- hiding the level map;
- locking levels;
- changing from 20 levels;
- changing the target audience.

---

## Required final checks before handing off

Before finishing a refactor task, verify:

- [ ] `npm test` passes.
- [ ] `index.html` uses `type="module"` when module refactor is complete.
- [ ] No `window.SnailGame` application state remains when module refactor is complete.
- [ ] No `localStorage` appears in source files.
- [ ] No external URLs were introduced.
- [ ] Current level persists after reload in the same tab.
- [ ] Placed arrows persist after reload in the same tab.
- [ ] Completed level highlights persist after reload in the same tab.
- [ ] Closing the tab starts fresh on next visit.
- [ ] “Почати гру спочатку” clears session progress and returns to level 1.
- [ ] All 20 levels are open.
- [ ] PWA offline still works.
- [ ] UI did not significantly change.

---

## If unsure

When in doubt, choose the simpler option that preserves:

1. static hosting;
2. no dependencies;
3. child privacy;
4. current UX;
5. ES module clarity;
6. GitHub Pages compatibility.

Do not introduce architecture that is larger than the game.
