# SECURITY.md

Цей документ описує поточну модель безпеки РАВЛИК. Він не є журналом старих вразливостей: закриті проблеми згадані тільки там, де це допомагає зрозуміти наявний захист.

## 1. Контекст

РАВЛИК — статичний браузерний застосунок без backend, авторизації, бази даних і серверного виконання коду. Основні активи, які треба захищати:

- браузер користувача від зависання;
- дитячий код від випадкового витоку в аналітику;
- стабільність редактора під час запуску некоректних програм;
- цілісність PWA-кешу;
- довіру до навчального середовища.

## 2. Поточні гарантії

У коді не використовується `eval()`, `new Function()` або виконання користувацького коду як JavaScript. Share-link завантажує код із `location.hash`, декодує його і записує в `textarea.value`, а не вставляє як HTML.

Cloudflare Web Analytics підключається напряму на публічних HTML-сторінках. У CSP дозволено тільки `https://static.cloudflareinsights.com` для beacon-скрипта і `https://cloudflareinsights.com` для відправлення метрик; Google Analytics більше не підключається.

Основні ліміти виконання живуть у `js/modules/constants.js`:

```js
export const MAX_RECURSION_DEPTH = 20;
export const MAX_PARSE_DEPTH = 20;
export const MAX_REPEATS_IN_LOOP = 500;
export const EXECUTION_TIMEOUT_MS = 180000;
export const MAX_CODE_LENGTH_CHARS = 10000;
export const MAX_AST_NODES = 5000;
export const MAX_COMMAND_QUEUE_LENGTH = 50000;
export const MAX_GAME_TICK_OPERATIONS = 500;
```

Що вони покривають:

- `MAX_AST_NODES` — semantic validator відхиляє надто великий AST.
- `MAX_PARSE_DEPTH` — parser зупиняє надто глибоку вкладеність блоків дружньою помилкою.
- `MAX_REPEATS_IN_LOOP` — один цикл не може мати необмежену кількість повторів.
- `MAX_COMMAND_QUEUE_LENGTH` — animation path передає це значення як `maxAstSteps` у `createAstRuntime`, тому control-flow-only програми зупиняються з `COMMAND_QUEUE_OVERFLOW`.
- `MAX_GAME_TICK_OPERATIONS` — game tick має бюджет AST-кроків через `createAstRuntime({ maxAstSteps })`; рахуються присвоєння, умови, цикли, виклики функцій і примітивні команди.
- `EXECUTION_TIMEOUT_MS` — додатковий часовий fallback, але не основний захист від синхронної роботи.

## 3. Runtime-ризик

Найважливіший ризик для дитячого браузерного середовища — Denial of Service через коротку програму з великою кількістю операцій. Поточний стан:

- animation path виконує AST ліниво через `interpreterAstAnimationRuntime.js` → `createAstRuntime`; плоска command queue більше не будується;
- `maxAstSteps: MAX_COMMAND_QUEUE_LENGTH` (50000) передається в `createAstRuntime` для animation path — рахуються ВСІ AST-кроки (присвоєння, умови, цикли, виклики), не тільки примітиви;
- game mode виконує AST напряму через `interpreterAstRuntime.js` і має per-tick budget (`MAX_GAME_TICK_OPERATIONS = 500`);
- `interpreterAstQueueAdapter.js` залишається тільки для legacy tests і `parseTokens()` shim, позначено `@deprecated`.

Критичний ризик зависання через вкладені цикли повністю закритий.

## 4. Service Worker

Service Worker переписано:

- реєструється тільки для production host (`js/registerServiceWorker.js` перевіряє `location.hostname`);
- scope явно `{ scope: '/' }` — production живе в корені домену;
- runtime cache фільтрується через `CACHEABLE_EXTENSIONS` allowlist (розширення файлів);
- `cache.put` обгорнуто в `try/catch`;
- bounded cleanup при перевищенні `MAX_RUNTIME_CACHE_ENTRIES`;
- release/cache version синхронізується через `scripts/sync-release-version.mjs` і перевіряється `tests/releaseVersion.test.js` та `tests/serviceWorker.test.js`.

## 5. XSS і DOM

Поточний XSS-ризик низький, бо користувацький код не вставляється як HTML і не виконується як JavaScript. Правило для майбутніх змін:

- користувацькі дані вставляти через `textContent`, `value`, `setAttribute` з allowlist або DOM API;
- `innerHTML` дозволений тільки для статичних константних UI-шаблонів без користувацьких значень;
- не додавати `document.write`, dynamic code execution або імпорти з користувацьких даних.

## 6. LocalStorage

`localStorage` використовується для accessibility settings і grid overlay. Це прийнятно.

Не додавати агресивне автоматичне збереження дитячого коду між сесіями без окремого продуктового рішення: у школі одним комп'ютером можуть користуватися різні діти.

## 7. Security Tests

Поточні security-регресії розподілені між unit tests:

- parser limits і дружні помилки — `tests/parser.errors-boundary.test.js`;
- queue/runtime limits — `tests/parser.ast-runtime.test.js`, `tests/interpreter.helpers.core.test.js`;
- semantic limits — `tests/semantic.test.js`;
- analytics privacy — `tests/analytics.test.js`;
- static security/encoding checks — `tests/encoding.test.js`;
- release version sync — `tests/releaseVersion.test.js`.

Основна команда перевірки:

```bash
npm run check
```

## 8. Release Checklist

Перед production-релізом перевірити:

- [ ] `npm run check` проходить.
- [ ] CI проходить на актуальному коді.
- [ ] Немає `eval()` / `new Function()` / `document.write`.
- [ ] Користувацькі дані не вставляються через `innerHTML`.
- [ ] Ліміти `MAX_AST_NODES`, `MAX_PARSE_DEPTH`, `MAX_COMMAND_QUEUE_LENGTH`, `MAX_GAME_TICK_OPERATIONS` працюють.
- [ ] Публічні сторінки не підключають Google Analytics і мають тільки Cloudflare Web Analytics beacon.
- [ ] Service Worker має очікуваний scope/cache policy для цього релізу.
- [ ] Після зміни SW/cache version старий кеш коректно прибирається.
- [ ] Код учня не зберігається автоматично між сесіями без явного рішення.

## 9. Поточні Пріоритети

1. Тримати `LANGUAGE_SPEC.md`, manual і tests синхронними при кожній зміні мови.
2. Поступово мігрувати тести, що досі використовують `astToLegacyQueue` / flat queue, на `createAstRuntime` / `executeCommands`, а після цього видалити `interpreterAstQueueAdapter.js` і `interpreterQueueRuntime.js`.
3. Розширювати мову (нові команди, `поки`-цикл) тільки після того, як кожна нова команда покрита тестами та описана в `LANGUAGE_SPEC.md`.
