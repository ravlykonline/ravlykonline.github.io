# TESTING.md

Цей документ описує тестову інфраструктуру проєкту РАВЛИК.

## 1. Поточний стан

Тестова інфраструктура повністю розгорнута в корені репозиторію:

- `package.json` — npm-скрипти для запуску тестів
- `package-lock.json` — зафіксовані версії залежностей
- `playwright.config.js` — конфігурація E2E-тестів
- `tests/` — unit і integration тести
- `tests/e2e/` — Playwright E2E тести

## 2. Стек тестування

- **Node.js** (v24) — виконання unit-тестів напряму без test-runner фреймворку
- **`@playwright/test`** — E2E тести у браузері (Chromium, Firefox, WebKit)

## 3. Команди

```bash
npm run test:unit        # усі unit-тести
npm run test:projects    # Node-тести опублікованих go/ та artist
npm run test:e2e         # усі E2E-тести (Playwright)
npm run test             # unit + E2E разом
npm run check            # precache + root/go/artist unit-тести + shared HTML partials + ESLint
npm run lint             # ESLint для js/ та sw.js
npm run pages:build      # зібрати allowlist-артефакт для GitHub Pages
npm run precache:sync    # згенерувати SW precache з deployment manifest
npm run precache:check   # перевірити, що згенерований SW precache актуальний
npm run html:sync-partials # синхронізація спільних HTML-блоків
npm run html:check-partials # перевірка синхронізації shared HTML без запису файлів
npm run release:sync-version -- YYYY-MM-DD-N  # синхронізація release-версії
```

Перед першим запуском E2E встановити браузери:

```bash
npx playwright install chromium firefox webkit
```

## 4. Структура тестів

```text
tests/
  parser.basic.test.js           — токенізатор, базові команди руху/кольору/фону
  parser.ast-runtime.test.js     — AST-генерація, змінні, функції, game block
  parser.errors-boundary.test.js — помилки парсера з метаданими рядка/колонки
  parser-helpers.test.js         — допоміжні модулі парсера
  semantic.test.js               — semantic validator, reserved names, функції, game contract, AST node budget
  interpreter.helpers.core.test.js   — ядро інтерпретатора
  interpreter.helpers.runtime.test.js — runtime-стани, stop/pause/resume
  controllers.test.js            — execution, file actions, navigation, modal, захист коду при виборі прикладу, lifecycle
  ui.dom.test.js                 — UI-компоненти, grid overlay, editor UI
  accessibility.test.js          — налаштування доступності та сповіщення
  analytics.test.js              — Cloudflare Web Analytics beacon і відсутність Google Analytics
  lessons.test.js                — lessons-контролер та структура сторінки
  manual.test.js                 — manual-контролер та структура сторінки
  quiz.test.js                   — quiz bank, теми, контракти питань
  randomResolver.test.js         — генератор випадкових значень
  encoding.test.js               — UTF-8, BOM, відсутність v4beta-шляхів, структурні регресії, shared HTML partials
  releaseVersion.test.js         — синхронізація release-версії між SW і HTML
  serviceWorker.test.js          — Service Worker: production-only registration, allowlist, bounded cache
  astAnimationRuntime.test.js    — lazy animation runtime: порожня програма, move/turn, repeat, змінні, if/else, функції, budget
  runtimeUnification.test.js     — createAstRuntime.step() напряму: sequences, repeat, assign, if/else, функції, ColorStmt/ClearStmt
  legacyBoundary.test.js         — CI-межа: executeCommands не викликає astToLegacyQueue і runCommandQueue
  pagesArtifact.test.js          — allowlist GitHub Pages: основний сайт, музей та ігри без tests/logs/експериментів
  parserTestUtils.js             — спільні утиліти для тестів парсера
  testUtils.js                   — загальні тестові утиліти
  e2e/
    index.smoke.spec.js              — основні сценарії редактора
    accessibility.pages.spec.js      — skip-link, main landmark, accessibility controls
    accessibility.checklist.spec.js  — keyboard flow для панелі доступності
    accessibility.persistence.spec.js — збереження налаштувань після перезавантаження
    accessibility.high-contrast.spec.js — high-contrast на всіх сторінках
    about.project.spec.js            — footer-навігація та вміст about.html
    cross-browser.smoke.spec.js      — smoke для Chromium, Firefox, WebKit
    published-projects.spec.js       — наявні браузерні unit/encoding/integration тести game у Chromium
    pwa.offline.spec.js              — offline-режим PWA після теплого кешу
    server.js                        — локальний сервер для E2E
```

## 5. Що покривають тести

**Parser / Interpreter:**
- токенізація коментарів, рядків у лапках, операторів
- усі команди руху, повороту, кольору, фону, товщини
- змінні, вирази, умови, цикли, функції
- game block та його контракт
- дружні помилки з рядком і колонкою

**Controllers / UI:**
- execution controller (запуск, зупинка, stop-confirm flow)
- file actions (export PNG, save TXT, share link, load from hash)
- modal controller
- lifecycle controller
- grid overlay
- editor UI (line numbers, error highlight)

**Accessibility:**
- defaults з урахуванням `prefers-reduced-motion`
- toggle класів і збереження налаштувань
- іконки сповіщень

**Page-level contracts:**
- lessons: порядок уроків, URL-резолвер, prev/next стан
- manual: секції, deep-link aliases, пагінація, фільтри
- quiz: теми, контракти питань
- encoding: UTF-8, відсутність BOM, відсутність `/v4beta/`-шляхів
- release version: синхронізація SW та HTML

**E2E:**
- головний smoke: редактор відкривається, код виконується
- модальні вікна: help, download, stop-confirm, example-confirm — Escape, focus return
- вибір прикладу: непорожній відмінний код не замінюється без явного підтвердження
- accessibility panel: focus trap, high contrast, persistence
- game mode: блокування scroll, start/stop
- download: PNG та TXT export
- mobile tabs: збереження canvas при перемиканні
- offline PWA: сторінки доступні після warm cache

## 6. CI

Файл: `.github/workflows/ci.yml`

Запускається на кожен push до `main` та на pull request.

```yaml
- Setup Node.js 24
- npm ci
- npx playwright install --with-deps chromium firefox webkit
- npm run test:unit
- npm run test:projects
- npm run html:check-partials
- npm run lint
- npm run test:e2e -- --reporter=dot
```

## 7. Що залишається ручною перевіркою

- Screen reader smoke на `index.html`, `manual.html`, `lessons.html`
- Фінальна візуальна перевірка larger text, reduced motion, simpler font, increased spacing
- Крос-браузерний manual smoke в Chrome, Edge, Firefox, Safari
- Offline PWA після hard refresh

Детальний чеклист: [`ACCESSIBILITY_CHECKLIST.md`](ACCESSIBILITY_CHECKLIST.md)

## 8. Відомі обмеження

- Firefox E2E (`firefox-smoke`) може не запускатися в headless-режимі на Windows через системні залежності. На CI (Linux) працює нормально.
- WebKit smoke покриває лише `cross-browser.smoke.spec.js` (3 тести).
- Offline PWA тест (`pwa.offline.spec.js`) вимагає попереднього warm cache і не гарантує першого офлайн-завантаження.
