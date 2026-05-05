# TASKS.md — практичний backlog реалізації Ravlyk Artist

Цей документ — робочий список задач. Задачі розбиті за пріоритетами.

---

## P0 — стабілізація фундаменту ✅ ЗАВЕРШЕНО

### P0.1. Ізолювати legacy-код ✅
- [x] Перенесено `script.js` → `legacy/script.legacy.js`
- [x] Перенесено `style.css` → `legacy/style.legacy.css`
- [x] `index.html` не посилається на legacy-файли

### P0.2. Додати package.json ✅
- [x] Додано `package.json` з `"type": "module"`
- [x] Скрипт `test` → `node tests/art.core.test.js`

### P0.3. Перекласти UI українською ✅
- [x] `index.html` — всі рядки українською
- [x] `js/data/blocks.js` — Ukrainian labels
- [x] `js/data/lessons.js` — всі рівні українською
- [x] `js/core/goals.js` — повідомлення українською
- [x] `js/ui/render.js` — кнопки, заголовки, placeholder-и
- [x] `js/core/codegen.js` — псевдокод українською (мова РАВЛИК)

### P0.4. Прибрати небезпечний `instructionHtml` ✅
- [x] `lessons.js` — замінено на поле `instruction` (plain text)
- [x] `render.js` — рендеринг через `textContent`, не `innerHTML`
- [x] Тест: рівні не мають поля `instructionHtml`

### P0.5. Додати execution limits ✅
- [x] Створено `js/runtime/execution-limits.js`
- [x] `MAX_EXPANDED_ACTIONS = 500`
- [x] `MAX_REPEAT_COUNT = 20`
- [x] `MAX_NESTING_DEPTH = 4`
- [x] Перевірка до запуску з дружнім повідомленням
- [x] Тести для validateProgram

### P0.6. Додати кнопку Stop ✅
- [x] Кнопка `Зупинити` у footer (прихована коли idle, видима під час run)
- [x] `cancelRequested` flag у `main.js`
- [x] Повідомлення `Програму зупинено.`

### P0.7. Посилити goal evaluator ✅
- [x] Додано `exact-path` — перевіряє порядок і точну кількість кроків
- [x] `path-match` залишено як legacy alias
- [x] Всі рівні 1–5 переведено на `exact-path`
- [x] Дружні повідомлення про помилки
- [x] Тести на `exact-path`

---

## P1 — доступність і UX ✅ ЗАВЕРШЕНО

### P1.1. Кнопки керування блоками без drag-and-drop ✅
- [x] `↑` (Вгору), `↓` (Вниз) на кожному блоці
- [x] `↖` (Назовні) для вкладених блоків
- [x] `×` (Видалити) на кожному блоці
- [x] `+ Додати` на repeat — обирає repeat як ціль вставки
- [x] Механізм `insertTargetId` — palette click → insert inside repeat
- [x] `aria-label` на всіх кнопках

### P1.2. Keyboard shortcuts ✅
- [x] `ArrowUp/ArrowDown` — переміщують блок
- [x] `Delete/Backspace` — видаляє блок (коли блок у фокусі)
- [x] `Escape` — закриває модалку / скасовує insertTarget
- [x] `Enter` на repeat-блоці — обирає як ціль вставки
- [x] `Ctrl+Z` — undo
- [x] `Ctrl+Y` — redo
- [x] `Ctrl+Enter` — запустити

### P1.3. Undo/redo ✅
- [x] Створено `js/state/history.js`
- [x] Snapshot перед кожною мутацією workspace
- [x] Кнопки `↩` і `↪` у шапці Програми
- [x] `Ctrl+Z` і `Ctrl+Y`
- [x] Redo-стек очищується при новій дії
- [x] Тести

### P1.4. Canvas text alternative ✅
- [x] `canvas-status` оновлюється при кожному кроці
- [x] Інструкція рівня описує ціль текстом
- [x] `sr-announcer` повідомляє успіх

### P1.5. Focus management для модалок ✅
- [x] Створено `js/utils/focus-trap.js`
- [x] Tab-пастка в success modal і reset modal
- [x] Success modal фокусує `btn-next` при відкритті
- [x] Reset modal фокусує `btn-reset-cancel`
- [x] `Escape` закриває reset modal

---

## P2 — Artist/turtle-функціонал 🚧 В РОБОТІ

### P2.1. Додати turtle-engine
- [ ] Створити `js/domain/turtle.js`
- [ ] Модель: `{ x, y, heading, penDown, color, strokeWidth }`
- [ ] Команда `вперед N` (move_forward)
- [ ] Команда `праворуч N` (turn_right)
- [ ] Команда `ліворуч N` (turn_left)
- [ ] Команда `підняти` (pen_up)
- [ ] Команда `опустити` (pen_down)
- [ ] Підтримати `mode: 'turtle'` у рівнях
- [ ] Тести

### P2.2. Turtle canvas rendering
- [ ] Пікселеві координати (0,0) = центр canvas
- [ ] Малювання відрізків між довільними точками
- [ ] Відображення Равлика з правильним кутом heading
- [ ] Тест: turtle малює квадрат

### P2.3. Параметричні блоки (N кроків / N градусів)
- [ ] `вперед` — input для кількості кроків (default 50)
- [ ] `праворуч` — input для градусів (default 90)
- [ ] `ліворуч` — input для градусів (default 90)
- [ ] Render: вбудований input в блок
- [ ] Codegen: `вперед 50`, `праворуч 90`
- [ ] workspace.js: `createBlock` для параметричних типів
- [ ] `updateBlockParam` helper

### P2.4. Перші turtle-рівні (7–10)
- [ ] Рівень 7: вперед — намалювати лінію
- [ ] Рівень 8: поворот — кут через вперед + праворуч
- [ ] Рівень 9: квадрат через `повторити 4`
- [ ] Рівень 10: вільне малювання (minimum-steps)

### P2.5. Jump / pen up
- [ ] Команда `підняти` — рух без малювання
- [ ] Команда `опустити` — увімкнути малювання
- [ ] Goal evaluator враховує segments (не footprints)

### P2.6. Кольори
- [ ] Команда `колір назва` (set_color)
- [ ] Trail segments зберігають колір
- [ ] Canvas рендерить кольорові segments

### P2.7. Segment-based goals
- [ ] `exact-segments`
- [ ] `contains-segments`
- [ ] Тести для turtle-рівнів

---

## P3 — polish, PWA, CI

### P3.1. Розширити до 20 рівнів
- [ ] 8 grid-рівнів з constraints
- [ ] 12 turtle-рівнів
- [ ] hints
- [ ] педагогічні метадані

### P3.2. Validate-levels tool
- [ ] `tools/validate-levels.js`
- [ ] Перевірка schema, unique id/order, block types, coordinates

### P3.3. PWA
- [ ] Self-host fonts
- [ ] `manifest.json`
- [ ] `sw.js`
- [ ] `offline.html`

### P3.4. Security headers
- [ ] `_headers` для Cloudflare Pages
- [ ] CSP, X-Content-Type-Options, Referrer-Policy

### P3.5. CI
- [ ] GitHub Actions: npm test, validate:levels, lint

---

## Майбутнє, не для MVP

- [ ] Редактор рівнів для учителя
- [ ] Експорт малюнка PNG/SVG
- [ ] Функції як окремий блок
- [ ] Покрокове виконання програми
- [ ] Режим "поясни помилку"
- [ ] Вбудовані звуки
- [ ] Сертифікат без персональних даних
