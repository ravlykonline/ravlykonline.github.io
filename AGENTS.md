# AGENTS.md

Цей документ — інструкція для Codex, Claude Code та інших агентів, які будуть змінювати код РАВЛИК. Не починайте рефакторинг без прочитання цього файлу, `ARCHITECTURE.md`, `SECURITY.md`, `LANGUAGE_SPEC.md` і `TESTING.md`.

## 1. Головна мета

Підготувати РАВЛИК до стабільного публічного використання дітьми й учителями:

- без зависань браузера;
- з передбачуваною мовою;
- з чесною документацією;
- з робочим CI;
- з тестами;
- з безпечним PWA-кешуванням;
- без зайвого ускладнення стеку.

## 2. Поточний технологічний контекст

Проєкт зараз — статичний сайт:

- HTML;
- CSS;
- JavaScript ES Modules;
- Canvas 2D;
- Service Worker;
- Google Analytics;
- без backend;
- без npm/build/test інфраструктури в поточному архіві.

Не додавайте React/Vue/Svelte/Next/Vite без окремого архітектурного рішення. Поточний пріоритет — стабілізувати ядро, а не змінити стек.

## 3. Найважливіші знайдені проблеми

### P0 — критично

1. `.github/workflows/e2e-ui.yml` дивиться в неіснуючу папку `version_4`.
2. `README.md` посилається на неіснуючі файли й npm-команди.
3. Вкладені цикли можуть створити величезну кількість команд і зависити браузер.
4. Немає глобального operation budget.
5. Існують два різні runtime-шляхи: AST -> legacy queue і прямий AST game runner.

### P1 — високо

1. Немає semantic validator.
2. Reserved names не перевіряються повністю.
3. Дублікати параметрів функцій не заборонені.
4. Зайві аргументи функцій можуть ігноруватися.
5. Share-link через `#code=` може випадково потрапити в analytics page_location.
6. Service Worker має root scope і широке кешування.

### P2 — середньо

1. Немає CSP/security headers.
2. Версія релізу захардкожена у багатьох файлах.
3. Accessibility panel і загальні HTML-блоки дублюються.
4. `manualPageController.js` має UX-баг із початковим текстом кнопки копіювання.
5. `.github/workflows/e2e-ui.yml` має BOM.

## 4. Правила роботи агента

1. Не переписуйте весь проєкт без потреби.
2. Не змінюйте візуальний стиль, якщо завдання стосується ядра мови або безпеки.
3. Не додавайте залежності, якщо проблему можна вирішити простим JS.
4. Не використовуйте `eval`, `new Function`, dynamic code execution.
5. Не вставляйте користувацькі дані через `innerHTML`.
6. Кожна зміна мови має оновити `LANGUAGE_SPEC.md`.
7. Кожне виправлення runtime має отримати тест.
8. Не вмикайте агресивний autosave дитячого коду в `localStorage`.
9. Service Worker змінюйте обережно: він може залишати старий код у браузері користувача.
10. Якщо зміна може зламати існуючі уроки/посібник — спочатку додайте regression tests.

## 5. Рекомендований порядок робіт

## Крок 1. Стабілізувати репозиторій

Завдання:

- створити `package.json`;
- додати test scripts;
- виправити `.github/workflows/e2e-ui.yml`;
- прибрати BOM з workflow;
- оновити `README.md`, щоб він не посилався на неіснуючі файли або позначав їх як TODO;
- додати `.editorconfig` і `.gitignore`.

Критерій готовності:

```bash
npm ci
npm run check
```

мають запускатися локально й у GitHub Actions.

## Крок 2. Додати static security/encoding checks

Створити:

```text
tests/encoding.test.js
tests/security.static.test.js
```

Перевірити:

- UTF-8 без BOM;
- відсутність `eval`, `new Function`, `document.write`;
- небезпечні `innerHTML` не використовують user input;
- README не має битих посилань на локальні файли без TODO.

## Крок 3. Додати semantic validator

Створити:

```text
js/modules/semanticValidator.js
```

Він має приймати AST і повертати checked AST або кидати `RavlykError`.

Мінімальні перевірки:

- reserved function names;
- reserved variable names;
- reserved parameter names;
- duplicate functions;
- duplicate parameters;
- variable/function conflicts;
- wrong function argument count;
- empty function body;
- game mode top-level rules;
- max AST nodes;
- max parse depth або nesting depth.

Після парсингу у `ravlykParser` або в `executionController` має бути етап:

```js
const ast = parser.parseCodeToAst(code);
const checkedAst = validateProgramAst(ast, options);
```

## Крок 4. Закрити DoS через цикли

Не покладатися тільки на `MAX_REPEATS_IN_LOOP`.

Додати:

```js
MAX_TOTAL_OPERATIONS
MAX_COMMAND_QUEUE_LENGTH
MAX_GAME_TICK_OPERATIONS
MAX_FUNCTION_CALLS_PER_RUN
```

Як тимчасовий захід до повного AST runtime:

- у `interpreterAstQueueAdapter.js` рахувати довжину `output`;
- якщо вона перевищує `MAX_COMMAND_QUEUE_LENGTH`, кидати дружню помилку;
- у game runner рахувати operations per tick.

Це не ідеальна архітектура, але швидко закриває критичний ризик.

## Крок 5. Уніфікувати runtime

Це великий етап. Не робити його в одному патчі з усім іншим.

Ціль:

```text
AST -> semantic validator -> AST runtime -> drawing/animation adapter
```

Замість:

```text
AST -> legacy queue -> queue runtime
AST -> game runner
```

Рекомендована модель runtime:

```js
class RuntimeFrame {
  constructor(statements, env) {
    this.statements = statements;
    this.index = 0;
    this.env = env;
  }
}
```

Frame types:

- ProgramFrame;
- RepeatFrame;
- FunctionFrame;
- IfFrame;
- GameFrame.

Кожен крок runtime виконує малу кількість операцій і повертає управління браузеру.

## Крок 6. Виправити analytics privacy

У `js/analytics.js` не передавати hash:

```js
const safePageLocation = windowRef.location.origin
  + windowRef.location.pathname
  + windowRef.location.search;

windowRef.gtag('config', ANALYTICS_MEASUREMENT_ID, {
  page_location: safePageLocation,
});
```

Або не запускати analytics для `#code=`.

## Крок 7. Виправити Service Worker

Завдання:

- не реєструвати SW у dev, якщо немає production host;
- прибрати root scope, якщо продукт живе в `/go/`;
- обмежити runtime cache allowlist;
- додати try/catch навколо `cache.put`;
- додати cleanup старих cache entries;
- тримати cache version в одному місці.

## Крок 8. Додати E2E

Мінімум:

- редактор відкривається;
- квадрат виконується;
- помилка показується;
- manual відкривається;
- share-link завантажує код у textarea;
- malicious nested loops не зависають.

## 6. Заборонені зміни без окремого рішення

Не робити без окремого підтвердження власника проєкту:

- переведення на React/Vue/Angular;
- додавання backend;
- додавання облікових записів;
- збереження дитячого коду в хмарі;
- агресивний autosave між сесіями;
- заміна синтаксису мови;
- зміна доменної структури;
- зміна ліцензування;
- зміна візуальної айдентики.

## 7. Стиль коду

Поки немає ESLint/Prettier, дотримуватися поточного стилю:

- ES modules;
- named exports;
- без глобальних side effects у core-модулях;
- DOM-операції тримати в UI-модулях;
- parser/runtime не мають залежати від DOM;
- помилки через `RavlykError` або сумісні error objects;
- дружні повідомлення брати з `constants.js`.

## 8. Як додавати нову команду мови

Для кожної нової команди потрібно:

1. Оновити `LANGUAGE_SPEC.md`.
2. Додати tokenizer support, якщо потрібен новий тип токена.
3. Додати parser statement.
4. Додати semantic validation.
5. Додати runtime behavior.
6. Додати manual/lessons приклад.
7. Додати unit tests.
8. Додати E2E, якщо команда впливає на UI/Canvas.

Не додавати команду тільки в parser або тільки в runtime.

## 9. Як працювати з помилками

Користувач — дитина або вчитель. Тому повідомлення:

- не мають містити stack trace;
- не мають містити англомовні JS-помилки;
- мають пояснювати, що виправити;
- бажано мають показувати рядок і колонку.

Погано:

```text
TypeError: Cannot read properties of undefined
```

Добре:

```text
У виклику "квадрат" не вистачає аргумента. Функція очікує 1 значення.
```

## 10. Known quick fixes

Ці виправлення можна зробити швидко й окремими PR:

### 10.1. Manual copy button label

У `js/modules/manualPageController.js` початковий label має бути `Скопіювати`, а не `Скопійовано`.

Знайти:

```js
copyButton.innerHTML = '<span class="ui-icon icon-copy" aria-hidden="true"></span><span class="manual-code-copy-label">Скопійовано</span>';
```

Замінити початковий стан на:

```js
copyButton.innerHTML = '<span class="ui-icon icon-copy" aria-hidden="true"></span><span class="manual-code-copy-label">Скопіювати</span>';
```

Після натискання лишити `Скопійовано`, а після timeout повертати `Скопіювати`.

### 10.2. Analytics safe page_location

У `js/analytics.js` передавати `page_location` без hash.

### 10.3. Workflow path

У `.github/workflows/e2e-ui.yml` прибрати `version_4`, якщо код лишається в корені.

### 10.4. BOM

Прибрати BOM з `.github/workflows/e2e-ui.yml`.

## 11. Definition of Done для PR

PR можна вважати готовим, якщо:

- зміна маленька й сфокусована;
- оновлено відповідну документацію;
- додано або оновлено тести;
- `npm run check` проходить;
- немає нових global side effects;
- немає погіршення accessibility;
- немає нових hardcoded release versions;
- Service Worker не ламає старий production cache без плану міграції;
- дитячі повідомлення про помилки залишаються дружніми.

## 12. Пріоритетний backlog для агента

1. Додати `package.json` і мінімальні тести.
2. Виправити GitHub Actions.
3. Прибрати BOM.
4. Додати static security checks.
5. Додати semantic validator.
6. Додати runtime operation budgets.
7. Виправити analytics hash privacy.
8. Обмежити Service Worker scope/cache.
9. Уніфікувати AST runtime.
10. Прибрати дублювання HTML-компонентів.

## 13. Головне архітектурне правило

Не нарощувати функції поверх крихкого runtime. Спочатку стабільність ядра, ліміти, semantic validation і тести. Після цього можна розширювати мову, ігровий режим і навчальні матеріали.
