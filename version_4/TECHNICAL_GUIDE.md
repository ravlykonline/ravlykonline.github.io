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
- toolbar actions (run/stop/clear/save/help) in the current committed template,
- smart idle prefetch of secondary pages (`manual.html`, `lessons.html`, `quiz.html`, `resources.html`) on good connections (skips `Save-Data` and `2g`),
- active/error line highlighting in editor overlays,
- help/confirm modals,
- examples launcher,
- examples navigation controls (`Назад` / `Далі`) plus keyboard focus navigation (`ArrowLeft`/`ArrowRight`),
- command indicator with progress format (`[current/total] command`) during queue execution,
- internal navigation buttons use same-tab transitions (`window.location.assign`) instead of forcing new tabs,
- state synchronization with interpreter.

### 8.2 Mobile behavior (current)

Implemented responsive behavior:
- compact single-page layout (current base template has no required workspace-tab split),
- examples support horizontal scroll behavior on narrow screens,
- visible swipe hint text and explicit previous/next controls on examples block,
- keyboard-safe examples interaction (Enter/Space run; ArrowLeft/ArrowRight move focus).

### 8.3 UX message pattern (unified)

Global runtime messages (`success`, `info`, `error`) are standardized through one render + style pattern:
- single container `#global-message-display` with typed modifier class (`message-success-global`, `message-info-global`, `message-error-global`),
- unified internal structure: icon + message meta (`title`) + message body + close button,
- semantic live announcements (`role=status|alert`, `aria-live=polite|assertive`, `aria-atomic=true`),
- common layout/spacing/interaction; type difference is only accent token (`--message-accent`) and type background,
- close-button hover also derives from the same accent token for visual consistency.

Implementation references:
- `js/modules/ui.js` (`showMessage()` markup/ARIA contract),
- `css/global.css` (shared message geometry + tokenized accent styling).
## 8.4 Manual page mobile TOC

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

### 11.2 E2E smoke tests (Playwright)

`tests/e2e/index.smoke.spec.js` covers:
- help modal (`Esc`, focus return),
- accessibility panel (focus containment + persistence),
- arrow-key scroll blocking in `РіСЂР°С‚Рё`,
- smoke execution via game code run/stop path,
- global UX-message contract (`success/info/error` classes, ARIA semantics, dismiss action),
- mobile/tablet workspace-tab canvas-preservation check is conditional and skipped when workspace tabs are absent in the active `index.html` template.

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

## 14. Known technical debt / open points

1. CSS complexity
- styles are spread across multiple files with partial overlaps; token extraction is now applied across `global.css`, `main-editor.css`, `lessons.css`, and `resources.css`, modal `help-content` base styling is centralized in `global.css`, `resources.css` duplicate base blocks were removed, and unused legacy modal utility selectors in `global.css` were deleted; broader component-level consolidation is still needed.

2. Mixed execution model history
- decision (2026-03-05): keep `queue` as the production-stable default non-game execution mode; `ast_experimental` is a validated migration candidate (direct AST path for non-animated and animated execution, with queue fallback in environments without RAF). Default switch should be done only in a dedicated rollout step with rollback option.

3. Documentation drift risk
- this file should be updated whenever grammar, command contracts, or responsive behavior changes.

4. Template/code feature skew
- legacy command/workspace tab compatibility branches were removed from `main.js` to match the current simplified `index.html` layout; keep E2E assertions aligned with the active template.

5. UX message styles cleanup
- message styles are unified, duplicate type-specific rules were reduced, and `!important` usage in the message block (including container positioning layer) was partially reduced; selector specificity for the global message contract was also simplified (`#global-message-display`-based), and remaining cleanup is mostly outside the unified contract.

## 15. Audit recommendations status (as of 2026-03-05)

Implemented:
- safer same-tab navigation for internal links (no forced new tabs),
- examples UX improvements (prev/next controls, swipe hint, keyboard flow),
- command indicator progress (`[current/total]`),
- contrast hardening for critical controls,
- unified runtime UX-message pattern (`success/info/error`) with shared semantics and visual structure,
- unified button/container base styling across pages (`.btn`/`.main-btn` compatibility and shared nav container layout),
- modal styling consolidation in `global.css` (shared help-modal list styling + explicit `.btn-secondary` variant for modal actions),
- stop-confirmation modal alignment: restored `index.html` stop modal markup expected by `main.js` (`#stop-confirm-modal-overlay`, `#confirm-stop-btn`, `#cancel-stop-btn`) to avoid run-pause dead-end on Stop action,
- modal wiring cleanup in `ui.js`: replaced hardcoded modal-id mapping with a deterministic `-overlay -> -content` rule for lower maintenance risk when adding future modals,
- `main.js` modal handling cleanup: cached modal overlay references and added null-safe `Escape` checks to avoid runtime errors if a modal block is temporarily absent in template variants,
- `main.js` modal flow cleanup: deduplicated overlay-open checks and backdrop-dismiss wiring via small helpers (`isOverlayOpen`, `bindOverlayDismiss`) to reduce event-flow maintenance risk,
- E2E coverage extended for stop-flow UX: `Escape` during active execution now has explicit smoke coverage to guarantee stop-confirm modal behavior across desktop/mobile/tablet,
- E2E modal keyboard coverage expanded: clear/stop confirmation modals now have explicit `Escape` close + focus-return smoke assertions,
- interpreter boundary prep: extracted `prepareNonGameProgramExecution(programAst)` in `ravlykInterpreter.js` as explicit non-game AST->queue adapter step (behavior preserved, migration surface clarified),
- interpreter dispatch boundary prep: extracted `executeProgramAst(programAst)` to make game-vs-non-game execution routing explicit and unit-covered for both paths,
- interpreter lifecycle cleanup: simplified `executeCommands()` error/finalization flow (single `finally` reset path) and added unit coverage that `isExecuting` resets after parse failures,
- interpreter dispatch prep (phase 2): introduced `shouldExecuteGameProgram(programAst)` as explicit game-path decision hook and covered it with unit tests for game/non-game AST detection,
- interpreter dispatch prep (phase 3): extracted `executeNonGameProgramAst(programAst)` and covered `executeProgramAst` delegation into this non-game hook for safer future queue-to-AST migration,
- interpreter dispatch prep (phase 4): extracted `hasGameStatementInBody(body)` helper and reused it in game-contract validation to reduce repeated ad-hoc wrappers,
- interpreter dispatch prep (phase 5): introduced explicit non-game execution mode strategy hook (`getNonGameExecutionMode`, currently `queue`) and queue-path dispatcher (`executeNonGameProgramAstViaQueue`) with unit checks for supported/unsupported modes,
- interpreter dispatch prep (phase 6): added explicit non-game mode setter (`setNonGameExecutionMode`) with validation to make future staged AST-mode rollout configurable without touching main execution flow,
- interpreter dispatch prep (phase 7): `ast_experimental` now executes non-game AST directly when animation is disabled, while preserving safe behavioral parity by falling back to queue path when animation is enabled,
- interpreter dispatch prep (phase 8): direct-AST experimental path now mirrors control-flow essentials (stop pre-check and command-indicator progress updates per AST statement) to reduce runtime-behavior skew against queue mode,
- interpreter dispatch prep (phase 9): direct-AST experimental path now waits correctly in paused state and handles stop-while-paused, improving control-flow parity with queue runtime for non-animated execution,
- interpreter dispatch prep (phase 10): `ast_experimental` now supports animated direct-AST execution (including nested AST control flow) and uses queue fallback only when `requestAnimationFrame` is unavailable,
- interpreter dispatch prep (phase 11): primitive runtime command execution was unified through a shared helper used by both queue runtime and animated direct-AST path, reducing duplication and parity risk during further migration,
- interpreter dispatch prep (phase 12): direct and animated AST statement execution now share one core executor (`executeAstStatementsCore`) with mode-specific primitive handling, reducing duplicated control-flow logic (`Assignment/FunctionCall/Repeat/If`) and lowering maintenance risk,
- accessibility CSS cleanup (phase 13): removed duplicate toggle-focus and obsolete early `a11y-reduce-animations` overrides in `accessibility.css` (later stricter reduce-motion rules remain authoritative), reducing cascade ambiguity without behavior change,
- accessibility CSS cleanup (phase 14): simplified high-contrast modal overlay override in `global.css` to the actual delta (`background`) and removed duplicated base geometry declarations already provided by shared `.modal-overlay` styles,
- accessibility CSS cleanup (phase 15): centralized lessons-page high-contrast refinements in `accessibility.css` and removed the duplicated block from `lessons.css`, establishing a single accessibility source of truth for lesson UI states,
- accessibility CSS cleanup (phase 16): removed duplicated high-contrast declarations in `accessibility.css` by trimming generic block overlap (`tab-button`/`lesson-content`) and deleting redundant header/course/footer color rules already covered by shared text-color selectors,
- accessibility CSS cleanup (phase 17): normalized high-contrast palette literals into dedicated CSS variables (`--hc-*`) and replaced repeated hardcoded values across links/buttons/focus/messages/modals, reducing color-maintenance fragmentation without visual contract changes,
- accessibility CSS cleanup (phase 18): completed high-contrast variable adoption for remaining button/modal/lessons/accessibility-panel declarations (`--bg-color/--text-color/--border-color/--hc-*`), eliminating most hardcoded black/white literals in active a11y styles,
- accessibility regression hardening (phase 19): added Playwright smoke coverage for high-contrast visual contract on index page (button text/border contrast + help-modal high-contrast background/border), so further a11y CSS cleanup is guarded by executable checks,
- accessibility CSS cleanup: removed obsolete legacy message-style block (`.success-message-global/.error-message-global`) and aligned high-contrast a11y-message selectors to `#global-message-display`,
- accessibility CSS cleanup (phase 2): removed duplicated high-contrast button/modal rules that were fully overridden later in the same file, keeping effective behavior unchanged,
- accessibility CSS cleanup (phase 3): narrowed toggle selectors from global `input` to `.toggle-switch input` and removed redundant high-contrast modal ID/button rules already covered by shared selectors,
- accessibility CSS cleanup (phase 4): removed duplicated early high-contrast coverage for `.btn/.accessibility-header/.accessibility-option` and dropped unused `.code-editor` selector (kept `#code-editor`),
- CSS consolidation (phase 5): moved shared `.course-header` base typography/colors to `global.css`; `lessons.css` now keeps only page-specific spacing overrides and `resources.css` uses the shared base directly,
- CSS consolidation (phase 6): unified duplicated page `@keyframes fadeIn` into global `@keyframes section-fade-in-up`, reused by both `lessons.css` and `resources.css`,
- accessibility CSS cleanup (phase 7): removed unused high-contrast CSS custom properties (`--link-*`, `--btn-*`) from `accessibility.css` after selector simplification,
- accessibility CSS cleanup (phase 8): removed dead early high-contrast selectors (`.example-section/.panel/.card`) not present in current templates, while preserving active component coverage,
- regression coverage for current template in unit + Playwright smoke tests.

Partially implemented / in progress:
- technical documentation alignment is ongoing; this guide is updated, but should stay in lockstep after each UI/template change.

Remaining high-value items from audit direction:
- CSS architecture consolidation (component boundaries + gradual removal of remaining legacy overlaps),

## 16. Change checklist for contributors

When adding a language feature:
1. update parser AST generation,
2. update runtime execution path (queue/runtime or direct AST path),
3. add/extend friendly errors in `constants.js`,
4. add parser/unit tests,
5. add/update E2E smoke if UI/interaction changes,
6. update this document and user docs (`manual.html`, `lessons.html`).

## 17. Single-source principle

For technical orientation, prefer this file over `README.md` if there is mismatch.
`README.md` can stay short/public-facing; this guide is the detailed engineering source.
