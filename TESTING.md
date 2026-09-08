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
npm run check            # precache + docs + root/go/artist unit-тести + shared HTML partials + ESLint
npm run lint             # ESLint для js/ та sw.js
npm run pages:build      # зібрати allowlist-артефакт для Cloudflare Pages
npm run precache:sync    # згенерувати SW precache з deployment manifest
npm run precache:check   # перевірити, що згенерований SW precache актуальний
npm run html:sync-partials # синхронізація спільних HTML-блоків
npm run html:check-partials # перевірка синхронізації shared HTML без запису файлів
npm run docs:check        # локальні Markdown-посилання й синхронність документованих лімітів
npm run perf:ast          # browser benchmark parsing та одного синхронного runtime.step
npm run release:check-token # версійні ассети не змінені без нового release token
npm run release:sync-version -- YYYY-MM-DD-N  # синхронізація release-версії
```

Перед першим запуском E2E встановити браузери:

```bash
npx playwright install chromium firefox webkit
```

CI використовує саме ці pinned-браузери. Якщо локально встановлено інший build і Playwright повідомляє `Executable doesn't exist`, для запуску chromium-проєктів можна тимчасово вказати системний Chrome:

```bash
RAVLYK_BROWSER_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm run test:e2e -- --project=chromium
```

Змінна діє лише на `chromium`, `mobile-chrome` і `tablet-chrome`. Результат такого прогону не еквівалентний CI: він отриманий на неpinned-браузері, і це треба зазначати у звіті про перевірки. Правильне рішення — переустановити браузери командою вище.

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
  pageActions.test.js            — перевірка page-level action wiring і збереження стану після помилок
  ui.dom.test.js                 — UI-компоненти, grid overlay, editor UI
  accessibility.test.js          — налаштування доступності та сповіщення
  analytics.test.js              — Cloudflare Web Analytics beacon і відсутність Google Analytics
  lessons.test.js                — lessons-контролер та структура сторінки
  manual.test.js                 — manual-контролер та структура сторінки
  learningExamples.test.js       — виконувані контракти прикладів безпосередньо з lessons.html і manual.html
  canvasState.test.js            — навчальні координати, читання стану та bounded-журнал завершених примітивів
  quiz.test.js                   — quiz bank, теми, контракти питань
  randomResolver.test.js         — генератор випадкових значень
  encoding.test.js               — UTF-8, BOM, відсутність v4beta-шляхів, структурні регресії, shared HTML partials
  releaseToken.test.js           — контракт release token: версійні ассети не їдуть без нового токена
  releaseVersion.test.js         — синхронізація release-версії між SW і HTML
  serviceWorker.test.js          — Service Worker: production-only registration, allowlist, bounded cache
  astAnimationRuntime.test.js    — lazy animation runtime: порожня програма, move/turn, repeat, змінні, if/else, функції, budget
  runtimeUnification.test.js     — createAstRuntime.step() напряму: sequences, repeat, assign, if/else, функції, ColorStmt/ClearStmt
  runtimeBoundary.test.js        — CI-межа: legacy flat-queue модулі видалені, executeCommands використовує AST animation
  pagesArtifact.test.js          — allowlist Cloudflare Pages: основний сайт, музей та ігри без tests/logs/експериментів
  astRuntimeTestUtils.js         — AST runtime helper для parser-тестів; random-аргументи лишаються символічними
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
- ліміти вкладеності блоків і числових виразів без витоку системних `RangeError`

**Controllers / UI:**
- GIF: скасування між записом і створенням Worker та перед завантаженням не створює файл; помилка кодування після ліміту запису повертає `failed` і повідомляється користувачу.
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
- keyboard tabs уроків, навчальні X/Y/кут полотна, читання стану на запит і bounded-журнал

**Page-level contracts:**
- lessons: порядок уроків, URL-резолвер, prev/next стан
- manual: секції, deep-link aliases, пагінація, фільтри
- навчальні приклади: унікальні `data-example-id`, очікувані помилки, примітиви, змінні, траєкторії та обмежені game ticks через production parser/runtime. Покриті також навмисно помилкові приклади вправ «Знайди помилку» (уроки 1, 2, 4, 6, 8, 9): для них зафіксовано саме хибну поведінку — незамкнений контур, зайва сполучна лінія чи подвійна зміна кольору — щоб виправлення не втратило навчальний сенс
- quiz: теми, контракти питань
- encoding: UTF-8, відсутність BOM, відсутність `/v4beta/`-шляхів
- release version: синхронізація SW та HTML

**E2E:**
- головний smoke: редактор відкривається, код виконується
- модальні вікна: help, download, stop-confirm, example-confirm — Escape, focus return
- вибір прикладу: непорожній відмінний код не замінюється без явного підтвердження
- accessibility panel: focus trap, high contrast, persistence
- game mode: блокування scroll, start/stop
- download: PNG, TXT і GIF export; GIF-тест читає збережений файл і перевіряє сигнатуру `GIF89a`, а окремі тести покривають скасування без завантаження файлу та відмову для ігрової програми без очищення малюнка
- mobile tabs: збереження canvas при перемиканні
- offline PWA: сторінки доступні після warm cache, runtime HTML має пріоритет, versioned static miss не підміняється bare URL

## 6. Browser performance boundary

Команда `npm run perf:ast` запускає production parser/runtime у headless Chrome, відкидає 3 warmup runs і окремо міряє 10 запусків parsing та одного `runtime.step()`. Вона використовує Playwright Chromium або шлях із `RAVLYK_BROWSER_PATH` і не змінює runtime budgets.

Вимірювання 2026-09-08: Windows 10 x64, Google Chrome 152 headless, 20 logical processors (`navigator.hardwareConcurrency`), 16 GiB browser-reported device memory, viewport 1280×720. Локальний Node для orchestration — v22.23.0; CI-контракт залишається Node 24.

- вираз із 200 доданків усередині 500 повторів: parse min/median/max 0.3/0.5/1.3 ms; один `runtime.step()` 2.9/3.1/3.4 ms;
- вкладені порожні цикли 500×500: parse 0/0/0.1 ms; один `runtime.step()` 0/0.1/0.4 ms;
- задач понад 50 ms: 0 з 10 у кожному вимірі.

На цьому пристрої підстав для cooperative yield не відтворено, тому runtime не ускладнювався. Це локальна межа перевірки, а не універсальна гарантія для слабших шкільних пристроїв.

## 7. CI

Файл: `.github/workflows/ci.yml`

Запускається на кожен push до `main` або `master` та на pull request.

```yaml
- Setup Node.js 24
- npm ci
- npx playwright install --with-deps chromium firefox webkit
- npm run test:unit
- npm run test:projects
- npm run html:check-partials
- npm run precache:check
- npm run docs:check
- npm run lint
- npm run test:e2e -- --reporter=dot
```

## 8. Що залишається ручною перевіркою

- Screen reader smoke на `index.html`, `manual.html`, `lessons.html`
- Фінальна візуальна перевірка larger text, reduced motion, simpler font, increased spacing
- Крос-браузерний manual smoke в Chrome, Edge, Firefox, Safari
- Production PWA smoke після deploy; локальний E2E уже перевіряє offline reload після warm cache
- Service Worker upgrade smoke між двома справжніми release tokens у вже відкритій вкладці
- Відкриття збереженого GIF у переглядачі зображень і перевірка, що анімація виглядає правильно. Успішне кодування, cancel і frame/byte limit уже покриті автоматично (`index.smoke.spec.js`, `gifExport.test.js`); ручною лишається саме візуальна оцінка результату

Детальний чеклист: [`ACCESSIBILITY_CHECKLIST.md`](ACCESSIBILITY_CHECKLIST.md)

## 9. Відомі обмеження

- Firefox E2E (`firefox-smoke`) може не запускатися в headless-режимі на Windows через системні залежності. На CI (Linux) працює нормально.
- Firefox/WebKit smoke покриває `cross-browser.smoke.spec.js` (6 тестів), зокрема вихід із редактора клавіатурою, захист коду під час вибору прикладу та збереження малюнка після помилок.
- Offline PWA тест (`pwa.offline.spec.js`) вимагає попереднього warm cache і не гарантує першого офлайн-завантаження або upgrade між двома production-релізами.
