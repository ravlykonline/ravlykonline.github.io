# RAVLYK v4 Technical Guide

This document is the primary technical onboarding for this repository.
If you are an AI agent or a developer joining the project, start here.

Last updated: 2026-03-06

## 1. Project purpose

RAVLYK is a browser-based educational programming language (Ukrainian syntax) for kids.
Main goals:
- simple text commands with instant visual feedback (turtle-like graphics),
- predictable execution and friendly errors,
- educational progression: basics -> loops -> variables/functions -> conditions -> interactive game mode.

## 2. Tech stack and runtime model

- Frontend only, static site (HTML/CSS/JS modules).
- No backend.
- Canvas 2D rendering.
- Interpreter model:
  1. Tokenizer
  2. Parser -> AST
  3. Interpreter (runtime)
  4. Renderer (canvas + sprite)

Core modules:
- `js/modules/ravlykParser.js`
- `js/modules/environment.js`
- `js/modules/ravlykInterpreter.js`
- `js/modules/ui.js`
- `js/modules/constants.js`
- `js/modules/share.js`
- `js/modules/workspaceTabs.js`
- `js/modules/editorUi.js`
- `js/modules/gridOverlay.js`
- `js/modules/executionController.js`
- `js/modules/fileActionsController.js`
- `js/modules/navigationPrefetch.js`
- `js/modules/modalController.js`
- `js/modules/editorInputController.js`
- `js/modules/lifecycleController.js`
- `js/main.js`

## 3. Repository map (v4)

- `index.html`: main editor page.
- `manual.html`: full language manual.
- `lessons.html`: tutorial lessons.
- `resources.html`: additional resources.
- `quiz.html`: quiz page with random question selection by topic.
- `teacher_guidelines.html`: teacher-oriented pedagogical page.
- `advice_for_parents.html`: parent-oriented pedagogical page.
- `css/`: page styles (`global.css`, `main-editor.css`, `manual.css`, `lessons.css`, `resources.css`, `accessibility.css`).
- `css/quiz.css`: quiz page styles.
- `css/teacher-guidelines.css`: teacher page styles.
- `css/parents.css`: parents page styles.
- `js/main.js`: main page orchestration and event wiring.
- `js/modules/share.js`: share-link/hash encoding + clipboard helpers for editor code sharing.
- `js/modules/workspaceTabs.js`: command/workspace tabs setup and keyboard navigation wiring.
- `js/modules/editorUi.js`: editor decorations (line numbers/active+error lines) and friendly error formatting helpers.
- `js/modules/gridOverlay.js`: grid overlay drawing, persistence, and toolbar grid button state.
- `js/modules/executionController.js`: run/stop execution orchestration, execution timeout handling, and stop-confirm pause/resume flow.
- `js/modules/fileActionsController.js`: save image/code actions, share-link flow, and code loading from URL hash.
- `js/modules/navigationPrefetch.js`: secondary-page prefetch scheduling and safe `_blank` navigation helper.
- `js/modules/modalController.js`: modal button wiring, Escape-key flow, and overlay-close orchestration.
- `js/modules/editorInputController.js`: editor/example input wiring (hotkeys, indentation, listener setup, placeholder behavior).
- `js/modules/lifecycleController.js`: startup bootstrap, resize wiring, and initial runtime/UI synchronization.
- `js/accessibility.js`: accessibility toggles, persistence, focus behavior.
- `js/common.js`: shared page navigation helpers.
- `js/quizBank.js`: quiz question banks (30 per topic).
- `js/quizPage.js`: quiz runtime (topic picker, random 10 questions, option shuffle, scoring).
- `tests/parser.test.js`: parser/interpreter logic tests.
- `tests/ui.test.js`: UI utility tests.
- `tests/encoding.test.js`: UTF-8/mojibake and static regression guards (HTML link safety, toolbar/download contract, modal ARIA contract, CSS legacy cleanup constraints, modal/message architecture guards, modal mapping guards, JS `_blank` window.open safety).
- `tests/e2e/*`: Playwright smoke tests.
- `playwright.config.js`: E2E config (desktop + mobile + tablet).

## 4. Language model and grammar (implemented)

### 4.1 Statements

Implemented AST statement types:
- `MoveStmt` (`вперед`, `назад`)
- `TurnStmt` (`праворуч`, `ліворуч`)
- `ColorStmt` (`колір`)
- `GotoStmt` (`перейти в X Y`)
- `PenStmt` (`підняти`, `опустити`)
- `ClearStmt` (`очистити`)
- `AssignmentStmt` (`створити x = ...` and `x = ...`)
- `RepeatStmt` (`повторити N ( ... )`)
- `IfStmt` (`якщо ... ( ... ) [інакше ( ... )]`)
- `FunctionDefStmt` (`створити name(params) ( ... )`)
- `FunctionCallStmt` (`name(args)`)
- `GameStmt` (`грати ( ... )`)

### 4.2 Conditions

Implemented condition node types:
- `EdgeCondition` (`край`)
- `KeyCondition` (`клавіша "..."`)
- `CompareCondition` (`expr comparator expr`, comparators: `= != < > <= >=`)

### 4.3 Expressions

Implemented expression node types:
- `NumberLiteral`
- `Identifier`
- `UnaryExpr` (`+x`, `-x`)
- `BinaryExpr` (`+ - * / %`)

Operator precedence:
- high: `* / %`
- low: `+ -`

## 5. Parser design (`ravlykParser.js`)

### 5.1 Tokenization

`tokenizeWithMetadata()`:
- strips comments (`# ...`),
- keeps quoted strings (`"..."`) as single tokens,
- supports multi-char comparators (`>= <= !=`),
- records token source metadata (`line`, `column`, token text).

### 5.2 AST parsing

`parseCodeToAst()` is the main entry for raw code.
`parseTokensToAst()` handles statement parsing and span assignment.

Important:
- legacy parser path `parseTokens()` is intentionally removed and throws `LEGACY_PARSE_PATH_REMOVED`.
- parser does not execute runtime logic.

### 5.3 Error location

Parser attaches location to `RavlykError` (`line`, `column`, `token`) via token metadata and AST spans.

## 6. Runtime environment (`environment.js`)

`Environment` is hierarchical (`parent` chain).
Methods:
- `get(name)` with parent lookup, throws `UNDEFINED_VARIABLE`,
- `define(name, value)`,
- `set(name, value)`,
- `clone()` for branch-local evaluation contexts.

## 7. Interpreter design (`ravlykInterpreter.js`)

## 7.1 Global flow

`executeCommands(code)`:
1. parse code to AST,
2. validate `грати` contract,
3. if game AST exists -> `executeGameProgram()`,
4. else -> AST to runtime queue (`astToLegacyQueue`) and run queue (`runCommandQueue()`).

### 7.2 Queue command model (non-game path)

Queue command types include:
- `MOVE`, `MOVE_BACK`, `TURN`, `TURN_LEFT`,
- `COLOR`, `GOTO`, `PEN_UP`, `PEN_DOWN`, `CLEAR`,
- `ASSIGN_AST`,
- `IF` (with runtime-evaluated condition),
- `REPEAT` (legacy format support kept for compatibility).

Important architectural point:
- `CompareCondition` is now carried as runtime payload (`COMPARE_AST`) and evaluated during execution, not precomputed to boolean.

### 7.3 Game mode

`executeGameProgram()`:
- runs with fixed tick interval (`gameTickMs = 50`, 20 TPS),
- uses shared runtime env across ticks,
- executes `GameStmt` body repeatedly,
- evaluates key and edge conditions each tick.

### 7.4 Game contract restrictions

Validated by `validateGameProgramContract()`:
- max one top-level `грати` block,
- no nested `грати`,
- if `грати` is present, only specific top-level statements are allowed (assignments and function defs besides `GameStmt`).

### 7.5 Input handling and cleanup

Interpreter constructor registers keyboard listeners.
`destroy()` removes listeners and clears timers/animation refs.
`main.js` ensures old interpreter instances are destroyed before new ones.

### 7.6 Boundary handling

Key methods:
- `getBoundaryMargin()`
- `clampToCanvasBounds(x, y)`
- `isAtCanvasEdge()`

Behavior:
- movement and goto are clamped to visible canvas bounds,
- friendly out-of-bounds info message shown once per stuck sequence.

### 7.7 Constants hygiene

- Removed dead UI constants (`HELP_MODAL_CONTENT_ID`, `CLEAR_CONFIRM_MODAL_ID`) that were not referenced by runtime code.

## 8. UI architecture

## 8.1 Main page (`index.html` + `js/main.js`)

Responsibilities:
- toolbar actions (run/stop/clear/download/share/grid/help),
- current short labels: `Запустити`, `Стоп`, `Скинути`, `Сітка`, `Довідка`, `Завантажити`, `Поділитися`,
- unified download flow: `Завантажити` opens modal with `Завантажити як малюнок` / `Завантажити як код`,
- smart idle prefetch of secondary pages (`manual.html`, `lessons.html`, `quiz.html`, `resources.html`) on good connections (skips `Save-Data` and `2g`),
- editor line numbers and active/error line highlighting,
- help/confirm modals,
- modal open/close behavior is centralized in `js/modules/ui.js` (`toggleModal` + dedicated show/hide wrappers for help/clear/stop/download),
- modal state checks use shared helper `isModalOpen(modalId)` instead of ad-hoc `classList.contains('hidden')` checks in page scripts,
- overlay-click close wiring is centralized via `bindModalOverlayClose(modalId, onClose)` helper,
- external same-site new-tab navigation is centralized in `js/modules/navigationPrefetch.js` via `openInNewTab(url)` with `noopener,noreferrer`,
- code-share hash/clipboard helpers are centralized in `js/modules/share.js` and consumed by `main.js`,
- command reference tabs and workspace tabs wiring are centralized in `js/modules/workspaceTabs.js` and consumed by `main.js`,
- editor decorations and parser/runtime error-to-editor mapping are centralized in `js/modules/editorUi.js` and consumed by `main.js`,
- grid overlay persistence/drawing is centralized in `js/modules/gridOverlay.js` and consumed by `main.js`,
- execution run/timeout/toolbar-locking and stop-confirm behavior are centralized in `js/modules/executionController.js` and consumed by `main.js`,
- save/share/hash-load file actions are centralized in `js/modules/fileActionsController.js` and consumed by `main.js`,
- secondary-page idle prefetch scheduling is centralized in `js/modules/navigationPrefetch.js` and consumed by `main.js`,
- modal interactions (Escape/open-close behavior/overlay-close wiring) are centralized in `js/modules/modalController.js` and consumed by `main.js`,
- editor/example keyboard and input listener wiring is centralized in `js/modules/editorInputController.js` and consumed by `main.js`,
- initial setup/resize lifecycle wiring is centralized in `js/modules/lifecycleController.js` and consumed by `main.js`,
- `js/common.js` also uses centralized `openInNewTab(url)` helper for its `_blank` navigations,
- Escape-key modal flow in `main.js` is grouped in dedicated `handleEscapeKey` handler to keep keyboard behavior maintainable,
- examples launcher,
- command reference tabs,
- workspace tabs (`Редактор` / `Полотно`) on small and medium screens,
- state synchronization with interpreter.

### 8.2 Mobile behavior (current)

Implemented responsive behavior:
- compact toolbar on small screens,
- icon-only toolbar labels on phone widths,
- workspace tab switching for editor/canvas up to tablet width,
- command category tabs in the reference block are arranged as a balanced 2x2 grid on phones,
- optimized examples block:
  - tablet: compact grid,
  - phone: horizontal scroll cards,
  - visible swipe hint text is shown above examples on phones.

## 8.3 Manual page mobile TOC

`manual.html` + `manual.css` now include:
- mobile TOC toggle button,
- slide-in TOC panel,
- backdrop overlay,
- close on `Esc` and link click,
- desktop docs-like fixed sidebar for wide screens.

## 9. Accessibility subsystem

`js/accessibility.js` + `css/accessibility.css` provide:
- high contrast,
- larger text,
- reduced animations,
- simpler font,
- increased spacing.

Behavior:
- settings persisted in `localStorage` (`ravlyk_accessibility_settings_v2`),
- accessibility panel focus trap,
- keyboard close (`Esc`),
- visual focus styles via `:focus-visible` and global focus ring variables.

## 10. Limits and safety guards (`constants.js`)

Current key limits:
- `MAX_RECURSION_DEPTH = 20`
- `MAX_REPEATS_IN_LOOP = 500`
- `EXECUTION_TIMEOUT_MS = 180000`
- `MAX_CODE_LENGTH_CHARS = 10000`

The parser/interpreter use friendly user-facing errors from `ERROR_MESSAGES`.

## 11. Testing strategy

### 11.1 Unit/logic tests

- `tests/parser.test.js`: tokenization, AST, expressions, conditions, queue adaptation, limits, error behavior.
- `tests/ui.test.js`: canvas resize and viewport alignment logic, modal helper unit checks (`isModalOpen`, `bindModalOverlayClose`), modal show/hide focus-contract checks (help/download), editor UI controller checks (line decorations + friendly error formatting contract), grid overlay controller checks (storage init, visibility toggle, draw/hide contract), execution controller checks (toolbar state lock/unlock + stop-confirm pause/resume contract), file actions controller checks (share guard + hash-load callback contract), navigation/prefetch controller checks (`noopener,noreferrer` + idle prefetch link scheduling contract), modal controller checks (clear-confirm gating contract), editor input controller checks (Tab indent + run hotkey contract), and lifecycle controller checks (startup + resize fallback contract).
- `tests/encoding.test.js`: UTF-8 integrity checks (`U+FFFD` + key Ukrainian snippets), repository policy checks for `.editorconfig`/`.gitattributes`, UTF-8 BOM guards for selected critical text files (with explicit legacy allowlist), external-link safety assertions for `_blank`, unified toolbar/download regression guards, modal ARIA contract checks, CSS legacy-cleanup guards, modal/message architecture guards, modal overlay->content mapping checks, and JS `window.open(..., '_blank', 'noopener,noreferrer')` safety guards.

## 11.3 Encoding and line-ending policy

- `.editorconfig` is the source of truth for editor defaults (`utf-8`, `lf`, final newline, trim trailing whitespace).
- `.gitattributes` enforces repository normalization (`* text=auto eol=lf`) and marks binary assets as binary.
- The runtime remains static-site only; these are repository hygiene controls and do not add build/runtime dependencies.

### 11.2 E2E smoke tests (Playwright)

`tests/e2e/index.smoke.spec.js` covers:
- help modal (`Esc`, focus return),
- accessibility panel (focus containment + persistence),
- arrow-key scroll blocking in `грати`,
- smoke execution via example block + stop,
- stop-confirm modal keyboard flow (`Esc` opens while executing, second `Esc` closes and resumes),
- download modal interactions (`Esc`, focus return),
- download exports (PNG drawing + TXT code),
- workspace switching keeps canvas content (tabbed mobile/tablet and non-tabbed desktop path).

Projects in `playwright.config.js`:
- `chromium` (desktop),
- `mobile-chrome` (phone viewport),
- `tablet-chrome` (tablet viewport).

## 12. CI

Workflow:
- `../.github/workflows/e2e-ui.yml` (repo root).

Runs on push/PR affecting `version_4/**`:
- `npm ci`
- `npx playwright install --with-deps chromium`
- `npm run test:unit`
- `npm run test:e2e`
- uploads Playwright artifacts on failure.

## 13. Local developer commands

From `version_4`:
- `npm install`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:e2e:headed`
- `npm run test:e2e:ui`

Parser/UI unit tests:
- `node --experimental-default-type=module tests/parser.test.js`
- `node --experimental-default-type=module tests/ui.test.js`
- `node --experimental-default-type=module tests/encoding.test.js`

## 14. Known technical debt / open points

1. CSS complexity
- styles are spread across multiple files with partial overlaps; refactoring into clearer design tokens/components is still desirable.
- note: unused legacy modal selectors (`.modal-overlay__*`) were removed from editor/global styles; continue removing dead selectors incrementally.
- note: duplicate global utility/modal declarations were reduced (single `.hidden`, simplified high-contrast modal override).
- note: modal typography overrides were deduplicated by removing redundant editor-level `.modal-content` rules and relying on global modal styles.
- note: legacy accessibility message classes (`.error-message-global`/`.success-message-global`) were removed; global `#global-message-display` styles are the single source for runtime toasts.
- note: high-contrast modal CSS in `accessibility.css` was simplified to canonical `.a11y-high-contrast .modal-content` selectors (removed redundant modal id/overlay variants).
- note: redundant early high-contrast link/button color rules were removed where later hardening selectors already provide the canonical `!important` behavior.
- note: unused high-contrast CSS variables (`--link-color`, `--link-hover-color`, `--btn-*-bg` except primary usage) were removed; remaining `.btn-primary` color is defined directly.

2. Mixed execution model history
- despite parser cleanup, non-game mode still uses queue adaptation for compatibility with existing runtime structure.

3. Documentation drift risk
- this file should be updated whenever grammar, command contracts, or responsive behavior changes.

## 15. Change checklist for contributors

When adding a language feature:
1. update parser AST generation,
2. update runtime execution path (queue/runtime or direct AST path),
3. add/extend friendly errors in `constants.js`,
4. add parser/unit tests,
5. add/update E2E smoke if UI/interaction changes,
6. update this document and user docs (`manual.html`, `lessons.html`).

## 16. Single-source principle

For technical orientation, prefer this file over `README.md` if there is mismatch.
`README.md` can stay short/public-facing; this guide is the detailed engineering source.
