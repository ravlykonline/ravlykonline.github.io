# RAVLYK v4 Technical Guide

Primary engineering guide for this repository.

Last updated: 2026-08-17

Related:
- `README.md` for a short project overview
- `DESIGN_GUIDE.md` for UI and styling rules
- `ACCESSIBILITY_CHECKLIST.md` for release-facing accessibility verification
- `LICENSE` for source-code licensing
- `LICENSE-CONTENT.md` for educational-content licensing
- `BRAND_POLICY.md` for naming and branding rules
- `CONTRIBUTING.md` for contribution workflow and submission terms

## 1. Documentation policy

Canonical repo-wide documents and their responsibilities:
- `README.md` for public-facing orientation
- `TECHNICAL_GUIDE.md` for the engineering overview and current cross-cutting debt
- `ARCHITECTURE.md` for detailed architecture and runtime boundaries
- `LANGUAGE_SPEC.md` for language semantics
- `SECURITY.md` for the security model and security release checks
- `TESTING.md` for test infrastructure and coverage
- `DESIGN_GUIDE.md` for design-system and CSS rules
- `ACCESSIBILITY_CHECKLIST.md` for accessibility regression verification
- `RELEASE_CHECKLIST.md` and `SEO_DEPLOYMENT_CHECKLIST.md` for release operations
- `LICENSE` for source-code permissions
- `LICENSE-CONTENT.md` for non-code educational materials
- `BRAND_POLICY.md` for brand-use restrictions
- `CONTRIBUTING.md` for contribution expectations

Do not create separate repo-wide markdown files for temporary status, debt, release notes, or executive summaries unless the scope is independent and long-lived.

Update rules:
- engineering-wide behavior changes belong here
- UI convention changes belong in `DESIGN_GUIDE.md`
- `README.md` should stay short and not duplicate internal detail
- command reference, long feature tutorials, and page-level styling rules should not be expanded here when they already live better in product pages or `DESIGN_GUIDE.md`

## 2. Project purpose

RAVLYK is a static browser-based educational programming environment with Ukrainian syntax for children.

Core product goals:
- simple text commands with immediate visual feedback
- predictable execution and friendly errors
- gradual learning path from basic movement to logic, functions, and game mode

## 3. Stack and architecture

Technical model:
- static site only: HTML, CSS, ES modules
- no backend
- Canvas 2D rendering
- parser -> AST -> interpreter/runtime -> renderer

Main entry points:
- `index.html` and `js/main.js` for the editor
- `manual.html` and `js/manualPage.js` for the manual
- `lessons.html` and `js/lessonsPage.js` for lessons
- `quiz.html` and `js/quizPage.js` for the quiz
- `js/accessibility.js` for accessibility controls
- Cloudflare Web Analytics beacon embedded in public HTML pages
- `js/registerServiceWorker.js` for public-page service-worker registration
- `sw.js` for offline shell caching and runtime fallback

Core engine modules:
- `js/modules/ravlykParser.js`
- `js/modules/environment.js`
- `js/modules/ravlykInterpreter.js`
- `js/modules/constants.js`

Supporting controller/module groups:
- parser helpers in `js/modules/parser*.js`
- interpreter helpers in `js/modules/interpreter*.js`
- editor/UI helpers in `js/modules/ui*.js`, `editorUi.js`, `workspaceTabs.js`, `executionController.js`, `fileActionsController.js`
- page controllers in `manualPageController.js` and `lessonsPageController.js`
- GIF export: `js/modules/gifCapture.js` (frame capture, 100ms intervals, max 200 frames) + `js/modules/gifEncoder.js` (GIF89a encoder, NeuQuant fallback, no external deps)

Deployment:
- primary and only production host: Cloudflare Pages
- `npm run pages:build` creates the allowlisted `.pages-artifact/` directory
- Cloudflare Pages publishes `.pages-artifact/`, not the repository root
- the allowlist includes the main site and the intended public `old/`, `artist/`, `game/`, and `go/` projects; tests, logs, backups, developer documentation, and `maisternia/` are excluded

## 4. Repository map

Primary pages:
- `index.html`: editor
- `manual.html`: language manual
- `lessons.html`: lessons
- `resources.html`: extra materials
- `quiz.html`: quiz
- `teacher_guidelines.html`: teacher page
- `advice_for_parents.html`: parent page
- `zen.html`: alternate/static informational page
- `about.html`: project background and origin page
- `privacy.html`: privacy and local-data-processing explanation
- `404.html`: not-found page used by the static host

Primary CSS:
- `css/global.css`: shared tokens and common UI
- `css/main-editor.css`: editor page
- `css/manual.css`: manual page
- `css/lessons.css`: lessons page
- `css/resources.css`: resources page
- `css/quiz.css`: quiz page
- `css/accessibility.css`: accessibility UI and shared accessibility-mode overrides
- `css/teacher-guidelines.css`: teacher page
- `css/parents.css`: parent page
- `css/zen.css`: Zen page styles
- `css/about-project.css`: about page styles

Tests:
- `tests/*.test.js`: unit and integration coverage
- `tests/encoding.test.js`: UTF-8, BOM, structural regression guards
- `tests/e2e/*`: Playwright smoke coverage

## 5. Language model

Implemented statement families:
- movement: forward, backward, left, right, goto
- drawing state: color, background, thickness, pen up/down, clear, visibility, home, embroidery mode
- semantic pause: wait
- variables and assignment
- repeat and conditional while loops, with break from the nearest loop
- conditions with optional else and negation
- function definitions and calls
- game mode

Implemented expressions:
- number literals
- identifiers
- unary `+` and `-`
- binary `+ - * / %`
- builtins `модуль`/`abs`, `корінь`/`sqrt`, and `випадково`/`random` with explicit bounds
- live current-angle expression `кут`

Implemented condition families:
- edge checks
- key checks
- comparisons `= != < > <= >=`
- negation with `не`

Semantic notes:
- `фон` changes the background underlay, not existing drawing
- `очистити` restores a clean white sheet
- non-game execution uses the lazy AST runtime; legacy flat-queue compatibility modules and APIs have been removed
- game mode runs on a fixed tick loop and validates its contract before execution

## 6. Runtime and safety model

Parser:
- tokenizes with source metadata
- builds AST only
- attaches location data to user-facing errors

Environment:
- hierarchical scope with parent lookup
- supports define, set, get, and clone

Interpreter:
- parses code to AST
- validates `грати` contract
- runs both normal animation and game mode through `createAstRuntime`

Safety and limits from `js/modules/constants.js`:
- `MAX_RECURSION_DEPTH = 20` — max call stack depth for functions
- `MAX_PARSE_DEPTH = 20` — max block nesting depth during parsing (enforced in `ravlykParser.js` via `_parseDepth`)
- `MAX_EXPRESSION_DEPTH = 100` — max nested parentheses, unary signs, and numeric builtin calls in one expression
- `MAX_REPEATS_IN_LOOP = 500` — max repeat count per single loop
- `MAX_AST_NODES = 5000` — max AST nodes per program (enforced in `semanticValidator.js`)
- `MAX_COMMAND_QUEUE_LENGTH = 50000` — max total steps during AST runtime execution (enforced in `interpreterAstRuntime.js`)
- `EXECUTION_TIMEOUT_MS = 180000` — time-based execution cap (3 minutes)
- `MAX_CODE_LENGTH_CHARS = 10000` — max raw code length
- `MAX_GAME_TICK_OPERATIONS = 500` — max AST steps in one game tick

Current safety posture:
- shared-code links load code but do not auto-run it
- imported code shows a persistent review notice
- `_blank` navigation uses `noopener,noreferrer`
- dynamic UI messages avoid unsafe `innerHTML` paths

## 7. UI architecture

Editor page responsibilities:
- code editor, canvas, toolbar, examples, command reference, modal flows
- share/download/grid/help actions
- mobile workspace switching between editor and canvas
- the moving snail marker is a DOM sprite created by `js/modules/ui.js`, not a canvas draw primitive
- the editor currently uses an illustrated SVG snail variant based on `ravlyk_2.svg`
- sprite placement keeps a small manual Y-anchor calibration in `updateRavlykVisualsOnScreen()` so path endpoints do not visibly protrude from under the icon

Manual page responsibilities:
- section navigation and TOC
- reading modes
- deep-link compatibility
- example actions such as copy and open-in-editor

Lessons page responsibilities:
- lesson navigation and deep links
- production lesson content structure

Quiz page responsibilities:
- topic selection
- random 10-question generation
- answer state and scoring feedback

Accessibility subsystem:
- shared accessibility shell is present on all public entry pages
- high contrast
- larger text
- reduced motion
- simpler font
- increased spacing
- settings persisted in `localStorage`
- shared setting contract uses `data-setting` attributes in the panel inputs
- shared high-contrast surface overrides live in `css/accessibility.css`
- page CSS keeps only page-specific state and layout exceptions where shared rules would be too broad

PWA/offline subsystem:
- all public entry pages register the root service worker through `js/registerServiceWorker.js`
- all public entry pages embed the Cloudflare Web Analytics beacon directly and allow only the Cloudflare script and beacon endpoints in CSP
- `sw.js` precaches the public shell: HTML entry pages, local CSS, local JS entry files, `js/modules/*`, `js/quizData/*`, local icons, and local instructional images
- navigation requests use network-first with cache fallback
- static same-origin assets use cache-first with runtime cache fill
- after one successful online warm-up, the editor, manual, lessons, quiz, and supporting shell pages are expected to remain available offline
- first-load offline is not guaranteed until the service worker has been installed and the cache warmed
- the offline shell currently targets same-origin assets only; third-party CDN resources are not part of the precache contract

## 8. Testing and verification

Primary commands:
- `npm run test:unit`
- `npm run test:e2e`
- `npm run docs:check`
- `npm run check`
- `node tests/encoding.test.js`

What the suites cover:
- parser and interpreter correctness
- controller and DOM behavior
- page-level contracts for manual, lessons, quiz, and accessibility
- encoding and mojibake regressions
- E2E smoke flows for editor and responsive UI
- keyboard smoke for skip-link, `main`, and accessibility-panel focus flow on all ten primary content pages
- persistence checks for all five accessibility settings on those ten content pages
- computed-style regression checks for high contrast on quiz, lessons, zen, resources, teacher, and parent pages
- offline navigation and reload smoke for the warmed PWA shell across every root HTML page, including quiz data

Primary accessibility E2E specs:
- `tests/e2e/accessibility.pages.spec.js`
- `tests/e2e/accessibility.checklist.spec.js`
- `tests/e2e/accessibility.persistence.spec.js`
- `tests/e2e/accessibility.high-contrast.spec.js`
- `tests/e2e/index.smoke.spec.js`

Primary PWA E2E spec:
- `tests/e2e/pwa.offline.spec.js`

For content, CSS, or documentation changes, always run:
1. `npm run test:unit`
2. `node tests/encoding.test.js`

For user-facing interaction changes, also run:
3. `npm run test:e2e`

Accessibility verification note:
- automated tests cover structure, focus flow, key persistence paths, and the main high-contrast visual contract
- screen reader output and final visual readability checks remain manual and are tracked in `ACCESSIBILITY_CHECKLIST.md`

Static deployment and PWA cache note:
- the project uses versioned local asset URLs such as `?v=<release-token>` for CSS, JS, and `site.webmanifest`
- when shipping a public update, update the shared release token with `npm run release:sync-version -- YYYY-MM-DD-N`; do not edit individual entry pages manually
- Cloudflare Pages supports `_headers`, but the release token remains coordinated with the Service Worker and prevents old school/lab caches from mixing asset versions
- `sw.js` uses the same shared release token as its cache version and should be updated when public asset behavior changes

## 9. Release checklist

Before release or public deploy:
1. run `npm run test:unit`
2. run `node tests/encoding.test.js`
3. run `npm run test:e2e`
4. run `npm run release:sync-version -- YYYY-MM-DD-N` when the release changes public CSS, JS, manifest, or Service Worker behavior; `release-version.json` is the canonical value
5. when public offline behavior changes, keep `sw.js` cache version and the shared HTML asset token aligned
6. visually verify `index.html`, `manual.html`, `lessons.html`, `resources.html`, `quiz.html`, `teacher_guidelines.html`, `advice_for_parents.html`, `zen.html`, `about.html`, and `privacy.html`
7. recheck links, anchors, modals, mobile layout, accessibility settings, download/share flows, and warmed offline startup
8. run the manual P1 review from `ACCESSIBILITY_CHECKLIST.md` for screen reader and visual accessibility checks
9. keep `README.md`, this file, `DESIGN_GUIDE.md`, and `ACCESSIBILITY_CHECKLIST.md` aligned with real repo behavior

## 10. Current maintenance boundaries

No known high-priority core technical debt remains in the tracked backlog.

Intentional boundaries:
- shared colors, accessibility colors, common radii, and card shadows live in `css/global.css`; page-specific layout remains in page stylesheets, including the larger `css/manual.css`
- large static content pages still require editorial review when their structure changes
- the service worker scope is intentionally `/`, matching the Cloudflare Pages root deployment; a subdirectory deployment would require a separate architecture decision
- GIF export uses real-time playback (1×) with freeze frames at start/end; short bursts of instantaneous `фон` commands are coalesced for at most one 100ms capture window, while background-only programs continue to record periodic frames

Accessibility settings follow-up:
- screen reader smoke is still manual and should be rerun on `index.html`, `manual.html`, and `lessons.html` before release
- final visual review is still needed for larger text, reduced motion, simpler font, and increased spacing across desktop and mobile widths
- persistence is directly covered on all ten primary content pages; `404.html` is covered by the offline shell but is not part of the accessibility persistence matrix; final usability and screen-reader output still require manual review

Offline/PWA operating constraints:
- the local offline shell is working only after a successful online warm cache
- third-party runtime dependencies are still external for analytics via Cloudflare Web Analytics from `static.cloudflareinsights.com`, with beacon submission allowed to `cloudflareinsights.com`
- icon assets are now localized into `assets/icons/*` and included in the service-worker precache; analytics is no longer part of the critical shell path, but the remote provider is still external by design
- core same-origin functionality is expected to keep working offline; analytics is intentionally skipped while offline and retries after the app regains connectivity

Current priority order:
1. favor small verified cleanup passes over rewrites
2. keep tokenization and shared UI styles moving into `css/global.css` when useful
3. expand tests when page structure or runtime behavior changes
4. avoid speculative refactors unless they remove real duplication or bugs

## 11. Contributor checklist

When changing language or runtime behavior:
1. update parser and runtime paths together
2. update friendly errors if needed
3. add or update unit tests
4. add or update E2E coverage if interaction changes
5. update `manual.html` or `lessons.html` if user-facing behavior changes
6. update this file or `DESIGN_GUIDE.md` instead of creating a new repo-wide status document

Single-source rule:
- if `README.md` and this guide differ on technical details, this guide wins
- if styling in code and `DESIGN_GUIDE.md` differ, bring the code back to the guide or explicitly update the guide

Boundary reminder:
- `README.md` is for orientation
- this guide is for architecture, behavior, testing, and maintenance
- `DESIGN_GUIDE.md` is for visual consistency, tokens, and reusable UI patterns
