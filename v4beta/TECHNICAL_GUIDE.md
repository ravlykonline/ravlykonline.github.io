# RAVLYK v4 Technical Guide

Primary engineering guide for this repository.

Last updated: 2026-03-12

Related:
- `README.md` for a short project overview
- `DESIGN_GUIDE.md` for UI and styling rules
- `ACCESSIBILITY_CHECKLIST.md` for release-facing accessibility verification
- `LICENSE` for source-code licensing
- `LICENSE-CONTENT.md` for educational-content licensing
- `BRAND_POLICY.md` for naming and branding rules
- `CONTRIBUTING.md` for contribution workflow and submission terms

## 1. Documentation policy

Keep only these canonical repo-wide documents:
- `README.md` for public-facing orientation
- `TECHNICAL_GUIDE.md` for engineering reality
- `DESIGN_GUIDE.md` for design-system and CSS rules
- `ACCESSIBILITY_CHECKLIST.md` for accessibility regression verification
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
- drawing state: color, background, thickness, pen up/down, clear
- variables and assignment
- repeat loops
- conditions with optional else
- function definitions and calls
- game mode

Implemented expressions:
- number literals
- identifiers
- unary `+` and `-`
- binary `+ - * / %`

Implemented condition families:
- edge checks
- key checks
- comparisons `= != < > <= >=`

Semantic notes:
- `фон` changes the background underlay, not existing drawing
- `очистити` restores a clean white sheet
- non-game execution still uses AST-to-queue adaptation for compatibility
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
- runs either game-mode execution or queue-mode execution

Safety and limits from `js/modules/constants.js`:
- `MAX_RECURSION_DEPTH = 20`
- `MAX_REPEATS_IN_LOOP = 500`
- `EXECUTION_TIMEOUT_MS = 180000`
- `MAX_CODE_LENGTH_CHARS = 10000`

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

## 8. Testing and verification

Primary commands:
- `npm run test:unit`
- `npm run test:e2e`
- `node --experimental-default-type=module tests/encoding.test.js`

What the suites cover:
- parser and interpreter correctness
- controller and DOM behavior
- page-level contracts for manual, lessons, quiz, and accessibility
- encoding and mojibake regressions
- E2E smoke flows for editor and responsive UI
- keyboard smoke for skip-link, `main`, and accessibility-panel focus flow on all public pages
- persistence checks for accessibility settings on `index.html`, `manual.html`, and `lessons.html`
- computed-style regression checks for high contrast on quiz, lessons, zen, resources, teacher, and parent pages

Primary accessibility E2E specs:
- `tests/e2e/accessibility.pages.spec.js`
- `tests/e2e/accessibility.checklist.spec.js`
- `tests/e2e/accessibility.persistence.spec.js`
- `tests/e2e/accessibility.high-contrast.spec.js`
- `tests/e2e/index.smoke.spec.js`

For content, CSS, or documentation changes, always run:
1. `npm run test:unit`
2. `node --experimental-default-type=module tests/encoding.test.js`

For user-facing interaction changes, also run:
3. `npm run test:e2e`

Accessibility verification note:
- automated tests cover structure, focus flow, key persistence paths, and the main high-contrast visual contract
- screen reader output and final visual readability checks remain manual and are tracked in `ACCESSIBILITY_CHECKLIST.md`

GitHub Pages note:
- the project uses versioned local asset URLs such as `?v=2026-03-11-1` for CSS, JS, and `site.webmanifest`
- when shipping a public update, bump that shared release token across HTML entry pages so cached school/lab browsers fetch fresh assets
- this is the repository-level cache-busting strategy because GitHub Pages does not provide custom cache-header control
- do not publish the entire `v4beta` working directory into the site root because it contains dev-only artifacts such as `node_modules`, `tests`, `package*.json`, and Playwright config
- when promoting `v4beta` to the root site, sync only the public site files and preserve repo control directories such as `.git`, `.github`, `old`, and `v4beta`
- use `scripts/promote-to-root.ps1` from inside `v4beta` for the root promotion flow instead of manual "delete everything in root"

## 9. Release checklist

Before release or public deploy:
1. run `npm run test:unit`
2. run `node --experimental-default-type=module tests/encoding.test.js`
3. run `npm run test:e2e`
4. bump the shared asset version token in HTML entry pages when the release changes public CSS, JS, or manifest behavior
5. if promoting from `v4beta`, run `powershell -ExecutionPolicy Bypass -File .\scripts\promote-to-root.ps1` first in dry-run mode, then rerun with `-Apply` after reviewing the planned changes
6. visually verify `index.html`, `manual.html`, `lessons.html`, `resources.html`, `quiz.html`, `teacher_guidelines.html`, `advice_for_parents.html`, and `zen.html`
7. visually verify `about.html`
8. recheck links, anchors, modals, mobile layout, accessibility settings, and download/share flows
9. run the manual P1 review from `ACCESSIBILITY_CHECKLIST.md` for screen reader and visual accessibility checks
10. keep `README.md`, this file, `DESIGN_GUIDE.md`, and `ACCESSIBILITY_CHECKLIST.md` aligned with real repo behavior

## 10. Current technical debt

Primary remaining debt:
- CSS is improved but still partly page-local rather than componentized
- `css/manual.css` remains the largest static styling surface
- large static content pages still require careful manual maintenance
- queue-mode compatibility logic remains in the runtime for non-game execution

Accessibility settings follow-up:
- screen reader smoke is still manual and should be rerun on `index.html`, `manual.html`, and `lessons.html` before release
- final visual review is still needed for larger text, reduced motion, simpler font, and increased spacing across desktop and mobile widths
- persistence is directly covered for `index.html`, `manual.html`, and `lessons.html`; the remaining public pages rely on the shared `js/accessibility.js` contract and should still be spot-checked manually

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
