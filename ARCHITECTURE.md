# ARCHITECTURE.md

Документ фіксує поточну архітектуру проєкту РАВЛИК, відкриті технічні борги та напрям подальшого рефакторингу. Він має бути практичним джерелом істини для розробника або агента, який змінює код, а не архівом уже закритих проблем.

## 1. Поточний стан проєкту

РАВЛИК — статичний браузерний освітній застосунок для навчання дітей програмуванню українською мовою. Поточна реалізація використовує:

- HTML-сторінки без серверного рендерингу;
- CSS-файли без build-кроку;
- JavaScript ES Modules;
- Canvas 2D для малювання;
- власний lexer/parser/interpreter для мови РАВЛИК;
- PWA Service Worker;
- URL hash для поширення коду;
- Google Analytics через `js/analytics.js`.

## 2. Інвентаризація репозиторію

Структура репозиторію:

- 9 HTML-сторінок: `index.html`, `manual.html`, `lessons.html`, `quiz.html`, `resources.html`, `teacher_guidelines.html`, `advice_for_parents.html`, `about.html`, `zen.html`
- JavaScript entrypoints у `js/` та core/UI modules у `js/modules/`
- CSS-файли у `css/`
- `tests/` — unit і integration тести (Node.js)
- `tests/e2e/` — Playwright E2E тести
- `package.json`, `package-lock.json`, `playwright.config.js` — тестове середовище
- `scripts/` — допоміжні скрипти (`sync-release-version.mjs`, `sync-html-partials.mjs`)
- `.github/workflows/ci.yml` — CI pipeline (Node.js 24, Chromium/Firefox/WebKit)
- PWA-файли: `sw.js`, `site.webmanifest`, іконки
- Навчальні зображення та `resources/Pre_CodingActivity_Ravlyk_UA.pdf`
- Документація: `README.md`, `TECHNICAL_GUIDE.md`, `DESIGN_GUIDE.md`, `ARCHITECTURE.md`, `LANGUAGE_SPEC.md`, `SECURITY.md`, `TESTING.md`, `CONTRIBUTING.md`, `RELEASE_CHECKLIST.md`, `ACCESSIBILITY_CHECKLIST.md`, `BRAND_POLICY.md`, `LICENSE`, `LICENSE-CONTENT.md`
- Окремі незалежні підпроєкти: `artist/`, `game/`, `go/`, `maisternia/` — мають власну інфраструктуру і не є частиною основного РАВЛИК-сайту
- `old/` — архів попередніх версій

## 5. Поточна карта модулів

### 5.1. Сторінки

- `index.html` — основний редактор.
- `manual.html` — посібник.
- `lessons.html` — уроки.
- `quiz.html` — тести/вікторини.
- `resources.html` — матеріали.
- `teacher_guidelines.html` — методичні поради.
- `advice_for_parents.html` — поради для батьків.
- `about.html` — про проєкт.
- `zen.html` — спрощений/дзен-режим.

### 5.2. Основні JS entrypoints

- `js/main.js` — запуск редактора.
- `js/manualPage.js` — запуск логіки посібника.
- `js/lessonsPage.js` — запуск уроків.
- `js/quizPage.js` — запуск тестів.
- `js/accessibility.js` — глобальні налаштування доступності.
- `js/analytics.js` — підключення Google Analytics.
- `js/registerServiceWorker.js` — реєстрація Service Worker.

### 5.3. Ядро мови

- `js/modules/parserTokenizer.js` — токенізація коду, підтримка коментарів через `#`, рядків у лапках, операторів, дужок.
- `js/modules/ravlykParser.js` — головний клас парсера.
- `js/modules/parserExpressions.js` — числові вирази, унарні оператори, `+`, `-`, `*`, `/`, `%`.
- `js/modules/parserBlocksConditions.js` — блоки в дужках, умови, пошук закриваючих дужок.
- `js/modules/parserMotionStatements.js` — рух, повороти, перехід.
- `js/modules/parserStateStatements.js` — колір, фон, товщина, олівець, змінні, виклики функцій.
- `js/modules/parserControlStatements.js` — `повторити`, `якщо`, `інакше`, `грати`.
- `js/modules/parserCreateStatement.js` — створення змінних і функцій.
- `js/modules/parserStatementDispatcher.js` — маршрутизація команд.

### 5.4. Runtime / Interpreter

- `js/modules/ravlykInterpreter.js` — головний клас інтерпретатора.
- `js/modules/ravlykInterpreterRuntime.js` — збірка runtime-процесів.
- `js/modules/interpreterAstRuntime.js` — спільний frame-based AST runtime; використовується і для звичайного режиму (через queue adapter), і для ігрового режиму. Один env-об'єкт на всі кадри — зміни змінних у `якщо`-блоках видимі наступним командам.
- `js/modules/interpreterAstQueueAdapter.js` — перетворення AST у legacy command queue для animation path.
- `js/modules/interpreterQueueRuntime.js` — виконання command queue через `requestAnimationFrame`.
- `js/modules/interpreterCommandExecutor.js` — виконання однієї runtime-команди; MOVE/TURN/GOTO зберігають вираз (`distanceExpr`/`angleExpr`/`xExpr`/`yExpr`) і обчислюють значення ліниво під час виконання.
- `js/modules/interpreterGameAstRunner.js` — ігровий режим (`грати`): init-фаза + тік через `createAstRuntime`.
- `js/modules/interpreterPrimitiveStatements.js` — виконання базових AST-команд у queue-режимі та immediate-режимі.
- `js/modules/interpreterConditions.js` — перевірка умов.
- `js/modules/interpreterAstEval.js` — обчислення числових AST-виразів.
- `js/modules/environment.js` — середовище змінних.

### 5.5. UI / редактор

- `js/modules/executionController.js` — запуск/зупинка виконання.
- `js/modules/editorInputController.js` — робота з textarea редактора.
- `js/modules/editorUi.js` — UI редактора.
- `js/modules/fileActionsController.js` — збереження зображення, коду, share-link, завантаження коду з URL hash.
- `js/modules/ui.js`, `uiMessages.js`, `uiModals.js` — повідомлення та модальні елементи.
- `js/modules/modalController.js` — модальні вікна.
- `js/modules/workspaceTabs.js` — вкладки робочої області.
- `js/modules/gridOverlay.js` — сітка на полотні.

## 6. Що в архітектурі зроблено добре

1. **Немає серверної залежності.** Для навчального інструмента це знижує складність, ризики витоку даних і вартість підтримки.
2. **Використано ES Modules.** Код уже частково розділений на відповідальності.
3. **Немає `eval()` / `new Function()`.** Це дуже важливо для безпеки користувацького коду.
4. **Є власний AST-парсер.** Це правильніше, ніж виконувати код через JS.
5. **Є дружні повідомлення про помилки.** У `constants.js` уже закладено багато хороших текстів для дітей.
6. **Є PWA-режим.** Для школи офлайн-доступ може бути корисним.
7. **Є accessibility-модулі.** Це сильна сторона проєкту.

## 7. Поточні архітектурні борги

## 7.1. Animation path ще залежить від legacy queue

У проєкті вже є спільний frame-based `createAstRuntime` у `interpreterAstRuntime.js`. Game mode виконує AST напряму через цей runtime. Звичайний animation path поки проходить через:

```text
AST -> interpreterAstQueueAdapter.js -> command queue -> interpreterQueueRuntime.js
```

Це означає, що семантика AST уже частково уніфікована, але animation path ще будує плоску command queue.

**Що вже виправлено:**

```ravlyk
створити x = 1
якщо 1 = 1 (
  x = 5
)
вперед x
```

Раніше: Равлик рухався на **1** крок — значення `x` у `вперед x` заморожувалось на момент побудови черги, зміни всередині `якщо` ігнорувались.

Тепер: Равлик рухається на **5** кроків. `createAstRuntime` використовує один спільний env-об'єкт для всіх кадрів (без клонування), тому зміни в `якщо`-гілці одразу видимі.

**Ліниве обчислення виразів:** MOVE/TURN/GOTO зберігають AST-вираз у черзі (`distanceExpr`, `angleExpr`, `xExpr`/`yExpr`) і обчислюють його під час анімації проти `executionEnv`. Випадкові значення залишаються завчасно обчисленими (один random pick).

**Що залишилось:** прибрати повне розгортання циклів у `interpreterAstQueueAdapter.js` і виконувати animation path ліниво через AST runtime.

## 7.2. Розгортання циклів у чергу

`interpreterAstQueueAdapter.js` розгортає `RepeatStmt` у багато команд:

```js
for (let idx = 0; idx < countValue; idx++) {
  for (const nested of stmt.body || []) {
    runStmt(nested, env, out, callDepth);
  }
}
```

Це архітектурно небажано. Критичний ризик зависання вже закритий overflow checks, але синхронне створення плоскої черги лишається технічним боргом.

### Ціль

- не створювати плоский список команд для всіх повторів;
- виконувати цикл ліниво: один AST-крок за раз;
- використати `createAstRuntime` як основу і для animation path;
- зберегти дружні помилки при перевищенні budget.

## 7.3. Semantic analyzer ✓ ЗАВЕРШЕНО

У `js/modules/semanticValidator.js` є semantic validation після парсингу. Він перевіряє:

- reserved names для функцій, змінних і параметрів;
- дублікати функцій;
- дублікати параметрів;
- конфлікти змінна/функція;
- порожні функції;
- невідомі виклики функцій;
- точну кількість аргументів функцій;
- top-level правила `грати`;
- AST node budget (`MAX_AST_NODES = 5000`).

Validator підключено в `RavlykParser.parseCodeToAst`, тож AST проходить перевірку до runtime.

## 7.4. Service Worker прив'язаний до кореня сайту

`js/registerServiceWorker.js` реєструє `/sw.js` зі scope `/`. Це нормально лише тоді, коли production-версія справді живе в корені домену. Для GitHub Pages, beta-середовищ або підпапок це може давати конфлікти кешу.

### Рішення

- Визначити production path: `/`, `/go/` або інше.
- Реєструвати SW тільки в production.
- Використовувати відносний scope або явно обмежений scope.
- Для beta/dev використовувати окремий cache namespace.

## 7.5. Release version синхронізується скриптом

Release/cache token присутній у кількох HTML/JS/SW entrypoints, але його синхронізація вже контролюється `scripts/sync-release-version.mjs` і `tests/releaseVersion.test.js`.

### Поточне правило

- зміну release token робити через `npm run release:sync-version`;
- не редагувати версію вручну в одному файлі;
- перед релізом запускати `npm run check`.

Довгостроково можна перейти до одного runtime source-of-truth або build-time підстановки, але зараз duplication guarded tests-ами.

## 7.6. Shared HTML partials

Панель доступності, footer і повторювані навігаційні блоки синхронізуються через `scripts/sync-html-partials.mjs`.

### Поточне правило

- `npm run html:sync-partials` оновлює HTML.
- `npm run html:check-partials` перевіряє синхронність без запису файлів.
- CI запускає `html:check-partials`.

Не додавати нові копії shared HTML вручну без маркерів partial sync.

## 8. Цільова архітектура

Рекомендована структура після рефакторингу:

```text
src/
  core/
    lexer/
      tokenizer.js
    parser/
      parser.js
      expressions.js
      statements.js
    semantic/
      validateProgram.js
      symbols.js
      builtins.js
    runtime/
      astRuntime.js
      runtimeFrames.js
      operationBudget.js
      drawingCommands.js
      gameRuntime.js
    errors/
      RavlykError.js
      messages.js
  editor/
    editorController.js
    canvasController.js
    executionController.js
    fileActionsController.js
  components/
    accessibilityPanel.js
    modal.js
    toast.js
    footer.js
  pages/
    index.js
    manual.js
    lessons.js
    quiz.js
  content/
    lessons/
    manual/
    quiz/
  pwa/
    sw.js
    registerServiceWorker.js
  config/
    version.js
    analytics.js
public/
  assets/
  icons/
  images/
tests/
  unit/
  integration/
  e2e/
```

Якщо не вводити build-step зараз, можна залишити поточну структуру, але логічно рухатися до такого поділу відповідальностей.

## 9. Архітектурні правила для подальших змін

1. **Ядро мови не має залежати від DOM.** Parser, semantic validator і runtime мають тестуватися без браузера.
2. **UI не має знати внутрішню структуру парсера.** UI запускає `runProgram(code, options)` і отримує події/операції.
3. **AST — єдине джерело істини.** Не дублювати логіку в queue runtime і game runtime.
4. **Жодного `eval`, `new Function`, dynamic import із користувацького коду.**
5. **Кожна нова команда мови додається в 5 місцях:** spec, parser, semantic tests, runtime tests, manual.
6. **Кожна зміна Service Worker супроводжується зміною версії кешу і тестом оновлення.**
7. **Кожен баг runtime має отримати regression test.**

## 10. План рефакторингу архітектури

### Етап 1. Стабілізація репозиторію ✓

- ✓ README оновлено
- ✓ `package.json`, `package-lock.json`, `playwright.config.js` додано в корінь
- ✓ GitHub Actions (`ci.yml`) налаштовано на корінь, Node.js 24
- ✓ `tests/` розгорнуто з повним набором unit та E2E тестів
- ✓ `.editorconfig`, `.gitattributes`, `.gitignore` додано
- ✓ CSP додано до всіх 9 публічних HTML-сторінок

### Етап 2. Обмеження виконання ✓ (основне завершено)

- ✓ Додано `MAX_AST_NODES = 5000` — перевіряється у `semanticValidator.js`.
- ✓ Додано `MAX_PARSE_DEPTH = 20` — перевіряється в `ravlykParser.js` через `_parseDepth` лічильник.
- ✓ `MAX_COMMAND_QUEUE_LENGTH = 50000` — захищає legacy queue від надмірного розгортання команд.
- ✓ Лічильник `astStepCount` в `interpreterAstRuntime.js` (параметр `maxAstSteps`) рахує кожен AST-крок включно з присвоєннями та control-flow — використовується для game tick budget.
- ✓ `EXECUTION_TIMEOUT_MS = 180s` — time-based fallback.
- ✓ `MAX_GAME_TICK_OPERATIONS = 500` — передається у `createAstRuntime` через `maxAstSteps`; `astStepCount` рахує кожен AST-крок і кидає `GAME_TICK_OVERFLOW` при перевищенні.
- ✓ Overflow check на початку кожної RepeatStmt ітерації в `interpreterAstQueueAdapter.js` — nested loops fail fast без побудови мільйонів команд.
- Залишилось: повна lazy execution (не будувати плоский масив взагалі) — великий рефактор (§7.2).

### Етап 3. Semantic validation ✓ ЗАВЕРШЕНО

- ✓ Додано symbol table.
- ✓ Заборонено reserved names для змінних, функцій і параметрів.
- ✓ Заборонено дублікати функцій і параметрів.
- ✓ Перевіряється кількість аргументів.
- ✓ Перевіряються top-level правила `грати`.
- ✓ Додано AST node budget.
- ✓ Додано parse/nesting depth budget.

### Етап 4. Єдиний AST runtime (частково ✓)

- ✓ Створено `interpreterAstRuntime.js` — frame-based runtime зі спільним env.
- ✓ Ігровий режим (`interpreterGameAstRunner.js`) переписано на `createAstRuntime`.
- ✓ Виправлено семантичний баг зі змінними в `якщо`-блоках (§7.1).
- ✓ MOVE/TURN/GOTO обчислюються ліниво під час анімації.
- Залишилось: прибрати розгортання циклів у `interpreterAstQueueAdapter.js` повністю (§7.2) — зараз захищено overflow check, але масив все одно будується синхронно.

### Етап 5. Компоненти й PWA

- ✓ Уніфікована accessibility panel і HTML/navigation partials через `scripts/sync-html-partials.mjs`.
- Переписати Service Worker на allowlist + bounded runtime cache.
- Додати окремий режим dev/prod для SW.

## 11. Критерії готовності архітектури

Архітектуру можна вважати стабільною, коли:

- CI запускається на кожен PR і перевіряє актуальний код;
- усі тести проходять локально і в GitHub Actions;
- немає двох різних семантик виконання мови;
- шкідливі вкладені цикли не зависають;
- нові релізи не змішуються зі старими через Service Worker;
- документація відповідає реальному стану коду;
- кожна команда мови описана в `LANGUAGE_SPEC.md` і покрита тестами.
