# ARCHITECTURE.md — практична архітектура Ravlyk Artist

Цей документ описує не лише поточну структуру, а й цільову архітектуру, до якої треба привести проєкт. Його головне призначення — дати розробникам і AI-агентам чітке розуміння, що саме треба будувати, де має лежати логіка, які компроміси дозволені, а які ні.

---

## 1. Архітектурна ціль

Проєкт має стати статичним браузерним навчальним середовищем для алгоритмічного малювання:

- без backend;
- без реєстрації;
- без персональних даних;
- offline-first;
- з модульним JavaScript;
- з контрольованою моделлю стану;
- з окремим runtime/interpreter;
- з перевіркою рівнів через декларативну схему;
- з доступним UI, який не залежить лише від drag-and-drop.

---

## 2. Поточна структура

```text
index.html
css/
  tokens.css
  base.css
  layout.css
  components.css
  responsive.css
  accessibility.css
js/
  main.js
  core/
    codegen.js
    constants.js
    engine.js
    goals.js
    state.js
    workspace.js
  data/
    blocks.js
    lessons.js
  ui/
    canvas.js
    dom.js
    icons.js
    render.js
tests/
  art.core.test.js
```

Поточна структура вже краща за моноліт, але її треба посилити перед масштабуванням.

---

## 3. Проблема legacy-файлів

У корені є `script.js` і `style.css`. Вони дублюють стару версію програми і не мають бути production-кодом.

Потрібна дія:

```text
legacy/
  script.legacy.js
  style.legacy.css
```

Або видалити їх, якщо всі потрібні частини вже перенесені в модульну версію.

Заборонено:

- редагувати `script.js` як основний код;
- переносити нові фічі в legacy-файли;
- залишати два різні джерела правди.

---

## 4. Цільова структура

Рекомендована структура після найближчого рефакторингу:

```text
index.html
manifest.json
offline.html
sw.js

assets/
  fonts/
  icons/
  sounds/

css/
  tokens.css
  base.css
  layout.css
  components.css
  blocks.css
  canvas.css
  dialogs.css
  responsive.css
  accessibility.css

js/
  app.js
  main.js

  config/
    app-config.js
    feature-flags.js

  data/
    blocks.grid.js
    blocks.turtle.js
    lessons.grid.js
    lessons.turtle.js
    i18n.uk.js

  domain/
    block-schema.js
    level-schema.js
    program.js
    turtle.js
    grid-runner.js
    goal-evaluator.js
    constraints.js

  runtime/
    interpreter.js
    run-controller.js
    execution-limits.js

  state/
    initial-state.js
    reducer.js
    actions.js
    selectors.js
    history.js
    persistence.js

  ui/
    dom.js
    render-app.js
    render-palette.js
    render-workspace.js
    render-canvas.js
    render-dialogs.js
    render-code.js
    keyboard.js
    pointer.js
    a11y.js
    announcements.js

  utils/
    ids.js
    clamp.js
    sanitize.js
    assert.js

tools/
  validate-levels.js

tests/
  unit/
  e2e/
```

Не треба робити всю структуру одразу. Але нові файли варто додавати вже в цій логіці.

---

## 5. Розділення відповідальності

### `data/`

Містить тільки декларативні дані:

- описи блоків;
- тексти рівнів;
- toolbox;
- стартову позицію;
- цілі;
- підказки;
- педагогічні метадані.

Не має містити DOM-логіки, canvas-логіки або мутацій state.

### `domain/`

Містить чисту логіку:

- turtle/grid-модель;
- перевірку рівня;
- перевірку обмежень;
- валідацію програми;
- нормалізацію блоків.

Функції в `domain/` мають бути максимально pure: прийняли дані, повернули результат.

### `runtime/`

Виконує програму:

- flatten/interpret blocks;
- покрокове виконання;
- ліміти виконання;
- stop/cancel;
- події для анімації.

Runtime не має напряму малювати DOM. Він має повертати події:

```js
{ type: 'MOVE', from, to, turtle }
{ type: 'TURN', fromHeading, toHeading }
{ type: 'SET_COLOR', color }
{ type: 'HIT_WALL', position }
{ type: 'PROGRAM_FINISHED' }
```

### `state/`

Керує станом застосунку:

- поточний рівень;
- workspace;
- runtime state;
- completed lessons;
- modal state;
- code panel state;
- undo/redo history.

UI не має довільно мутувати `appState`. Потрібно перейти до дій:

```js
dispatch({ type: 'ADD_BLOCK', blockType: 'move_s', parentId: null, index: 0 })
dispatch({ type: 'REMOVE_BLOCK', blockId: 12 })
dispatch({ type: 'RUN_STARTED' })
dispatch({ type: 'RUN_STOPPED' })
dispatch({ type: 'LESSON_COMPLETED', lessonId: 'lesson-01' })
```

### `ui/`

Відповідає тільки за:

- DOM;
- події користувача;
- рендеринг;
- доступність;
- модальні вікна;
- анімації.

UI викликає `dispatch`, але не змінює state напряму.

---

## 6. Цільова модель стану

Поточний `appState` треба поступово привести до такої структури:

```js
const state = {
  app: {
    locale: 'uk',
    reducedMotion: false,
    codePanelOpen: false,
    activeDialog: null
  },
  lessons: {
    currentId: 'lesson-01',
    completedIds: []
  },
  workspace: {
    rootBlocks: [],
    selectedBlockId: null,
    focusedBlockId: null,
    blockIdCounter: 1
  },
  runtime: {
    status: 'idle', // idle | running | paused | stopped | finished | error
    turtle: {},
    trail: [],
    events: [],
    error: null
  },
  history: {
    past: [],
    future: []
  }
};
```

---

## 7. Grid-модель і Turtle-модель

### Grid-модель

Це поточна модель:

```js
{ x: 4, y: 1, dir: 'S' }
```

Команди:

- `move_n`;
- `move_s`;
- `move_e`;
- `move_w`;
- `repeat`.

Її варто залишити для перших рівнів.

### Turtle-модель

Потрібна для Artist-режиму:

```js
{
  x: 4,
  y: 1,
  heading: 90,
  penDown: true,
  color: '#f5962a',
  strokeWidth: 5
}
```

Команди:

- `move_forward`;
- `turn_left`;
- `turn_right`;
- `jump_forward`;
- `set_color`;
- `random_color`;
- `repeat`.

Не треба змішувати grid і turtle в одному engine без явного `mode`.

Рівень має містити:

```js
mode: 'grid' // або 'turtle'
```

---

## 8. Runtime/interpreter

Поточний запуск фактично flatten-ить blocks і крокує ними. Це нормально для старту, але треба зробити надійний interpreter.

Потрібна функція:

```js
runProgram({ blocks, level, initialTurtle, signal })
```

Повертає або async iterator, або список подій.

Варіант async iterator:

```js
for await (const event of runProgram(program)) {
  renderRuntimeEvent(event);
}
```

Переваги:

- легко додати кнопку `Зупинити`;
- легко тестувати;
- легко робити анімації;
- легко зберігати список подій для перевірки цілі.

---

## 9. Execution limits

Обов’язково додати:

```js
const EXECUTION_LIMITS = {
  maxExpandedActions: 500,
  maxRepeatCount: 20,
  maxNestingDepth: 4,
  maxRuntimeMs: 10000
};
```

Якщо ліміт перевищено, не запускати програму і показати повідомлення:

```text
У програмі забагато кроків. Спробуй зменшити кількість повторів.
```

Не можна дозволити вкладеним repeat зависити вкладку браузера.

---

## 10. Goal evaluator

Поточний `path-match` перевіряє тільки відвідані клітинки. Треба підтримати різні режими:

```js
success: {
  mode: 'exact-path',
  path: [[4,2], [4,3], [4,4]],
  allowExtraMoves: false
}
```

```js
success: {
  mode: 'exact-segments',
  segments: [
    { from: [4,1], to: [4,2] },
    { from: [4,2], to: [4,3] }
  ],
  allowExtraSegments: false
}
```

```js
success: {
  mode: 'contains-segments',
  segments: [...]
}
```

```js
success: {
  mode: 'minimum-steps',
  minSteps: 6
}
```

```js
success: {
  mode: 'custom',
  evaluator: 'draw-square'
}
```

Першими реалізувати:

1. `minimum-steps`;
2. `exact-path`;
3. `contains-path`;
4. `exact-segments`.

---

## 11. Constraints

Рівень має вміти задавати обмеження:

```js
constraints: {
  maxBlocks: 2,
  mustUse: ['repeat'],
  forbidden: ['move_n'],
  maxActions: 20
}
```

Constraints перевіряються до запуску або після запуску залежно від типу.

Приклад повідомлення:

```text
Завдання просить використати не більше 2 блоків. Спробуй використати повторення.
```

---

## 12. Рендеринг canvas

Canvas/SVG-частина має бути залежною від runtime events, а не від випадкових мутацій state.

Потрібна схема:

```text
program blocks -> interpreter -> runtime events -> render-canvas
                                  -> goal evaluator
                                  -> a11y announcer
```

Не дублювати логіку координат у різних файлах.

---

## 13. Generated code

Поточний codegen англійською. Для дітей краще показувати псевдокод українською або перемикати режим.

MVP:

```text
коли запущено {
  повторити 3 рази {
    рухатися вниз
  }
}
```

Пізніше можна додати JavaScript-like view для старших дітей.

---

## 14. Робота з текстами

Усі тексти UI винести в `js/data/i18n.uk.js`:

```js
export const uk = {
  run: 'Запустити',
  reset: 'Очистити',
  stop: 'Зупинити',
  workspace: 'Програма',
  blocks: 'Команди'
};
```

Заборонено додавати нові англомовні UI-рядки напряму в JS/HTML.

---

## 15. Де дозволено компроміси

Дозволено на MVP:

- залишити простий `appState`, якщо додано чіткі action-функції;
- залишити SVG-равлика inline, якщо він контрольований і не походить від користувача;
- залишити grid-режим як перший етап;
- не робити редактор рівнів;
- не робити функції.

Не дозволено:

- залишати дві активні версії коду;
- додавати нові фічі у legacy-файли;
- робити drag-and-drop єдиним способом взаємодії;
- запускати програму без execution limit;
- приймати HTML з рівнів без sanitize/whitelist;
- зберігати персональні дані дітей.

---

## 16. Порядок архітектурного рефакторингу

1. Ізолювати legacy.
2. Додати `package.json`.
3. Додати `tools/validate-levels.js`.
4. Винести UI-тексти в `i18n.uk.js`.
5. Додати execution limits.
6. Переписати goal evaluator на кілька режимів.
7. Додати action-based state helpers.
8. Додати undo/redo history.
9. Додати keyboard workspace controls.
10. Додати turtle-engine.
11. Перенести рівні на нову схему.
12. Додати PWA.
