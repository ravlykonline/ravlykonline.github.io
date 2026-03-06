# RAVLYK v4 Technical Guide

This document is the primary technical onboarding for this repository.
If you are an AI agent or a developer joining the project, start here.

Last updated: 2026-03-05

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
- `js/accessibility.js`: accessibility toggles, persistence, focus behavior.
- `js/common.js`: shared page navigation helpers.
- `js/quizBank.js`: quiz question banks (30 per topic).
- `js/quizPage.js`: quiz runtime (topic picker, random 10 questions, option shuffle, scoring).
- `tests/parser.test.js`: parser/interpreter logic tests.
- `tests/ui.test.js`: UI utility tests.
- `tests/encoding.test.js`: UTF-8/mojibake guard checks for key files and UI strings.
- `tests/encoding.test.js`: UTF-8/mojibake guard checks plus static HTML safety checks for `target="_blank"` (`rel="noopener noreferrer"`).
- `tests/encoding.test.js`: UTF-8/mojibake guard checks plus static safety checks for external links and toolbar structure (`#download-btn` only, no legacy save buttons).
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

## 8. UI architecture

## 8.1 Main page (`index.html` + `js/main.js`)

Responsibilities:
- toolbar actions (run/stop/clear/download/share/grid/help),
- current short labels: `Запустити`, `Стоп`, `Скинути`, `Сітка`, `Довідка`, `Завантажити`, `Поділитися`,
- unified download flow: `Завантажити` opens modal with `Завантажити як малюнок` / `Завантажити як код`,
- smart idle prefetch of secondary pages (`manual.html`, `lessons.html`, `quiz.html`, `resources.html`) on good connections (skips `Save-Data` and `2g`),
- editor line numbers and active/error line highlighting,
- help/confirm modals,
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
- `tests/ui.test.js`: canvas resize and viewport alignment logic.
- `tests/encoding.test.js`: UTF-8 integrity checks (`U+FFFD` guard + required Ukrainian UI snippets), external-link safety assertions for `_blank` links, and toolbar regression guard for unified download flow.

### 11.2 E2E smoke tests (Playwright)

`tests/e2e/index.smoke.spec.js` covers:
- help modal (`Esc`, focus return),
- accessibility panel (focus containment + persistence),
- arrow-key scroll blocking in `грати`,
- smoke execution via example block + stop,
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
