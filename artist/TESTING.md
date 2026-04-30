# TESTING.md — практична стратегія тестування Ravlyk Artist

Мета тестування — не просто “щоб не падало”, а щоб навчальна логіка була чесною: правильні рішення зараховуються, неправильні не зараховуються, сторінка не зависає, а дитина не втрачає контроль.

---

## 1. Поточний стан

Є файл:

```text
tests/art.core.test.js
```

Він перевіряє:

- стабільні id і порядок рівнів;
- рух Равлика;
- координати canvas;
- генерацію коду;
- базову перевірку цілі;
- helper-функції workspace;
- вкладені repeat;
- захист від переміщення repeat у власних нащадків.

Це хороший старт, але покриття ще недостатнє для публічного використання.

---

## 2. Як запускати поточні тести

```bash
node tests/art.core.test.js
```

Потрібно додати `package.json`:

```json
{
  "type": "module",
  "scripts": {
    "test": "node tests/art.core.test.js",
    "validate:levels": "node tools/validate-levels.js",
    "test:e2e": "playwright test",
    "lint": "eslint js tests tools"
  }
}
```

---

## 3. Які тести додати першими

### 3.1. Goal evaluator

Потрібні тести:

- `exact-path` проходить тільки при правильному порядку;
- `exact-path` не проходить із зайвими кроками;
- `contains-path` проходить, якщо потрібна послідовність є всередині довшого шляху;
- `minimum-steps` рахує тільки реальні рухи;
- рух у стіну не має рахуватися як корисний крок;
- `exact-segments` порівнює намальовані відрізки;
- `contains-segments` не залежить від порядку, якщо так задано.

### 3.2. Execution limits

Тести:

- repeat count не може бути менше 1;
- repeat count не може бути більше `MAX_REPEAT_COUNT`;
- вкладені repeat не перевищують `MAX_EXPANDED_ACTIONS`;
- при перевищенні ліміту повертається дружня помилка;
- runtime не запускається після помилки валідації.

### 3.3. Workspace

Тести:

- додавання блоку в root;
- додавання блоку всередину repeat;
- переміщення блоку вгору/вниз;
- переміщення блоку з repeat назовні;
- видалення блоку;
- undo після додавання;
- undo після видалення;
- redo після undo;
- неможливо перемістити repeat у власний descendant.

### 3.4. Level validation

Тести:

- дубльований `id` ловиться;
- невідомий block type ловиться;
- координата за межами поля ловиться;
- `success.mode` невідомого типу ловиться;
- `constraints.maxBlocks` некоректного типу ловиться;
- сирий HTML в `instruction` ловиться.

---

## 4. Unit test структура

Рекомендована структура:

```text
tests/
  unit/
    engine.test.js
    turtle.test.js
    goals.test.js
    constraints.test.js
    workspace.test.js
    codegen.test.js
    levels.test.js
  e2e/
    basic-flow.spec.js
    keyboard-flow.spec.js
    pwa.spec.js
```

Можна почати без test framework, як зараз, але краще перейти на `vitest` або залишити lightweight Node tests. Для маленького статичного проєкту допустимі прості Node-тести, якщо вони стабільні.

---

## 5. E2E-тести

Потрібен Playwright.

Критичні сценарії:

### 5.1. Базове проходження рівня

1. Відкрити сторінку.
2. Натиснути блок у палітрі потрібну кількість разів.
3. Натиснути `Запустити`.
4. Переконатися, що з’явилося вікно успіху.
5. Натиснути `Наступний рівень`.

### 5.2. Неправильне рішення

1. Додати неправильні блоки.
2. Запустити.
3. Переконатися, що успіх не показано.
4. Перевірити дружнє повідомлення.

### 5.3. Reset

1. Додати блоки.
2. Натиснути `Очистити`.
3. Підтвердити.
4. Переконатися, що workspace порожній.
5. Переконатися, що Равлик повернувся на старт.

### 5.4. Keyboard-only

1. Дійти `Tab` до палітри.
2. `Enter` додати блок.
3. `ArrowUp/ArrowDown` перемістити блок.
4. `Delete` видалити блок.
5. `Ctrl+Enter` запустити.

### 5.5. Stop button

1. Створити довгу програму.
2. Запустити.
3. Натиснути `Зупинити`.
4. Переконатися, що runtime зупинився.

---

## 6. Manual QA checklist

Перед кожним релізом перевірити вручну:

- [ ] сайт відкривається на desktop Chrome;
- [ ] сайт відкривається на mobile/tablet viewport;
- [ ] усі кнопки українською;
- [ ] перший рівень проходиться;
- [ ] неправильне рішення не зараховується;
- [ ] reset працює;
- [ ] next lesson працює;
- [ ] code panel відкривається/закривається;
- [ ] repeat count змінюється;
- [ ] drag-and-drop працює;
- [ ] без drag-and-drop теж можна працювати;
- [ ] keyboard navigation працює;
- [ ] focus outline видно;
- [ ] reduced motion не ламає запуск;
- [ ] сторінка не зависає від великих repeat;
- [ ] offline після першого відкриття працює, якщо PWA вже реалізовано.

---

## 7. Browser support

MVP підтримує:

- Chrome/Chromium latest;
- Edge latest;
- Safari latest;
- Firefox latest;
- iPad Safari latest.

Не підтримувати старі Internet Explorer/legacy Edge.

---

## 8. Performance tests

Перевірити:

- запуск програми до 500 кроків не блокує UI;
- анімація не створює layout thrashing;
- canvas redraw не викликається зайво;
- mobile viewport не має горизонтального overflow;
- Lighthouse Performance не має критичних проблем.

---

## 9. Accessibility tests

Інструменти:

- Lighthouse Accessibility;
- axe DevTools;
- ручний keyboard-only тест;
- screen reader smoke-test, якщо можливо.

Мінімальні критерії:

- немає unlabeled buttons;
- немає critical contrast issues;
- modals мають labels;
- focus не губиться;
- canvas має текстову альтернативу.

---

## 10. Security tests

Перевірити:

- немає user-controlled `innerHTML`;
- CSP не блокує власні файли;
- CSP блокує inline script;
- service worker кешує тільки потрібні файли;
- немає сторонніх JS-запитів;
- немає cookies;
- storage очищується очікувано.

---

## 11. CI

Додати GitHub Actions:

```yaml
name: CI

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run validate:levels
```

Playwright можна додати окремо після стабілізації UI.

---

## 12. Що реалізувати першочергово

1. Додати `package.json`.
2. Розбити тести на `tests/unit`.
3. Додати тести для `exact-path`.
4. Додати тести для execution limits.
5. Додати `tools/validate-levels.js`.
6. Додати GitHub Actions.
7. Додати Playwright smoke-test.
8. Додати accessibility manual checklist у PR template.
