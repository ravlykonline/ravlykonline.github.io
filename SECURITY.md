# SECURITY.md

Цей документ описує модель загроз для проєкту РАВЛИК, поточні знахідки з безпеки та конкретний план виправлень. Проєкт орієнтований на дітей і школу, тому вимоги до приватності, передбачуваності та відмовостійкості мають бути вищими, ніж для звичайної демоверсії.

## 1. Контекст безпеки

РАВЛИК — статичний браузерний застосунок. Він не має власного backend, авторизації, бази даних або серверного виконання коду. Основні активи, які потрібно захистити:

- браузер користувача від зависання;
- дитячий користувацький код від випадкового витоку в аналітику;
- стабільність редактора під час виконання некоректних програм;
- цілісність PWA-кешу;
- довіру до навчального середовища.

## 2. Що зараз добре

Під час аналізу не виявлено використання:

- `eval()`;
- `new Function()`;
- виконання користувацького коду як JavaScript;
- серверних API для збереження дитячого коду;
- небезпечного імпорту модулів із користувацьких даних.

Код із share-link завантажується з `location.hash`, декодується і записується в `textarea.value`, а не вставляється як HTML. Це знижує XSS-ризик.

Більшість зовнішніх посилань з `target="_blank"` мають `rel="noopener noreferrer"`, що правильно.

## 3. Головна критична загроза: зависання браузера

Найсерйозніший ризик — не XSS, а Denial of Service у браузері. Користувач може написати коротку програму, яка створить величезну кількість операцій.

Поточні ліміти в `js/modules/constants.js`:

```js
export const MAX_RECURSION_DEPTH = 20;
export const MAX_REPEATS_IN_LOOP = 500;
export const EXECUTION_TIMEOUT_MS = 180000;
export const MAX_CODE_LENGTH_CHARS = 10000;
export const MAX_COMMAND_QUEUE_LENGTH = 50000;
```

Усі ключові ліміти реалізовані. Деталі — в §3 нижче.

### Проблемний приклад

```ravlyk
повторити 500 (
  повторити 500 (
    вперед 1
  )
)
```

Це може створити 250 000 команд.

Ще гірший приклад:

```ravlyk
повторити 500 (
  повторити 500 (
    повторити 500 (
      вперед 1
    )
  )
)
```

Це теоретично 125 000 000 елементарних команд.

### Чому `EXECUTION_TIMEOUT_MS` не рятує

Якщо зависання виникає під час синхронного парсингу або побудови черги команд, браузерний event loop не встигає обробити timeout. Тобто таймер не захищає від зависання під час синхронної роботи.

### Поточний стан (реалізовано)

```js
export const MAX_AST_NODES = 5000;              // ✓ semanticValidator.js
export const MAX_PARSE_DEPTH = 20;              // ✓ ravlykParser.js (_parseDepth counter)
export const MAX_COMMAND_QUEUE_LENGTH = 50000;  // ✓ interpreterAstRuntime.js (stepCount)
export const MAX_REPEATS_IN_LOOP = 500;         // ✓ парсер
export const MAX_GAME_TICK_OPERATIONS = 500;    // ✓ interpreterAstRuntime.js (astStepCount, рахує ВСІ AST-кроки)
export const EXECUTION_TIMEOUT_MS = 180000;     // ✓ time-based fallback
```

Залишилось:

- Повна lazy execution у `interpreterAstQueueAdapter.js` (не будувати плоский масив взагалі) — зараз захищено overflow check на початку кожної RepeatStmt ітерації

Краще довгострокове рішення — не розгортати цикли в плоский масив команд. Runtime має виконувати AST ліниво.

## 4. Ризик переповнення call stack у парсері ✓ ВИРІШЕНО

`ravlykParser.js` відстежує глибину вкладеності через `_parseDepth` лічильник. При перевищенні `MAX_PARSE_DEPTH = 20` кидається дружня помилка `NESTING_TOO_DEEP` з повідомленням «Програма має забагато вкладених дужок». Тести у `tests/parser.errors-boundary.test.js` покривають граничні значення (20 рівнів — OK, 25 — кидає помилку).

## 5. Ризик нескінченного або надто важкого ігрового tick ✓ ВИРІШЕНО

`interpreterGameAstRunner.js` виконує AST напряму кожен tick гри через `createAstRuntime` з параметром `maxAstSteps: MAX_GAME_TICK_OPERATIONS`. Лічильник `astStepCount` у `interpreterAstRuntime.js` рахує кожен AST-крок (присвоєння, цикли, умови, виклики функцій, примітивні команди) — не тільки примітиви. При перевищенні 500 кидається `GAME_TICK_OVERFLOW`.

## 6. Ризик витоку коду через аналітику ✓ ВИРІШЕНО

`js/analytics.js` використовує `safePageLocation()`, яка повертає `origin + pathname + search` без hash. `#code=` не потрапляє в `page_location` аналітики.

## 7. Content Security Policy

Зараз у репозиторії немає конфігурації security headers. Для GitHub Pages це обмежено, але якщо сайт проходить через Cloudflare, треба додати headers там.

Рекомендований production CSP:

```text
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com;
  connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com;
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'none';
  upgrade-insecure-requests;
```

Додаткові headers:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=()
Cross-Origin-Opener-Policy: same-origin
```

Якщо Google Analytics не потрібна для дитячого режиму, краще повністю прибрати її з `script-src` і `connect-src`.

## 8. Service Worker ризики

Поточний `sw.js`:

- має жорсткий `CACHE_VERSION = '2026-03-13-2'`;
- кешує багато файлів у `PRECACHE_URLS`;
- використовує root paths `/...`;
- кешує runtime responses через `cache.put(request, response.clone())`;
- реєструється зі scope `/`.

### Ризики

1. Конфлікт між production, beta, GitHub Pages і підпапками.
2. Змішування старих і нових файлів після часткового релізу.
3. Зайве кешування same-origin ресурсів.
4. Падіння install, якщо один файл із precache недоступний.
5. Проблеми з quota у браузері.

### Рішення

- Визначити єдиний production path.
- Для `/go/` використовувати scope `/go/`, якщо гра/редактор мають жити там.
- Не кешувати всі same-origin файли автоматично.
- Додати allowlist runtime cache.
- Обгорнути `cache.put` у `try/catch`.
- Додати cache cleanup за кількістю entries.
- У dev не реєструвати SW автоматично.

Приклад безпечнішої перевірки runtime cache:

```js
function shouldRuntimeCache(request) {
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  return [
    '.html', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico', '.webmanifest'
  ].some((ext) => url.pathname.endsWith(ext));
}
```

## 9. XSS-перевірка

### Поточний висновок

XSS-ризик наразі низький, бо:

- користувацький код не вставляється як HTML;
- share-link декодується в `textarea.value`;
- не знайдено `eval()` або `new Function()`;
- `innerHTML` використовується переважно для статичних UI-шаблонів.

### Що все одно треба зробити

1. Заборонити вставку користувацьких даних через `innerHTML` у майбутньому.
2. Для UI-шаблонів використовувати `createElement`, `textContent`, `append`.
3. Якщо `innerHTML` залишається для іконок — тримати тільки константні рядки без користувацьких значень.
4. Додати grep-тест у CI:

```bash
grep -R "eval\|new Function\|document.write" js && exit 1 || exit 0
```

## 10. Clipboard і file import/export

`copyTextToClipboard` використовує `navigator.clipboard.writeText`, а fallback — `document.execCommand('copy')`. Це прийнятно.

Потрібно врахувати:

- clipboard має працювати тільки за дією користувача;
- помилки копіювання мають показувати дружнє повідомлення;
- імпорт коду має перевіряти `MAX_CODE_LENGTH_CHARS`;
- файли не мають автоматично запускатися після імпорту.

## 11. LocalStorage

Виявлено використання `localStorage` для accessibility settings і grid overlay. Це нормально.

Важливо не додавати автоматичне збереження учнівського коду в `localStorage` без явного рішення, бо в школі одним комп'ютером можуть користуватися різні діти.

Правило:

> Код учня не зберігати автоматично між сесіями, якщо це не ввімкнено явно і не пояснено в інтерфейсі.

## 12. Reserved names і semantic security

Проблема із зарезервованими іменами — це не тільки UX, а й security-hardening. Semantic validator уже забороняє перевизначати базові команди як змінні, функції або параметри:

```ravlyk
створити вперед() (
  назад 10
)
```

Поточний список reserved words живе в `js/modules/semanticValidator.js` і має залишатися синхронним із `LANGUAGE_SPEC.md`:

```js
const RESERVED_WORDS = new Set([
  'вперед', 'назад', 'праворуч', 'ліворуч',
  'колір', 'фон', 'товщина', 'підняти', 'опустити',
  'очистити', 'перейти', 'повторити', 'повтори',
  'якщо', 'інакше', 'створити', 'грати',
  'forward', 'backward', 'right', 'left',
  'color', 'background', 'thickness', 'penup', 'pendown',
  'clear', 'goto', 'repeat', 'if', 'else', 'create', 'game',
  'край', 'клавіша', 'edge', 'key', 'випадково', 'random'
]);
```

## 13. Обов'язкові security tests

Додати тести, які гарантують, що браузер не зависає і помилки дружні:

```text
tests/unit/security-limits.test.js
```

Сценарії:

1. Код довший за `MAX_CODE_LENGTH_CHARS` відхиляється.
2. Один цикл з `501` повтором відхиляється.
3. Вкладені цикли не розгортаються у величезну чергу.
4. Глибокі блоки дають дружню помилку, а не `RangeError`.
5. Функціональна рекурсія обмежена.
6. Ігровий tick має бюджет операцій.
7. Share-link не передає hash в analytics.
8. `eval`, `new Function`, `document.write` заборонені в коді.

## 14. Security checklist перед релізом

Перед кожним production-релізом перевірити:

- [ ] CI проходить на актуальному коді.
- [ ] Немає `eval()` / `new Function()`.
- [ ] Немає користувацького HTML через `innerHTML`.
- [ ] Працюють ліміти `MAX_AST_NODES`, `MAX_PARSE_DEPTH`, `MAX_COMMAND_QUEUE_LENGTH`, `MAX_GAME_TICK_OPERATIONS`.
- [ ] Вкладені цикли не зависають.
- [ ] `#code=` не потрапляє в analytics `page_location`.
- [ ] CSP і security headers налаштовані в Cloudflare.
- [ ] Service Worker має правильний scope.
- [ ] Після релізу стара версія кешу видаляється.
- [ ] У dev/beta немає конфлікту з production Service Worker.
- [ ] Користувацький код не зберігається автоматично між учнями.

## 15. Пріоритети виправлення

### P0 — критично

- ✓ Заборонити зависання через вкладені цикли — overflow check per RepeatStmt iteration.
- ✓ Додати operation budget — `MAX_COMMAND_QUEUE_LENGTH`, `MAX_GAME_TICK_OPERATIONS`.
- ✓ Виправити CI — `ci.yml` працює.

### P1 — високо

- ✓ Додати semantic validation — `semanticValidator.js`.
- ✓ Виправити analytics privacy — `safePageLocation()`.
- Переписати Service Worker scope/cache policy.

### P2 — середньо

- Додати CSP/security headers.
- Додати regression tests.
- Уніфікувати помилки парсера.

### P3 — низько

- Прибрати дублювання accessibility HTML.
- Прибрати BOM із workflow.
- Поліпшити документацію release-процесу.
