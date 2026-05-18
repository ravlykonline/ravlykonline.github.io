# ARCHITECTURE.md

Документ фіксує поточну архітектуру проєкту РАВЛИК, виявлені проблеми та цільовий напрям рефакторингу. Його завдання — бути практичним джерелом істини для людини-розробника, Codex, Claude Code або іншого агента, який буде змінювати код.

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
- 63 JavaScript-файли в `js/` та `js/modules/`
- 11 CSS-файлів у `css/`
- `tests/` — unit і integration тести (Node.js)
- `tests/e2e/` — Playwright E2E тести
- `package.json`, `package-lock.json`, `playwright.config.js` — тестове середовище
- `scripts/` — допоміжні скрипти (`sync-release-version.mjs`)
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

## 7. Ключові архітектурні проблеми

## 7.1. Два різні runtime-шляхи ✓ ВИРІШЕНО

~~Зараз існує дві моделі виконання~~. Обидва режими тепер використовують спільний `createAstRuntime` з `interpreterAstRuntime.js`.

**Що було виправлено:**

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

**Що залишилось:** queue adapter (`interpreterAstQueueAdapter.js`) все ще розгортає цикли в плоску чергу. Це адресується в §7.2.

## 7.2. Розгортання циклів у чергу

`interpreterAstQueueAdapter.js` розгортає `RepeatStmt` у багато команд:

```js
for (let idx = 0; idx < countValue; idx++) {
  for (const nested of stmt.body || []) {
    runStmt(nested, env, out, callDepth);
  }
}
```

Це архітектурно небезпечно. Навіть якщо один цикл обмежено `MAX_REPEATS_IN_LOOP = 500`, вкладені цикли можуть створити сотні тисяч або мільйони команд.

### Рішення

- Не створювати плоский список команд для всіх повторів.
- Виконувати цикл ліниво: один крок за раз.
- Додати глобальний бюджет операцій `MAX_TOTAL_OPERATIONS`.

## 7.3. Відсутній semantic analyzer

У `constants.js` є повідомлення для таких помилок:

- `FUNCTION_NAME_RESERVED`;
- `VARIABLE_NAME_RESERVED`;
- `FUNCTION_ALREADY_EXISTS`;
- `FUNCTION_NAME_CONFLICT_VARIABLE`;
- `VARIABLE_NAME_CONFLICT_FUNCTION`;
- `FUNCTION_PARAM_RESERVED`;
- `FUNCTION_BODY_EMPTY`.

Але в `parserCreateStatement.js` більшість цих перевірок фактично не виконується.

### Наслідки

Можливі некоректні програми:

```ravlyk
створити вперед() (
  назад 10
)
```

```ravlyk
створити x = 1
створити x() (
  вперед 10
)
```

```ravlyk
створити f(a, a) (
  вперед a
)
```

```ravlyk
створити f(a) (
  вперед a
)
f(10, 20)
```

### Рішення

Створити модуль:

```text
js/modules/semanticValidator.js
```

Він має проходити AST після парсингу і до виконання.

## 7.4. Service Worker прив'язаний до кореня сайту

`js/registerServiceWorker.js`:

```js
const SERVICE_WORKER_URL = '/sw.js?v=2026-03-13-2';
navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: '/' });
```

Це нормально лише для production-домену в корені. Для GitHub Pages, beta-середовищ, `/go/` або підпапок це може давати конфлікти кешу.

### Рішення

- Визначити production path: `/`, `/go/` або інше.
- Реєструвати SW тільки в production.
- Використовувати відносний scope або явно обмежений scope.
- Для beta/dev використовувати окремий cache namespace.

## 7.5. Версія релізу захардкожена в багатьох місцях

Токен `2026-03-13-2` зустрічається у HTML, JS і `sw.js`. Це крихко.

### Рішення

- Ввести єдине джерело версії: `js/modules/version.js` або build-time змінну.
- Додати script `release:sync-version`.
- Додати тест, який падає, якщо в репозиторії є більше одного release token.

## 7.6. Компоненти дублюються в HTML

Панель доступності, footer, navigation-патерни й частина метаданих повторюються у багатьох HTML-файлах.

### Рішення

На поточному етапі без важкого фреймворку:

- створити JS-компоненти для повторюваних блоків;
- або використовувати простий build-step з HTML partials;
- або мінімальний static generator.

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

### Етап 2. Обмеження виконання

- Додати `MAX_AST_NODES`.
- Додати `MAX_PARSE_DEPTH`.
- Додати `MAX_TOTAL_OPERATIONS`.
- Додати `MAX_GAME_TICK_OPERATIONS`.
- Заборонити експоненційне розгортання циклів.

### Етап 3. Semantic validation

- Додати symbol table.
- Заборонити reserved names.
- Заборонити дублікати функцій і параметрів.
- Перевіряти кількість аргументів.
- Перевіряти top-level правила `грати`.

### Етап 4. Єдиний AST runtime (частково ✓)

- ✓ Створено `interpreterAstRuntime.js` — frame-based runtime зі спільним env.
- ✓ Ігровий режим (`interpreterGameAstRunner.js`) переписано на `createAstRuntime`.
- ✓ Виправлено семантичний баг зі змінними в `якщо`-блоках (§7.1).
- ✓ MOVE/TURN/GOTO обчислюються ліниво під час анімації.
- Залишилось: прибрати розгортання циклів у `interpreterAstQueueAdapter.js` (§7.2).

### Етап 5. Компоненти й PWA

- Уніфікувати accessibility panel.
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
