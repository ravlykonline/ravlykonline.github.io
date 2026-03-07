# RAVLYK v4 Technical Guide

This document is the primary technical onboarding for this repository.
If you are an AI agent or a developer joining the project, start here.

Last updated: 2026-03-07

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
- `js/modules/interpreterBoundary.js`
- `js/modules/interpreterConditions.js`
- `js/modules/interpreterGameLoop.js`
- `js/modules/interpreterGameAstRunner.js`
- `js/modules/interpreterQueueRuntime.js`
- `js/modules/interpreterCommandExecutor.js`
- `js/modules/interpreterAstQueueAdapter.js`
- `js/modules/interpreterGameContract.js`
- `js/modules/interpreterAstEval.js`
- `js/modules/interpreterPrimitiveStatements.js`
- `js/modules/interpreterAnimation.js`
- `js/modules/interpreterDrawingOps.js`
- `js/modules/interpreterCommandClone.js`
- `js/modules/interpreterLifecycleCleanup.js`
- `js/modules/interpreterRuntimeState.js`
- `js/modules/parserTokenizer.js`
- `js/modules/parserCoreUtils.js`
- `js/modules/parserExpressions.js`
- `js/modules/parserBlocksConditions.js`
- `js/modules/parserCreateStatement.js`
- `js/modules/parserMotionStatements.js`
- `js/modules/parserStateStatements.js`
- `js/modules/parserStatementHandlers.js`
- `js/modules/accessibilitySettings.js`
- `js/modules/accessibilityNotifications.js`
- `js/modules/lessonsPageController.js`
- `js/modules/manualPageController.js`
- `js/main.js`

## 3. Repository map (v4)

- `index.html`: main editor page.
- `manual.html`: full language manual.
- `lessons.html`: current production tutorial lessons.
- `lessons_old.html`: archived pre-migration lessons page kept temporarily for rollback/reference.
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
- `js/modules/interpreterBoundary.js`: boundary margin/clamp/edge helper math extracted from interpreter for safer incremental decomposition.
- `js/modules/interpreterConditions.js`: key normalization and condition evaluation helpers shared by game-mode and queue IF evaluation paths.
- `js/modules/interpreterGameLoop.js`: start/stop helpers for game-loop runtime timer/reject orchestration.
- `js/modules/interpreterGameAstRunner.js`: AST runner for game-mode statements (top-level prep + per-tick execution callback).
- `js/modules/interpreterQueueRuntime.js`: RAF/stack orchestration helper for queue-mode command execution loop.
- `js/modules/interpreterCommandExecutor.js`: queue command-dispatch helper (`ASSIGN_AST`, move/turn/pen/color/goto/clear/repeat/if).
- `js/modules/interpreterAstQueueAdapter.js`: AST -> legacy queue adapter helper (function/assignment/repeat/if expansion and runtime IF payload conversion).
- `js/modules/interpreterGameContract.js`: game-mode contract helpers (`hasGameStatement`, top-level/nested `грати` validation).
- `js/modules/interpreterAstEval.js`: AST number-expression evaluation and AST span -> runtime error-location mapping helpers.
- `js/modules/interpreterPrimitiveStatements.js`: primitive AST statement helper for queue/runtime modes (move/turn/color/goto/pen/clear).
- `js/modules/interpreterAnimation.js`: animation helpers for pen/move/turn command progression and boundary-warning signaling.
- `js/modules/interpreterDrawingOps.js`: drawing/state operation helpers (move/turn/color/goto/clear) used by the interpreter runtime.
- `js/modules/interpreterCommandClone.js`: recursive command-clone helper for runtime queue branches (removes transient animation/execution fields).
- `js/modules/interpreterLifecycleCleanup.js`: interpreter destroy/cleanup helper (animation/timer/listener teardown + runtime state reset).
- `js/modules/interpreterRuntimeState.js`: runtime state transition helpers (`stop`/`pause`/`resume` and boundary-warning status access).
- `js/modules/parserTokenizer.js`: tokenizer helper (tokens + source metadata) used by `ravlykParser`.
- `js/modules/parserCoreUtils.js`: parser utility helpers for identifier normalization/validation, quoted-string parsing, span calculation, and parser error location attachment.
- `js/modules/parserExpressions.js`: expression parser helper (precedence/unary/primary path) used by `ravlykParser`.
- `js/modules/parserBlocksConditions.js`: block/condition parsing helpers (`(...)` matching, parsed block extraction, `if` condition AST helper) used by `ravlykParser`.
- `js/modules/parserCreateStatement.js`: `create` statement helper for parser (`create x = expr`, `create fn(params) (...)`).
- `js/modules/parserMotionStatements.js`: parser helpers for movement/navigation statements (`forward/backward`, `left/right`, `goto`).
- `js/modules/parserStateStatements.js`: parser helpers for state/call statements (`color`, `pen`, `clear`, assignment, function call).
- `js/modules/parserStatementHandlers.js`: parser-bound statement handler factory that wires parser callbacks/keywords into the concrete statement helpers.
- `js/modules/accessibilitySettings.js`: accessibility settings/storage/class-application helpers shared by the accessibility entry script.
- `js/modules/accessibilityNotifications.js`: accessibility toast/icon-selection helpers used by the accessibility entry script.
- `js/modules/lessonsPageController.js`: lessons-page tab/navigation/history controller helpers used by the lessons entry script.
- `js/modules/manualPageController.js`: manual-page section paging, hash/history, top-link, and mobile TOC controller helpers used by the manual entry script.
- `js/modules/parserStatementDispatcher.js`: parser dispatch helper that routes the current token to the correct statement parser.
- `js/modules/parserStatementContext.js`: builder for parser statement-helper context/dependencies, used to keep `ravlykParser` thin.
- `js/modules/parserControlStatements.js`: parser helpers for control-flow statements (`грати`, `повторити`, `якщо`).
- `js/accessibility.js`: accessibility toggles, persistence, focus behavior.
- `js/manualPage.js`: manual-page entry script that boots manual navigation/TOC behavior.
- `js/quizBank.js`: quiz question banks (30 per topic).
- `js/quizData/*.js`: split quiz datasets by theme (`basic`, `loops`, `vars`) consumed by the quiz bank facade.
- `js/quizPage.js`: quiz runtime (topic picker, random 10 questions, option shuffle, scoring).
- `tests/parser.basic.test.js`: parser basics (tokenization/AST/expression paths).
- `tests/parser.ast-runtime.test.js`: parser + runtime AST/queue integration behavior.
- `tests/parser.errors-boundary.test.js`: parser/runtime error and boundary scenarios.
- `tests/parser-helpers.test.js`: parser helper-module contracts.
- `tests/quiz.test.js`: quiz data-bank shape and theme-contract checks.
- `tests/accessibility.test.js`: accessibility helper contracts (defaults, class toggles, notification icon mapping).
- `tests/lessons.test.js`: lessons-page controller contracts plus production lessons HTML smoke checks (lesson structure, deep links, reflection blocks, archive-independence guards).
- `tests/manual.test.js`: manual-page controller contracts (section ids, hash resolution, paging state).
- `tests/parser-helpers.test.js` also covers statement-dispatch helper routing/error contracts.
- `tests/parser-helpers.test.js` also covers parser statement-context builder wiring.
- `tests/ui.dom.test.js`: UI DOM utility tests.
- `tests/controllers.test.js`: controller-level integration tests.
- `tests/interpreter.helpers.core.test.js`: interpreter helper core contracts.
- `tests/interpreter.helpers.runtime.test.js`: interpreter helper runtime contracts.
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

Validated by `validateGameProgramContract()` from `js/modules/interpreterGameContract.js`:
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
- interpreter boundary math is centralized in `js/modules/interpreterBoundary.js` and consumed by `ravlykInterpreter.js`,
- interpreter condition evaluation/key normalization is centralized in `js/modules/interpreterConditions.js` and consumed by `ravlykInterpreter.js`,
- interpreter game-loop timer orchestration is centralized in `js/modules/interpreterGameLoop.js` and consumed by `ravlykInterpreter.js`,
- interpreter game-mode AST execution scaffolding is centralized in `js/modules/interpreterGameAstRunner.js` and consumed by `ravlykInterpreter.js`,
- interpreter queue-mode RAF/stack orchestration is centralized in `js/modules/interpreterQueueRuntime.js` and consumed by `ravlykInterpreter.js`,
- interpreter queue command-dispatch switch is centralized in `js/modules/interpreterCommandExecutor.js` and consumed by `ravlykInterpreter.js`,
- parser tokenization with metadata is centralized in `js/modules/parserTokenizer.js` and consumed by `ravlykParser.js`,
- parser identifier/span/error utility logic is centralized in `js/modules/parserCoreUtils.js` and consumed by `ravlykParser.js`,
- parser expression parsing logic is centralized in `js/modules/parserExpressions.js` and consumed by `ravlykParser.js`,
- parser movement/navigation statement helpers are centralized in `js/modules/parserMotionStatements.js`,
- parser state/call statement helpers are centralized in `js/modules/parserStateStatements.js`,
- parser-bound statement handler wiring is centralized in `js/modules/parserStatementHandlers.js`,
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

## 8.4 Static-layer status snapshot

Current practical state of the static layer:
- `manual.html` is no longer a mostly flat document; large sections were split into clearer semantic subsections and repeated content blocks now have more explicit structure/labels.
- `manual.html` also now uses more consistent subsection wrapper classes across error groups, challenge items, callout-heavy sections, the remaining intro/basic/repetition/next-step support blocks, and the `errors` overview intro, reducing one-off markup patterns inside the large document.
- `css/manual.css` is partially normalized around shared tokens for panels/content blocks/high-contrast states; recent follow-up cleanup also removed smaller duplicate example/result/challenge/error fragments and folded a few remaining low-level content literals into shared manual tokens, so the highest-value remaining work is now in narrower cleanup clusters rather than broad emergency refactors.
- `css/main-editor.css` is largely tokenized for editor surfaces, accents, shadows, responsive controls, and high-contrast variants; remaining work there is mostly cosmetic follow-up, not structural risk.
- `lessons.html` has already been promoted to the new production lesson structure: lesson0 intro, explicit subsection wrappers across lessons 1-9, CTA-style manual deep links, reflection blocks, path table, and bottom navigation are all part of the live page.
- `lessons_old.html` now exists only as an archive/rollback copy of the previous lessons page.
- `css/lessons.css` mostly serves the production lessons page now; only a small archive-only tail remains for `lessons_old.html` (`why-important h4`, `task h4`, `lesson-image-fullwidth`, and matching high-contrast rules).
- the project's biggest maintainability risk still sits in static HTML/CSS, not in the interpreter/runtime core.

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

- `tests/parser.basic.test.js`: parser tokenization and baseline AST behavior.
- `tests/parser.ast-runtime.test.js`: AST-to-runtime queue integration behavior.
- `tests/parser.errors-boundary.test.js`: parser/runtime error and boundary scenarios.
- `tests/parser-helpers.test.js`: parser helper-module contracts.
- `tests/ui.dom.test.js`: UI DOM utility checks (canvas/modals/editor behavior).
- `tests/controllers.test.js`: controller-level checks (execution/file/navigation/modal/input/lifecycle).
- `tests/interpreter.helpers.core.test.js`: interpreter helper core checks (boundary/conditions/game/queue/AST-eval).
- `tests/interpreter.helpers.runtime.test.js`: interpreter helper runtime checks (primitive/animation/drawing/clone/lifecycle/runtime-state).
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
- `node --experimental-default-type=module tests/parser.basic.test.js`
- `node --experimental-default-type=module tests/parser.ast-runtime.test.js`
- `node --experimental-default-type=module tests/parser.errors-boundary.test.js`
- `node --experimental-default-type=module tests/parser-helpers.test.js`
- `node --experimental-default-type=module tests/quiz.test.js`
- `node --experimental-default-type=module tests/accessibility.test.js`
- `node --experimental-default-type=module tests/lessons.test.js`
- `node --experimental-default-type=module tests/manual.test.js`
- `node --experimental-default-type=module tests/controllers.test.js`
- `node --experimental-default-type=module tests/interpreter.helpers.core.test.js`
- `node --experimental-default-type=module tests/interpreter.helpers.runtime.test.js`
- `node --experimental-default-type=module tests/ui.dom.test.js`
- `node --experimental-default-type=module tests/encoding.test.js`

## 14. Known technical debt / open points

1. Static CSS complexity remains the primary debt
- `css/manual.css` is substantially cleaner than before, but still carries some cascade noise in lower-level content/a11y fragments and selector organization.
- `css/main-editor.css` is close to a "good enough" state after tokenization and deduplication, but still has a few follow-up cosmetic literals and could be flattened further if desired.
- `css/lessons.css` is mostly in good shape for the production lessons page; the remaining debt there is a small archive-only selector tail that should disappear together with `lessons_old.html`.
- styles are still page-local rather than componentized, so maintainability depends on continuing small, verified cleanups instead of large rewrites.

2. Large static documents are still expensive to maintain
- `manual.html` is much more structured now, but it is still a large hand-maintained static document.
- `lessons.html` is now the production version of the reworked course and is no longer an active refactor target; remaining work there is smoke-test growth and ordinary content maintenance.
- `lessons_old.html` is temporary archive debt only. Once rollback is no longer needed, it should be deleted together with the small archive-only selector tail in `css/lessons.css`.

3. Mixed execution model history
- despite parser cleanup, non-game mode still uses queue adaptation for compatibility with existing runtime structure.

4. Test stability remains important
- the previous timing-sensitive flake in `tests/parser.ast-runtime.test.js` was reduced by making the game-loop state test wait for observed progress instead of assuming a fixed wall-clock schedule.
- the full `npm test` suite currently passes, including Playwright smoke coverage, so test reliability is in a better state than before.

5. Documentation drift risk
- this file and any debt/status docs should be updated whenever grammar, command contracts, responsive behavior, or debt priorities materially change.

## 14.1 Current debt priority order

Recommended practical order at this snapshot:
1. finish any last high-signal cleanup in `css/manual.css`,
2. treat `css/main-editor.css` as near-done and only revisit for narrow cosmetic follow-up,
3. delete `lessons_old.html` when rollback is no longer needed and remove the archive-only `css/lessons.css` tail in the same batch,
4. keep `lessons.html` in watch-mode with small smoke-test growth as the course evolves,
5. revisit `manual.html` only for deeper content-structure refactors if there is a clear payoff,
6. keep test-suite reliability under observation, but not as the main active debt item right now,
7. keep JS-core/test cleanup as lower priority hygiene work unless a new bug changes that assessment.

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


