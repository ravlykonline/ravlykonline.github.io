# ARCHITECTURE.md — практична архітектура Ravlyk Artist

---

## 1. Архітектурна ціль

Статичне браузерне навчальне середовище для алгоритмічного малювання:

- без backend; без реєстрації; без персональних даних;
- offline-first; модульний JavaScript; контрольована модель стану;
- окремий runtime/interpreter; перевірка рівнів через декларативну схему;
- доступний UI, який не залежить лише від drag-and-drop.

---

## 2. Поточна структура (після Фаз 1–2)

```text
index.html
package.json

legacy/
  script.legacy.js        ← старий моноліт, не редагувати
  style.legacy.css

css/
  tokens.css
  base.css
  layout.css
  components.css
  responsive.css
  accessibility.css

js/
  main.js                 ← точка входу, orchestration

  core/
    codegen.js            ← генерація псевдокоду (мова РАВЛИК)
    constants.js          ← COLS, ROWS, CELL_SIZE, GRID_WIDTH/HEIGHT
    engine.js             ← moveSnail, sleep
    goals.js              ← evaluateGoal (exact-path, minimum-steps, path-match)
    state.js              ← appState, мутатори
    workspace.js          ← операції з блоками (add, remove, move, flatten, up/down/out)

  data/
    blocks.js             ← blockDefinitions (grid + turtle)
    lessons.js            ← всі рівні (grid mode: 1–6, turtle mode: 7+)

  domain/                 ← [планується] чиста бізнес-логіка
    turtle.js             ← [P2] turtle model, moveForward, turnRight/Left

  runtime/
    execution-limits.js   ← validateProgram, MAX_EXPANDED_ACTIONS/REPEAT/NESTING

  state/
    history.js            ← undo/redo (pushSnapshot, undo, redo, canUndo/canRedo)

  utils/
    focus-trap.js         ← trapFocus(container)

  ui/
    canvas.js             ← setupCanvas, renderLessonGuide, drawTrail, placeSnail
    dom.js                ← getDomReferences
    icons.js              ← avatarSvg, snailSvg
    render.js             ← renderWorkspace, renderPalette, renderControls...

tests/
  art.core.test.js        ← 23 unit-тести (Node.js, без фреймворку)

tools/                    ← [планується]
  validate-levels.js
```

---

## 3. Legacy-файли

Вирішено: `script.js` і `style.css` перенесено у `legacy/`.
`index.html` не посилається на них.

---

## 4. Цільова структура (після P2–P3)

```text
js/
  data/
    blocks.grid.js        ← grid block definitions
    blocks.turtle.js      ← turtle block definitions (команди РАВЛИК)
    lessons.grid.js
    lessons.turtle.js
    i18n.uk.js            ← [планується] всі UI-рядки

  domain/
    turtle.js             ← turtle model (чисті функції)
    goal-evaluator.js     ← [планується] всі режими перевірки
    constraints.js        ← [планується]

  runtime/
    execution-limits.js   ✅
    interpreter.js        ← [планується] async iterator runner

  state/
    history.js            ✅
    persistence.js        ← [планується]

  utils/
    focus-trap.js         ✅
    ids.js
    sanitize.js

tools/
  validate-levels.js      ← [P3]
```

---

## 5. Розділення відповідальності

### `data/`
Тільки декларативні дані: блоки, рівні, toolbox, стартова позиція, цілі, підказки.
Без DOM-логіки та мутацій state.

### `domain/`
Чиста логіка: turtle/grid-модель, перевірка рівня, нормалізація.
Функції мають бути **pure**: прийняли дані → повернули результат.

### `runtime/`
Виконує програму: flatten/interpret blocks, ліміти, stop/cancel, події для анімації.
Не малює DOM напряму.

### `state/`
Стан застосунку: workspace, runtime, completed lessons, modal, undo/redo.
UI викликає action-функції, не мутує appState напряму.

### `ui/`
Тільки DOM, події користувача, рендеринг, доступність, анімації.

---

## 6. Модель стану (поточна)

```js
const appState = {
  currentLessonIndex: 0,
  currentLesson: lessons[0],
  snail: { x, y, dir },          // grid mode
  workspace: [],                  // Block[]
  running: false,
  doneLessons: new Set(),
  trailPoints: [],                // [x, y][]
  activeBlockId: null,
  insertTargetId: null,           // id repeat-блоку як цілі вставки
  codePanelOpen: false,
};
```

Undo/redo — у `js/state/history.js` (окремий модуль, не в appState).

---

## 7. Grid-модель і Turtle-модель

### Grid-модель (рівні 1–6)

```js
{ x: 4, y: 1, dir: 'S' }
```

Команди: `move_n`, `move_s`, `move_e`, `move_w`, `repeat`.

### Turtle-модель (рівні 7+, мова РАВЛИК)

```js
{
  x: 0,          // пікселі від центру canvas
  y: 0,
  heading: 0,    // 0 = вгору, 90 = вправо, 180 = вниз, 270 = вліво
  penDown: true,
  color: '#f5962a',
  strokeWidth: 4
}
```

Команди (відповідають мові РАВЛИК):

| Блок | Внутрішній тип | Параметр | РАВЛИК-код |
|---|---|---|---|
| вперед | `turtle_forward` | `steps` (default 50) | `вперед 50` |
| праворуч | `turtle_right` | `degrees` (default 90) | `праворуч 90` |
| ліворуч | `turtle_left` | `degrees` (default 90) | `ліворуч 90` |
| підняти | `turtle_pen_up` | — | `підняти` |
| опустити | `turtle_pen_down` | — | `опустити` |
| повторити | `repeat` | `count` | `повторити N ( ... )` |

Рівень має містити `mode: 'grid'` або `mode: 'turtle'`.

---

## 8. Параметричні блоки

На відміну від grid-блоків (які є атомарними), turtle-блоки мають числовий параметр:

```js
// Grid-блок (атомарний)
{ type: 'move_s', id: 1 }

// Turtle-блок (параметричний)
{ type: 'turtle_forward', id: 2, steps: 50 }
{ type: 'turtle_right',   id: 3, degrees: 90 }
```

`blockDefinitions` розширено полями `paramKey`, `paramDefault`, `paramMin`, `paramMax`.
`render.js` відображає вбудований number input для параметричних блоків.
`workspace.js createBlock` ініціалізує параметр зі значення `paramDefault`.

---

## 9. Runtime / interpreter

Поточна схема:

```text
workspace blocks
  → flattenBlocks()        ← розгортає repeat
  → validateProgram()      ← перевіряє ліміти
  → runGrid / runTurtle    ← виконує крок за кроком з await sleep()
  → evaluateGoal()         ← перевіряє результат
```

Цільова схема (P3):

```js
for await (const event of runProgram({ blocks, level, signal })) {
  renderEvent(event);
}
```

---

## 10. Execution limits

```js
// js/runtime/execution-limits.js
MAX_EXPANDED_ACTIONS = 500
MAX_REPEAT_COUNT     = 20
MAX_NESTING_DEPTH    = 4
```

Перевіряється до запуску. При перевищенні показується дружнє повідомлення.

---

## 11. Goal evaluator

Поточні режими (`js/core/goals.js`):

| Режим | Опис | Статус |
|---|---|---|
| `exact-path` | Точна послідовність клітинок (порядок + кількість) | ✅ |
| `minimum-steps` | Мінімальна кількість кроків | ✅ |
| `path-match` | Legacy alias (тільки множина клітинок) | ✅ |
| `exact-segments` | Намальовані відрізки для turtle | [P2] |
| `contains-segments` | Підмножина сегментів | [P2] |

---

## 12. Canvas rendering

Grid mode: клітинкова сітка, `trail-canvas` малює відрізки між вузлами сітки.

Turtle mode: пікселеві координати, (0,0) = центр canvas, малювання між довільними точками.

---

## 13. Codegen (мова РАВЛИК)

```
коли запущено {
  повторити 4 разів {
    вперед 100
    праворуч 90
  }
}
```

Grid-блоки: `рухатися(вниз)`, `рухатися(вгору)` тощо.
Turtle-блоки: `вперед N`, `праворуч N`, `ліворуч N`, `підняти`, `опустити`.

---

## 14. Порядок архітектурного рефакторингу

1. ✅ Ізолювати legacy
2. ✅ Додати `package.json`
3. ✅ Винести UI-тексти на Ukrainian
4. ✅ Додати execution limits
5. ✅ Переписати goal evaluator (exact-path)
6. ✅ Додати action-based workspace helpers (up/down/out)
7. ✅ Додати undo/redo history
8. ✅ Додати keyboard workspace controls
9. 🚧 Додати turtle-engine (P2.1)
10. ⬜ Перенести рівні на нову схему з constraints
11. ⬜ Додати `tools/validate-levels.js`
12. ⬜ Додати PWA
