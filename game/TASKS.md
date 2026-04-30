# TASKS.md — система навчальних завдань

Цей документ описує, як у грі працюють завдання від звірів, як додавати нові типи задач і як розвивати систему без перетворення її на моноліт.

---

## 1. Роль задач у грі

Задачі — це короткі навчальні взаємодії, які звірі пропонують Равлику.

Базовий цикл:

```txt
Равлик підходить до NPC
  -> дитина натискає Enter або клікає
  -> відкривається dialog
  -> рендериться task
  -> дитина відповідає
  -> task перевіряється
  -> NPC позначається completed
  -> дитина отримує зірочку
```

Задачі не мають бути довгими тестами. Одна взаємодія — одна маленька навчальна дія.

---

## 2. Поточна архітектура задач

Поточні файли:

```txt
js/tasks/task-registry.js
js/tasks/task-ui-helpers.js
js/tasks/task-data/
js/tasks/task-types/
```

Поточний потік:

```txt
NPC має taskPoolId
  -> TaskPicker.buildNpcSessionState()
  -> TaskRegistry.createTask(poolId)
  -> taskPools[poolId]
  -> випадковий entry
  -> відповідний taskType.createTask()
  -> DialogScene
  -> TaskRegistry.renderTask()
  -> taskType.render()
```

---

## 3. Поточні task pools

Файл:

```txt
js/tasks/task-data/task-pools.js
```

Поточні пули:

```js
'observation.beginner'
'logic.beginner'
```

`taskPoolId` задається в NPC у `js/game/level-data.js`.

Приклад:

```js
{
    id: 'mouse_1',
    nameKey: 'npc.mouseName',
    taskPoolId: 'observation.beginner',
    type: 'mouse'
}
```

---

## 4. Поточні типи задач

Зараз у проєкті є:

```txt
sequence-next
odd-one-out
order-numbers
compare-sets
count-and-match
simple-addition
shape-pattern
simple-subtraction
logic-pairs
```

Кожен тип має файл у:

```txt
js/tasks/task-types/
```

І відповідні дані у:

```txt
js/tasks/task-data/
```

---

## 5. Мінімальний контракт task type зараз

Поточний task module має виглядати приблизно так:

```js
export const ExampleTask = {
    type: 'example-task',

    createTask({ random, options, poolId }) {
        return {
            type: this.type,
            prompt: '...',
            instructions: '...',
            reward: { stars: 1 },
            choices: [...],
            correctChoiceId: '...'
        };
    },

    render({ task, container, setStatus, onSolved }) {
        // create DOM
        // handle answer
        // call onSolved() once when correct
    }
};
```

---

## 6. Обов'язкові поля задачі

Кожна задача має мати:

```js
{
    type: 'unique-task-type',
    prompt: 'Що дитина має зробити?',
    instructions: 'Коротка інструкція',
    reward: { stars: 1 }
}
```

Для задач із варіантами:

```js
{
    choices: [
        { id: 'a', label: '...' },
        { id: 'b', label: '...' }
    ],
    correctChoiceId: 'a'
}
```

Для задач із числовим вводом у майбутній моделі:

```js
{
    answer: 12,
    input: {
        type: 'number',
        min: 0,
        max: 99,
        maxLength: 2
    }
}
```

---

## 7. Головне правило: дані, рендер і перевірка не змішувати

Погано:

```js
const html = `<button onclick="...">${answer}</button>`;
```

Погано:

```js
GameScene.showMathPyramidTask();
```

Добре:

```txt
task-data описує задачу
task-renderer показує задачу
task-evaluator перевіряє відповідь
DialogScene лише відкриває контейнер
```

---

## 8. Бажана наступна архітектура

Поточна модель ще прийнятна, але для математичних, логічних і генеративних задач потрібно перейти до сильнішої структури.

Бажана структура:

```txt
js/tasks/
  task-contracts.js
  task-registry.js
  task-validator.js
  task-ui-helpers.js
  task-data/
  task-renderers/
  task-evaluators/
  task-generators/
  task-types/
```

### `task-contracts.js`

Описує типи структур і спільні константи.

### `task-validator.js`

Перевіряє, що задача валідна до показу дитині.

### `task-renderers/`

Відповідають тільки за DOM.

### `task-evaluators/`

Відповідають тільки за перевірку відповіді.

### `task-generators/`

Для генеративних задач: піраміди, магічні квадрати, рівності, послідовності.

---

## 9. Рекомендований майбутній формат задачі

```js
{
    id: 'math-pyramid-001',
    type: 'math-pyramid',
    topic: 'addition',
    skill: 'sum-composition',
    difficulty: 1,
    gradeBand: '1-2',
    prompt: 'Заповни порожню цеглинку.',
    instructions: 'Кожна верхня цеглинка — сума двох нижніх.',
    reward: { stars: 1 },
    payload: {
        rows: [
            [null],
            [5, 7],
            [2, 3, 4]
        ],
        blanks: ['top']
    },
    answer: {
        type: 'numeric-map',
        values: {
            top: 12
        }
    },
    hints: [
        'Подивись на дві цеглинки під порожньою.',
        'Склади два числа під нею.'
    ],
    explanation: '5 + 7 = 12, тому зверху має бути 12.'
}
```

---

## 10. Task validation checklist

Кожна задача має проходити перевірку:

- [ ] `type` не порожній;
- [ ] `type` зареєстрований;
- [ ] `prompt` не порожній;
- [ ] `instructions` не порожні;
- [ ] `reward.stars` є числом від 0 до 3;
- [ ] для choice-задач правильний id є серед choices;
- [ ] немає дублікатів choice id;
- [ ] немає порожніх labels;
- [ ] numeric answer є числом;
- [ ] hints не містять HTML;
- [ ] explanation не містить HTML;
- [ ] difficulty відповідає дозволеному діапазону;
- [ ] задача рендериться без помилок;
- [ ] задача може бути виконана клавіатурою.

---

## 11. Як додати просту задачу з вибором відповіді

1. Створити файл:

```txt
js/tasks/task-data/example-variants.js
```

2. Додати дані:

```js
export const exampleVariants = [
    {
        prompt: 'Яке число більше?',
        instructions: 'Обери більше число.',
        choices: [
            { id: '4', label: '4' },
            { id: '7', label: '7' }
        ],
        correctChoiceId: '7'
    }
];
```

3. Створити task type:

```txt
js/tasks/task-types/example.js
```

4. Зареєструвати його в `task-registry.js`.

5. Додати в `task-pools.js`:

```js
{ type: 'example' }
```

6. Додати тест.

---

## 12. Як додати генеративну математичну задачу

Для генеративної задачі не треба зберігати всі приклади вручну. Потрібен генератор.

Приклад бажаної структури:

```txt
js/tasks/task-generators/math-pyramid-generator.js
js/tasks/task-renderers/math-pyramid-renderer.js
js/tasks/task-evaluators/numeric-map-evaluator.js
js/tasks/task-types/math-pyramid.js
```

Генератор створює чисту структуру:

```js
{
    payload: {...},
    answer: {...}
}
```

Renderer показує.

Evaluator перевіряє.

---

## 13. Ідеї з окремого математичного скрипта

У доданому окремому `script.js` є корисні типи задач, які варто перенести в основну гру архітектурно правильно:

```txt
number-sequence
math-pyramid
balance-equation
symbol-logic
magic-square
math-machine
```

Не треба переносити цей файл як готовий модуль. Він написаний як самодостатній застосунок зі своїм станом, DOM-кешем, прогресом, підказками й генерацією набору задач. Для основної гри треба брати з нього педагогічні ідеї, а не структуру.

Правильна інтеграція:

```txt
кожен тип задачі -> окремий task type / generator / renderer / evaluator
підказки -> task.hints
пояснення -> task.explanation
відповіді -> task.answer
```

---

## 14. Рекомендовані нові типи задач

### 14.1 `number-sequence`

Дитина знаходить пропущене число в послідовності.

Навички:

- закономірності;
- лічба вперед;
- додавання сталого кроку.

### 14.2 `math-pyramid`

Кожна верхня цеглинка — сума двох нижніх.

Навички:

- додавання;
- обернена дія через віднімання;
- структурне мислення.

### 14.3 `balance-equation`

Потрібно обрати або ввести число, щоб рівність була правильною.

Навички:

- рівність;
- невідомий доданок;
- баланс.

### 14.4 `symbol-logic`

Символи мають числові значення.

Навички:

- логічне виведення;
- прості рівняння;
- уважність.

### 14.5 `magic-square`

Потрібно заповнити пропуски так, щоб сума в рядках, стовпчиках і діагоналях збігалася.

Навички:

- додавання;
- перевірка;
- системне мислення.

Для 1–2 класу використовувати дуже обережно, з малими числами й мінімальною кількістю пропусків.

### 14.6 `math-machine`

Машина бере число, виконує дію й повертає результат.

Навички:

- додавання;
- множення для старших;
- розуміння операції як перетворення.

---

## 15. Difficulty model

Рекомендований діапазон:

```txt
1 — дуже легко
2 — легко
3 — середньо
4 — складно
5 — виклик
```

Для початку гри краще використовувати `1–2`.

Приклади:

```js
{
    difficulty: 1,
    gradeBand: '1-2'
}
```

Не треба змішувати складність із класом. Одна дитина в 2 класі може потребувати difficulty 1, інша — difficulty 3.

---

## 16. NPC specialization

Кожен NPC бажано прив'язати до навчальної ролі.

Приклад:

```txt
Мишка — лічба й порівняння
Жук — логіка
Сова — закономірності
Їжачок — задачі з яблуками
Білочка — пам'ять і пари
Заєць — впорядкування
```

Тоді `taskPoolId` буде не випадковим, а педагогічно осмисленим:

```js
{
    id: 'owl_1',
    taskPoolId: 'patterns.beginner'
}
```

---

## 17. Reward policy

Поточна базова винагорода:

```js
reward: { stars: 1 }
```

Правила:

- за одне NPC-завдання не давати зірку більше одного разу;
- після solved кнопки мають блокуватися;
- повторне відкриття completed NPC не має давати повторну нагороду;
- неправильна відповідь не має карати дитину в базовому режимі;
- підказки не мають забирати зірку без окремого педагогічного рішення.

---

## 18. Hints and explanations

Для нових задач бажано підтримувати:

```js
hints: [
    'Подивись на перші два числа.',
    'Порахуй, на скільки вони відрізняються.'
],
explanation: 'Правило: щоразу додаємо 3.'
```

Але UX має бути простим:

- підказка не має відкриватися автоматично;
- пояснення можна показувати після відповіді;
- текст має бути коротким;
- не перевантажувати дитину термінами.

---

## 19. Accessibility rules for tasks

Кожне завдання має бути доступним:

- без drag-and-drop;
- з клавіатури;
- з touch;
- зі зрозумілим focus state;
- з aria-label для нестандартних елементів;
- з `button`, `input`, `fieldset` там, де це доречно;
- без передачі сенсу лише кольором;
- без критичних анімацій.

Якщо додається drag-and-drop, обов'язково має бути альтернативний режим кнопками або вибором.

---

## 20. Rendering rules for tasks

Добре:

```js
const button = document.createElement('button');
button.type = 'button';
button.textContent = choice.label;
button.addEventListener('click', handleClick);
```

Погано:

```js
container.innerHTML = `<button>${choice.label}</button>`;
```

Дозволено:

```js
container.innerHTML = '';
```

тільки для очищення контейнера.

---

## 21. Evaluator rules

Evaluator має бути чистим, якщо можливо.

Добре:

```js
export function evaluateChoiceAnswer(task, answer) {
    return {
        correct: answer.choiceId === task.answer.correctChoiceId
    };
}
```

Погано:

```js
function evaluate() {
    document.querySelector(...).classList.add(...);
    ScoreSystem.stars += 1;
}
```

Перевірка відповіді не повинна напряму змінювати рахунок. Нагороду видає flow після confirmed solved.

---

## 22. Testing requirements for tasks

Для кожного нового типу задачі потрібні тести:

- createTask не падає;
- задача має всі обов'язкові поля;
- правильна відповідь визначається правильно;
- неправильна відповідь не зараховується;
- renderer створює інтерактивні елементи;
- після solved `onSolved()` викликається один раз;
- повторний клік не дає повторної винагороди;
- keyboard interaction працює, якщо є input/choice.

---

## 23. Anti-patterns

Не робити:

```txt
- новий тип задачі всередині GameScene
- один великий math-tasks.js на всі задачі
- innerHTML-шаблони з відповідями
- onclick у HTML-рядках
- правильні відповіді як DOM-only стан
- task-data, що імпортує DOM
- renderer, що напряму змінює ScoreSystem
- task, який можна пройти лише drag-and-drop
- task, який зберігає відповідь у localStorage
```

---

## 24. Порядок перенесення математичних задач

1. Створити `task-contracts.js`.
2. Створити `task-validator.js`.
3. Додати `numeric-input` renderer.
4. Додати `numeric-choice` evaluator.
5. Додати `numeric-map` evaluator для кількох полів.
6. Перенести `math-machine` як найпростіший тип.
7. Перенести `number-sequence`.
8. Перенести `math-pyramid`.
9. Перенести `balance-equation`.
10. Перенести `symbol-logic`.
11. Перенести `magic-square` останнім, бо він складніший для UX.

---

## 25. Definition of done для нового task type

Новий тип задачі готовий, якщо:

- [ ] дані відокремлені від renderer;
- [ ] перевірка не змішана з DOM;
- [ ] задача зареєстрована в `TaskRegistry`;
- [ ] задача додана хоча б в один pool;
- [ ] є i18n-тексти або локалізовані поля;
- [ ] неправильна відповідь не ламає стан;
- [ ] правильна відповідь викликає `onSolved()` один раз;
- [ ] completed NPC не дає другу зірку;
- [ ] працює клавіатура;
- [ ] працює touch;
- [ ] є тест;
- [ ] немає console errors.
