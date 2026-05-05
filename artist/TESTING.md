# TESTING.md — практична стратегія тестування Ravlyk Artist

---

## 1. Поточний стан

Файл: `tests/art.core.test.js` — **23 тести**, всі проходять.

Покриває:
- стабільні id і порядок рівнів
- відсутність `instructionHtml` (XSS-захист)
- рух Равлика, клампінг до країв
- координати canvas (grid mode)
- генерацію псевдокоду (мова РАВЛИК)
- `exact-path` — правильний шлях, хибний порядок, надлишкові кроки
- `minimum-steps`
- `validateProgram` — execution limits
- workspace helpers: findBlock, countBlocks, flattenBlocks
- clearWorkspace, insertBlock, moveBlockInList
- `moveBlockUp`, `moveBlockDown`, `moveBlockOut`
- undo/redo: pushSnapshot, undo, redo, canUndo/canRedo, clear redo on new action

---

## 2. Як запускати

```bash
npm test
# або
node tests/art.core.test.js
```

Очікуваний результат: всі рядки `ok - ...`, жодного `not ok`.

---

## 3. Які тести додати (P2–P3)

### 3.1. Turtle domain

- `moveForward` повертає правильні координати для різних heading
- `turnRight` / `turnLeft` коректно змінюють heading
- heading wrapped в межах 0–359
- `penDown: false` → segment не повертається
- Квадрат через `moveForward × 4 + turnRight(90) × 4` утворює замкнений контур

### 3.2. Turtle codegen

- `вперед 50` генерується для `turtle_forward` з `steps: 50`
- `праворуч 90` для `turtle_right`
- `підняти` / `опустити` без параметрів
- `повторити 4 разів { вперед 50\n  праворуч 90 }` для вкладеного repeat

### 3.3. Parameterized blocks

- `createBlock('turtle_forward')` → `{ type, id, steps: 50 }`
- `createBlock('turtle_right')` → `{ type, id, degrees: 90 }`
- `updateBlockParam(id, 'steps', 100)` → оновлює значення
- `flattenBlocks` зберігає параметри в розгорнутих блоках

### 3.4. Goal evaluator (turtle)

- `minimum-steps` рахує turtle-кроки
- `exact-segments` перевіряє намальовані відрізки

### 3.5. Level validation (P3, tools/validate-levels.js)

- дубльований `id` ловиться
- `mode` не `grid`/`turtle` ловиться
- невідомий block type ловиться
- HTML у `instruction` ловиться

---

## 4. Структура тестів (ціль)

```text
tests/
  art.core.test.js        ← поточні 23 тести (зростає)
  unit/                   ← [планується] розбивка по модулях
    turtle.test.js
    goals.test.js
    workspace.test.js
    codegen.test.js
  e2e/                    ← [P3, Playwright]
    basic-flow.spec.js
    keyboard-flow.spec.js
```

---

## 5. E2E-сценарії (Playwright, P3)

### 5.1. Базове проходження рівня
1. Відкрити сторінку
2. Натиснути блок у палітрі
3. Натиснути `Запустити`
4. Перевірити вікно успіху
5. Натиснути `Наступний рівень`

### 5.2. Keyboard-only
1. Tab до палітри → Enter (додати блок)
2. ArrowUp/Down (перемістити)
3. Delete (видалити)
4. Ctrl+Z (undo)
5. Ctrl+Enter (запустити)

### 5.3. Stop button
1. Додати довгу програму
2. Запустити
3. Натиснути `Зупинити`
4. Перевірити повідомлення `Програму зупинено.`

### 5.4. Turtle рівень
1. Відкрити turtle-рівень
2. Додати блоки `вперед`, `праворуч`
3. Запустити
4. Перевірити намальовані лінії на canvas

---

## 6. Manual QA checklist

- [ ] Сайт відкривається на desktop Chrome
- [ ] Сайт відкривається на mobile/tablet
- [ ] Всі кнопки українською
- [ ] Grid рівень 1 проходиться
- [ ] Turtle рівень проходиться
- [ ] Неправильне рішення не зараховується
- [ ] Reset → workspace очищується, Равлик на старті
- [ ] Next lesson → перехід до наступного
- [ ] Code panel відкривається/закривається
- [ ] Repeat count змінюється
- [ ] Undo/redo працює (Ctrl+Z, Ctrl+Y, кнопки)
- [ ] ↑↓ переміщують блоки
- [ ] ↖ виносить блок з repeat
- [ ] `+ Додати` + клік на палітрі → вставляє в repeat
- [ ] Execution limit блокує величезний repeat
- [ ] Stop зупиняє програму
- [ ] Keyboard-only: перший рівень проходиться
- [ ] Focus outline видно
- [ ] Modals: Tab не виходить за межі
- [ ] Escape закриває reset modal

---

## 7. CI (планується, P3)

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
        with: { node-version: 22 }
      - run: npm test
      - run: npm run validate:levels
```
