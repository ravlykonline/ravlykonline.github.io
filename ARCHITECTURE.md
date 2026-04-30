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

Проєкт зараз більше схожий на статичний production snapshot, ніж на повністю підготовлений engineering-репозиторій. Є робочий код продукту, але не вистачає тестової, build- та release-інфраструктури.

## 2. Інвентаризація архіву

На момент аналізу в архіві виявлено:

- 9 HTML-сторінок: `index.html`, `manual.html`, `lessons.html`, `quiz.html`, `resources.html`, `teacher_guidelines.html`, `advice_for_parents.html`, `about.html`, `zen.html`;
- 63 JavaScript-файли;
- 11 CSS-файлів;
- 1 Markdown-файл: `README.md`;
- 1 GitHub Actions workflow: `.github/workflows/e2e-ui.yml`;
- PWA-файли: `sw.js`, `site.webmanifest`, іконки;
- навчальні зображення та PDF-ресурс `resources/Pre_CodingActivity_Ravlyk_UA.pdf`.

Не виявлено:

- `package.json`;
- `package-lock.json`;
- `tests/`;
- `LICENSE`;
- `TECHNICAL_GUIDE.md`;
- `DESIGN_GUIDE.md`;
- `CONTRIBUTING.md`;
- `RELEASE_CHECKLIST.md`;
- `RELEASE_NIGHT_GUIDE.md`.

## 3. Важлива проблема документації

`README.md` посилається на файли та команди, яких фактично немає в архіві:

- `TECHNICAL_GUIDE.md`;
- `DESIGN_GUIDE.md`;
- `LICENSE`;
- `LICENSE-CONTENT.md`;
- `BRAND_POLICY.md`;
- `CONTRIBUTING.md`;
- `RELEASE_CHECKLIST.md`;
- `RELEASE_NIGHT_GUIDE.md`;
- `npm run test:unit`;
- `npm run test:e2e`;
- `tests/encoding.test.js`.

Це потрібно виправити до подальшого розвитку. Документація має описувати реальний стан репозиторію, інакше агенти будуть робити неправильні припущення.

## 4. Важлива проблема CI/CD

`.github/workflows/e2e-ui.yml` налаштований на неіснуючу папку `version_4`:

```yaml
paths:
  - 'version_4/**'

defaults:
  run:
    working-directory: version_4

cache-dependency-path: version_4/package-lock.json
```

У поточному архіві папки `version_4` немає. Отже workflow фактично не перевіряє актуальний код.

### Як виправити

Варіант A — якщо код має жити в корені:

- прибрати `version_4/**` з paths;
- прибрати `working-directory: version_4`;
- додати `package.json` у корінь;
- налаштувати команди `test:unit`, `test:e2e`, `lint`.

Варіант B — якщо потрібна структура `version_4`:

- перенести весь застосунок у `version_4/`;
- додати `version_4/package.json`;
- тримати GitHub Pages/Cloudflare налаштованими відповідно до нової структури.

Рекомендований варіант для простого статичного сайту — тримати код у корені або в `src/` + `public/`, але не залишати workflow, який дивиться в неіснуючу директорію.

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
- `js/modules/interpreterAstQueueAdapter.js` — перетворення AST у legacy command queue.
- `js/modules/interpreterQueueRuntime.js` — виконання command queue через `requestAnimationFrame`.
- `js/modules/interpreterCommandExecutor.js` — виконання однієї runtime-команди.
- `js/modules/interpreterGameAstRunner.js` — пряме виконання AST для ігрового режиму.
- `js/modules/interpreterPrimitiveStatements.js` — виконання базових AST-команд.
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

## 7.1. Два різні runtime-шляхи

Зараз існує дві моделі виконання:

1. Звичайний режим: `AST -> legacy queue -> requestAnimationFrame runtime`.
2. Ігровий режим: пряме виконання AST у `interpreterGameAstRunner.js`.

Це створює ризик різної семантики мови в різних режимах.

### Приклад проблеми

```ravlyk
створити x = 1
якщо 1 = 1 (
  x = 5
)
вперед x
```

Очікувана поведінка: `вперед 5`.

Проблема: у звичайному режимі частина команд і значень може бути обчислена під час побудови черги, тобто до фактичного виконання попередніх команд. Це може давати неочевидну поведінку зі змінними, умовами й функціями.

### Рішення

- Зробити AST єдиним джерелом істини.
- Прибрати попереднє розгортання циклів у плоску чергу.
- Залишити `requestAnimationFrame` тільки як планувальник кроків, а не як runtime-модель мови.
- Runtime має виконувати AST через стек кадрів: `ProgramFrame`, `RepeatFrame`, `FunctionFrame`, `IfFrame`.

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

### Етап 1. Стабілізація репозиторію

- Виправити README.
- Додати `package.json`.
- Виправити GitHub Actions.
- Додати `tests/`.
- Додати `.editorconfig`, `.gitignore`.
- Прибрати BOM з `.github/workflows/e2e-ui.yml`.

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

### Етап 4. Єдиний AST runtime

- Створити `astRuntime.js`.
- Перенести звичайне виконання з legacy queue на AST runtime.
- Ігровий режим зробити окремим scheduler-режимом того самого runtime.
- Залишити animation layer як окремий адаптер.

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
