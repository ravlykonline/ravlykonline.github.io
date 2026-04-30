# AGENTS — Instructions for Codex, Claude Code, and other AI coding agents

This file is mandatory reading before editing the project.

You are working on **Пригоди Равлика**, a small static educational PWA game published at:

```text
https://ravlyk.org/go
```

The owner wants a **soft technical refactor**, not a redesign and not a platform rewrite.

## Product Constraints

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

Use relative paths compatible with `/go`.

## Current State

- `index.html` loads one module entrypoint: `<script type="module" src="./js/main.js"></script>`.
- The old root-level classic script chain has been removed from `index.html`.
- The old root-level classic JS files were deleted:
  - `js/levels.js`
  - `js/texts.uk.js`
  - `js/gameState.js`
  - `js/renderDrag.js`
  - `js/renderSnail.js`
  - `js/render.js`
  - `js/engineRoute.js`
  - `js/engine.js`
  - `js/uiAudio.js`
  - `js/uiModals.js`
  - `js/ui.js`
- Current runtime code is split across ES modules under `js/core`, `js/state`, `js/engine`, `js/ui`, `js/features`, and `js/app`.
- `js/app/legacy*.js` is a temporary compatibility layer. It keeps the current behavior stable while the remaining old runtime contract is dismantled.
- `window.SnailGame` may still exist as temporary compatibility glue, but new code should not add new global state or new dependencies on it.
- `sw.js` caches the current module files and assets, not the deleted classic files.

Current tests run with:

```bash
npm test
```

Keep this command working.

## Current Structure

```text
/
  index.html
  manifest.json
  offline.html
  sw.js

  assets/
  css/

  js/
    main.js
    main.module.js

    app/
      composition.js
      legacy*.js

    core/
      config.js
      constants.js
      levels.js
      texts.uk.js

    engine/
      levelRules.js
      route.js
      simulator.js
      validation.js

    features/
      audio.js
      confetti.js
      pwaRegister.js
      speech.js

    state/
      gameState.js
      sessionStore.js

    ui/
      assets.js
      dom.js
      focus.js
      modals.js
      renderBoard.js
      renderLevelMap.js
      renderPalette.js
      renderProgress.js

  tests/
```

## Target Direction

Continue reducing `js/app/legacy*.js` until the app can run through explicit module imports and plain function calls only.

The final direction is:

- `js/main.js` and `js/main.module.js` initialize the app;
- `js/core/*` owns static data, constants, and config;
- `js/state/*` owns state and `sessionStorage`;
- `js/engine/*` owns pure gameplay simulation and validation;
- `js/ui/*` owns DOM rendering and interaction;
- `js/features/*` owns optional browser features;
- no app state depends on `window.SnailGame`.

Do not bring back the deleted root-level classic files.

## Required Behavior

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

Preserve **“Почати гру спочатку”**:

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
- Bump `STATIC_CACHE` when changing cached files.

## Module Responsibilities

### `js/main.js`

Allowed:

- import the module runtime;
- start the app.

Avoid:

- UI rendering code;
- route simulation logic;
- storage implementation details;
- hardcoded level data.

### `js/main.module.js`

Allowed:

- compose modules;
- initialize app;
- call PWA registration;
- hold only temporary compatibility wiring that is being actively reduced.

Avoid:

- growing the compatibility layer;
- adding new global contracts.

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

### `js/core/texts.uk.js`

Must export Ukrainian UI text constants:

```js
export const textsUk = {...};
```

Do not hardcode repeated UI text across modules.

### `js/state/sessionStore.js`

The only allowed file to access `window.sessionStorage`.

Requirements:

- fail safely if storage is unavailable;
- ignore invalid JSON;
- ignore invalid schema;
- never throw during normal gameplay;
- never use `localStorage`.

### `js/state/gameState.js`

Owns app state and state transitions. Keep this module independent from DOM.

### `js/engine/*`

Engine modules must stay pure:

- no DOM;
- no audio;
- no storage;
- no global app state.

Simulation failures may include:

```text
missing-arrow
blocked
out-of-board
loop
wrong-turn
max-steps
```

### `js/ui/*`

UI modules may access DOM, but should not implement route simulation or storage internals.

Expected responsibilities:

- `dom.js` — collect DOM refs;
- `renderBoard.js` — board rendering;
- `renderPalette.js` — arrow palette;
- `renderLevelMap.js` — level map;
- `renderProgress.js` — progress text/bar/ARIA;
- `modals.js` — modal dialogs;
- `focus.js` — focus trap and keyboard support.

### `js/features/*`

Feature modules:

- `audio.js` — sound effects;
- `speech.js` — task narration;
- `confetti.js` — success animation;
- `pwaRegister.js` — service worker registration.

Each feature must degrade gracefully if unsupported.

## Security Rules

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

## Accessibility Rules

Preserve or improve:

- keyboard navigation;
- visible focus;
- skip link;
- modal focus trap;
- `aria-live` status messages;
- touch-friendly target sizes;
- `prefers-reduced-motion` support.

Important:

- `aria-valuenow` must be updated on the element that has `role="progressbar"`, not on a child fill element.
- Destructive actions must have explicit cancel buttons, not only an `×` close button.

## Path Rules For `/go`

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

## Next Refactor Sequence

Move step by step. Do not attempt a massive rewrite.

1. Keep `npm test` green before and after meaningful changes.
2. Split remaining UI behavior out of `js/app/legacyUi.js` into focused `js/ui/*` modules.
3. Split remaining engine/runtime behavior out of `js/app/legacyEngine.js` and `js/app/legacyState.js`.
4. Replace temporary `window.SnailGame` wiring with explicit imports and dependency passing.
5. Delete `js/app/legacy*.js` only after the module contracts no longer need them.
6. Update `sw.js` and tests whenever files move.
7. Re-check browser smoke and offline behavior after PWA-affecting changes.

## Testing Requirements

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

## Coding Style

- Use plain JavaScript ES modules.
- Use `const` by default, `let` only when reassignment is needed.
- Prefer pure functions for domain logic.
- Prefer small modules with clear responsibility.
- Avoid hidden global state.
- Avoid broad mutation.
- Keep comments useful and concise.
- UI text should be in Ukrainian.
- Technical comments may be in English if clearer.

## DOM Rules

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

## UX Preservation Rules

The owner explicitly wants the current visual appearance to remain mostly unchanged.

Allowed changes:

- bug fixes;
- accessibility fixes;
- code-driven layout stability fixes;
- mobile/touch fixes;
- preserving or improving “Почати гру спочатку”;
- small wording improvements.

Not allowed without explicit approval:

- redesigning the main screen;
- replacing the visual style;
- changing game mechanics;
- hiding the level map;
- locking levels;
- changing from 20 levels;
- changing the target audience.

## Required Final Checks Before Handing Off

Before finishing a refactor task, verify:

- [ ] `npm test` passes.
- [ ] `index.html` uses `type="module"`.
- [ ] No deleted classic root JS files were reintroduced.
- [ ] No new dependency on `window.SnailGame` was added.
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

## If Unsure

When in doubt, choose the simpler option that preserves:

1. static hosting;
2. no dependencies;
3. child privacy;
4. current UX;
5. ES module clarity;
6. GitHub Pages compatibility.

Do not introduce architecture that is larger than the game.
