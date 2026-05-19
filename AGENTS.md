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
- без backend.

Не додавайте React/Vue/Svelte/Next/Vite без окремого архітектурного рішення. Поточний пріоритет — стабілізувати ядро, а не змінити стек.

## 3. Поточний стан і відкриті ризики

### Закрито

- CI, README, базові npm-команди й тестова інфраструктура стабілізовані.
- Semantic validator інтегровано в `RavlykParser.parseCodeToAst`.
- Reserved names, duplicate functions/params, conflicts, unknown function calls і argument count перевіряються validator-ом.
- Parser/runtime limits реалізовані: `MAX_AST_NODES`, `MAX_PARSE_DEPTH`, `MAX_REPEATS_IN_LOOP`, `MAX_COMMAND_QUEUE_LENGTH`, `MAX_GAME_TICK_OPERATIONS`.
- Analytics `page_location` не містить hash, тому `#code=` не потрапляє в Google Analytics.
- Shared accessibility/footer/navigation HTML синхронізується через `scripts/sync-html-partials.mjs` і перевіряється в CI.

### Відкрито

- **P1:** Service Worker має root scope і широке кешування. Потрібні production-only registration, обмежений scope, allowlist runtime cache, `try/catch` для `cache.put`, bounded cleanup.
- **P1:** Animation path ще використовує `interpreterAstQueueAdapter.js` і будує плоску command queue. Критичний DoS-ризик закритий budget-ами, але ціль — lazy AST runtime без розгортання циклів.
- **P2:** Повторне `створити x = ...` ще не оформлено як окреме semantic-правило.
- **P2:** Release/cache token синхронізується скриптом і тестами, але не має одного runtime source-of-truth.

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

## Крок 1. Стабілізувати репозиторій ✓

- ✓ `package.json`, `package-lock.json`, `playwright.config.js` додано в корінь
- ✓ CI виправлено: `ci.yml` працює з кореня, Node.js 24
- ✓ `README.md` оновлено
- ✓ `.editorconfig`, `.gitattributes`, `.gitignore` додано
- ✓ CSP додано до всіх публічних HTML-сторінок

## Крок 2. Додати static security/encoding checks ✓

- ✓ `tests/encoding.test.js` — UTF-8, BOM, структурні регресії, відсутність `/v4beta/`-шляхів
- ✓ Перевірка security-контрактів вбудована в unit-тести

## Крок 3. Semantic validator ✓

Створено:

```text
js/modules/semanticValidator.js
```

Він приймає AST і повертає checked AST або кидає дружню `RavlykError`-сумісну помилку.

Поточні перевірки:

- reserved function names;
- reserved variable names;
- reserved parameter names;
- duplicate functions;
- duplicate parameters;
- variable/function conflicts;
- unknown function calls;
- wrong function argument count;
- empty function body;
- game mode top-level rules.

Всі перевірки реалізовано, включаючи `MAX_PARSE_DEPTH = 20` (лічильник `_parseDepth` у `ravlykParser.js`).

## Крок 4. Закрити DoS через цикли ✓ ЗАВЕРШЕНО

Реалізовано:

- `MAX_AST_NODES = 5000` — перевіряється у `semanticValidator.js`
- `MAX_PARSE_DEPTH = 20` — перевіряється у `ravlykParser.js`
- `MAX_COMMAND_QUEUE_LENGTH = 50000` — `stepCount` у `interpreterAstRuntime.js`
- `MAX_REPEATS_IN_LOOP = 500` — перевіряється під час парсингу
- ✓ `MAX_GAME_TICK_OPERATIONS = 500` — `astStepCount` у `interpreterAstRuntime.js` через `maxAstSteps`; рахує ВСІ AST-кроки (присвоєння, цикли, умови, виклики), не тільки примітиви
- ✓ Overflow check на початку кожної RepeatStmt ітерації в `interpreterAstQueueAdapter.js` — nested loops fail fast

Залишилось:

- Повна lazy execution — `interpreterAstQueueAdapter.js` ще будує плоский масив; захищено overflow check, але масив будується синхронно

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

## Крок 6. Analytics privacy ✓

`safePageLocation()` у `js/analytics.js` вже повертає `origin + pathname + search` без hash. `#code=` не потрапляє в `page_location`.

## Крок 7. Виправити Service Worker

Завдання:

- не реєструвати SW у dev, якщо немає production host;
- прибрати root scope, якщо продукт живе в `/go/`;
- обмежити runtime cache allowlist;
- додати try/catch навколо `cache.put`;
- додати cleanup старих cache entries;
- тримати cache version в одному місці.

## Крок 8. Додати E2E ✓

- ✓ `tests/e2e/` містить повний набір Playwright smoke тестів
- ✓ Покриті: редактор, модалі, accessibility, PWA offline, cross-browser smoke

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

## 10. Definition of Done для PR

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

## 11. Пріоритетний backlog для агента

1. Обмежити Service Worker scope/cache.
2. Прибрати повне розгортання циклів у `interpreterAstQueueAdapter.js`.
3. Уніфікувати animation path навколо `interpreterAstRuntime.js`.
4. Визначити semantic-правило для повторного `створити x = ...`.
5. Розглянути одне runtime source-of-truth для release/cache version.

## 12. Головне архітектурне правило

Не нарощувати функції поверх крихкого runtime. Спочатку стабільність ядра, ліміти, semantic validation і тести. Після цього можна розширювати мову, ігровий режим і навчальні матеріали.
