# TESTING.md

Цей документ описує тестову стратегію для проєкту РАВЛИК. Поточний архів містить згадки про тести в `README.md` і `.github/workflows/e2e-ui.yml`, але фактичної тестової інфраструктури не містить. Тому цей документ одночасно фіксує прогалину й задає план створення тестів.

## 1. Поточний стан

У поточному архіві не виявлено:

- `package.json`;
- `package-lock.json`;
- `tests/`;
- unit-тестів;
- Playwright config;
- test scripts.

Водночас `README.md` згадує:

```text
npm run test:unit
npm run test:e2e
node --experimental-default-type=module tests/encoding.test.js
```

А `.github/workflows/e2e-ui.yml` намагається запускати:

```text
npm ci
npm run test:unit
npm run test:e2e
```

Це треба виправити першочергово.

## 2. Рекомендований стек тестування

Оскільки проєкт на JavaScript ES Modules без фреймворку, рекомендовано:

- `vitest` для unit/integration тестів;
- `@playwright/test` для E2E;
- `eslint` для базової статичної перевірки;
- окремий `encoding.test.js` для BOM/UTF-8/заборонених символів;
- прості security grep-тести.

## 3. Мінімальний `package.json`

Додати в корінь:

```json
{
  "name": "ravlyk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "npm run test:unit && npm run test:e2e",
    "test:unit": "vitest run",
    "test:e2e": "playwright test",
    "test:encoding": "node tests/encoding.test.js",
    "lint:security": "node tests/security.static.test.js",
    "check": "npm run test:encoding && npm run lint:security && npm run test:unit"
  },
  "devDependencies": {
    "@playwright/test": "latest",
    "vitest": "latest"
  }
}
```

Якщо потрібна стабільність, замість `latest` зафіксувати конкретні версії після першого встановлення.

## 4. Рекомендована структура тестів

```text
tests/
  unit/
    parser.test.js
    language-spec.test.js
    semantic-validator.test.js
    runtime-expressions.test.js
    runtime-limits.test.js
    share-link.test.js
    pwa-paths.test.js
  integration/
    editor-runner.test.js
    game-mode.test.js
  e2e/
    editor.spec.js
    manual.spec.js
    quiz.spec.js
    pwa.spec.js
    accessibility.spec.js
  fixtures/
    programs/
      square.ravlyk
      variables.ravlyk
      functions.ravlyk
      malicious-nested-loops.ravlyk
  encoding.test.js
  security.static.test.js
```

## 5. Unit tests: parser

Файл:

```text
tests/unit/parser.test.js
```

Перевірити:

- токенізацію коментарів;
- токенізацію рядків у лапках;
- числа;
- арифметичні вирази;
- групування дужками;
- рух;
- повороти;
- кольори;
- фон;
- товщину;
- `перейти` з і без `в`;
- `перейти випадково`;
- цикли;
- умови;
- `інакше`;
- функції;
- game block.

Приклади очікуваних тестів:

```js
import { describe, expect, it } from 'vitest';
import { RavlykParser } from '../../js/modules/ravlykParser.js';

describe('RavlykParser', () => {
  it('parses a square program', () => {
    const parser = new RavlykParser();
    const ast = parser.parseCodeToAst(`
      повторити 4 (
        вперед 100
        праворуч 90
      )
    `);
    expect(ast.type).toBe('Program');
    expect(ast.body[0].type).toBe('RepeatStmt');
  });
});
```

## 6. Unit tests: semantic validation

Файл:

```text
tests/unit/semantic-validator.test.js
```

Ці тести треба додати після створення `semanticValidator.js`.

Обов'язкові сценарії:

### 6.1. Reserved function name

```ravlyk
створити вперед() (
  назад 10
)
```

Очікування: помилка `FUNCTION_NAME_RESERVED`.

### 6.2. Reserved variable name

```ravlyk
створити якщо = 10
```

Очікування: помилка `VARIABLE_NAME_RESERVED`.

### 6.3. Duplicate function

```ravlyk
створити f() ( вперед 10 )
створити f() ( назад 10 )
```

Очікування: помилка `FUNCTION_ALREADY_EXISTS`.

### 6.4. Variable/function conflict

```ravlyk
створити x = 1
створити x() ( вперед 10 )
```

Очікування: помилка `FUNCTION_NAME_CONFLICT_VARIABLE`.

### 6.5. Duplicate parameters

```ravlyk
створити f(a, a) (
  вперед a
)
```

Очікування: помилка про duplicate parameter. Якщо повідомлення ще немає, додати його в `constants.js`.

### 6.6. Wrong argument count

```ravlyk
створити f(a) (
  вперед a
)
f(10, 20)
```

Очікування: помилка про невідповідну кількість аргументів.

## 7. Unit tests: runtime limits

Файл:

```text
tests/unit/runtime-limits.test.js
```

Обов'язкові сценарії:

### 7.1. Loop count > max

```ravlyk
повторити 501 (
  вперед 1
)
```

Очікування: `TOO_MANY_REPEATS_IN_LOOP`.

### 7.2. Nested loops do not explode

```ravlyk
повторити 500 (
  повторити 500 (
    повторити 500 (
      вперед 1
    )
  )
)
```

Очікування: дружня помилка operation budget, а не зависання.

### 7.3. Deep nesting

Згенерувати програму з 100 вкладеними блоками.

Очікування: `MAX_PARSE_DEPTH` або аналогічна дружня помилка.

### 7.4. Function recursion

```ravlyk
створити f() (
  f()
)
f()
```

Очікування: помилка recursion/call budget, а не зависання.

### 7.5. Game tick budget

```ravlyk
грати (
  повторити 500 (
    повторити 500 (
      вперед 1
    )
  )
)
```

Очікування: game tick operation limit.

## 8. Unit tests: share-link

Файл:

```text
tests/unit/share-link.test.js
```

Перевірити:

- encode/decode roundtrip для українського коду;
- emoji/Unicode не ламають кодування;
- довгий код не створює надто довге посилання;
- `buildShareLink` замінює старий hash;
- декодований код не виконується автоматично.

Приклад:

```js
import { describe, expect, it } from 'vitest';
import { encodeCodeForUrlHash, decodeCodeFromUrlHash } from '../../js/modules/share.js';

describe('share link encoding', () => {
  it('roundtrips Ukrainian code', () => {
    const code = 'колір червоний\nвперед 100';
    expect(decodeCodeFromUrlHash(encodeCodeForUrlHash(code))).toBe(code);
  });
});
```

## 9. Static security tests

Файл:

```text
tests/security.static.test.js
```

Перевірити:

- немає `eval(`;
- немає `new Function`;
- немає `document.write`;
- немає небезпечного `innerHTML` із користувацькими даними;
- `.github/workflows/*.yml` не містять BOM;
- `README.md` не посилається на неіснуючі файли без TODO-позначки.

## 10. Encoding tests

Файл:

```text
tests/encoding.test.js
```

Перевірити:

- всі `.js`, `.html`, `.css`, `.md`, `.yml`, `.json` читаються як UTF-8;
- немає BOM, крім якщо явно дозволено;
- немає replacement character `�`;
- line endings уніфіковані.

Поточна знахідка: `.github/workflows/e2e-ui.yml` має BOM. Його треба прибрати.

## 11. E2E tests: editor

Файл:

```text
tests/e2e/editor.spec.js
```

Сценарії:

1. Сторінка редактора відкривається.
2. Користувач вводить квадрат і натискає запуск.
3. З'являється повідомлення про успіх.
4. Кнопка стоп зупиняє довше виконання.
5. Помилка показує рядок/колонку.
6. Share-link копіюється або fallback-повідомлення працює.
7. Код із `#code=` підставляється в редактор, але не запускається автоматично.

## 12. E2E tests: manual

Файл:

```text
tests/e2e/manual.spec.js
```

Сценарії:

- відкривається `manual.html`;
- навігація між розділами працює;
- кнопка копіювання коду має початковий текст `Скопіювати`, а не `Скопійовано`;
- приклад можна відкрити в редакторі;
- hash-навігація працює.

Поточна знайдена UX-проблема: у `manualPageController.js` кнопка копіювання створюється зі словом `Скопійовано` ще до натискання.

## 13. E2E tests: accessibility

Файл:

```text
tests/e2e/accessibility.spec.js
```

Сценарії:

- skip-link працює;
- панель доступності відкривається з клавіатури;
- focus trap працює;
- Escape закриває модальне вікно;
- налаштування accessibility не ламають редактор;
- contrast/font-size режими не перекривають основні кнопки.

## 14. E2E tests: PWA

Файл:

```text
tests/e2e/pwa.spec.js
```

Сценарії:

- Service Worker реєструється тільки в очікуваному scope;
- оновлення версії cache не залишає старі assets;
- offline fallback відкриває редактор;
- `sw.js` не кешує сам себе некоректно;
- beta/dev build не конфліктує з production cache.

## 15. GitHub Actions

Поточний workflow треба замінити.

Рекомендований мінімальний workflow:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium

      - name: Check encoding
        run: npm run test:encoding

      - name: Static security checks
        run: npm run lint:security

      - name: Run unit tests
        run: npm run test:unit

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload Playwright artifacts
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-artifacts
          path: |
            test-results
            playwright-report
          if-no-files-found: ignore
```

## 16. Manual test checklist

Перед релізом вручну перевірити:

- [ ] Редактор відкривається в Chrome, Edge, Firefox, Safari.
- [ ] Код квадрата виконується.
- [ ] Код із помилкою показує дружнє повідомлення.
- [ ] Share-link відкривається на іншому пристрої.
- [ ] Завантаження/збереження коду працює.
- [ ] Збереження малюнка працює.
- [ ] Посібник відкривається.
- [ ] Уроки відкриваються.
- [ ] Тести відкриваються.
- [ ] Offline/PWA не показує стару версію після релізу.
- [ ] Accessibility panel не перекриває редактор.
- [ ] Мобільний вигляд не ламається.

## 17. Regression policy

Кожен знайдений баг має отримати тест.

Приклад:

- Баг: кнопка копіювання в посібнику до натискання показує `Скопійовано`.
- Виправлення: змінити initial label на `Скопіювати`.
- Тест: E2E перевіряє початковий текст кнопки.

## 18. Definition of Done для тестової системи

Тестову систему можна вважати мінімально готовою, коли:

- `npm ci` працює локально і в GitHub Actions;
- `npm run check` проходить;
- є unit-тести parser/runtime/security limits;
- є E2E-тест головного сценарію редактора;
- CI не посилається на неіснуючу папку;
- workflow не містить BOM;
- тести не залежать від зовнішньої мережі, крім встановлення npm-пакетів у CI.
