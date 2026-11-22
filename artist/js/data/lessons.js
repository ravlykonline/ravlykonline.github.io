/**
 * Рівні гри: 20 рівнів у 4 розділах.
 *
 * Поля рівня:
 *   id, chapter, title, instruction  — тексти (plain text, без HTML)
 *   intro? {icon, title, body}       — коротке пояснення нової ідеї
 *   start {x, y, heading}  — логічні координати (вісь y вниз), кратні 50
 *   pen {color, width}     — початковий колір (назва з data/colors.js) і товщина
 *   showGrid               — true | 'faint' | false (сітка 50 × 50)
 *   toolbox                — доступні типи блоків
 *   solution               — еталонний розв’язок (дерево блоків); ghost і bestBlocks будуються з нього
 *   success {mode, checkColor?, minSegments?} — shape | free
 *   constraints {requireBlocks?, requireNestedRepeat?, bestBlocks?}
 *   startBlocks?           — початкова програма (рівень «знайди помилку»)
 *   successMessage, successTitle?, successButton?
 */
import { blk } from '../core/blockTree.js';

const step = () => blk('step');
const right90 = () => blk('turn_right90');
const left90 = () => blk('turn_left90');
const rep = (n, children) => blk('repeat', n, children);
const fwd = (n) => blk('forward', n);
const right = (n) => blk('right', n);

const CH1 = 'Перші кроки';
const CH2 = 'Повторення';
const CH3 = 'Числа і кути';
const CH4 = 'Кольори і творчість';

const NUMBER_TOOLS = ['forward', 'back', 'right', 'left'];
const REPEAT_ONLY = { requireBlocks: ['repeat'] };

export const lessons = [
  // ── Розділ 1. Перші кроки ──
  {
    id: 'lesson-01', chapter: CH1, title: 'Рівень 1: Перший крок',
    intro: {
      icon: '↑',
      title: 'Крок вперед',
      body: 'Блок «крок вперед» рухає равлика на одну клітинку й малює лінію. Пунктир показує, що треба намалювати.',
    },
    instruction: 'Проведи лінію за пунктиром.',
    hint: 'Кожна крапка на пунктирі — це кінець одного «кроку вперед». Порахуй, скільки кроків до верхньої крапки.',
    start: { x: 0, y: 50, heading: 0 },
    pen: { color: 'жовтогарячий', width: 4 },
    showGrid: true,
    toolbox: ['step'],
    solution: [step(), step(), step()],
    success: { mode: 'shape' },
    successMessage: 'Ти намалював пряму лінію.',
    successTitle: 'Чудова робота!',
  },
  {
    id: 'lesson-02', chapter: CH1, title: 'Рівень 2: Поворот',
    intro: {
      icon: '↻',
      title: 'Поворот',
      body: 'Блок «поворот праворуч» повертає равлика на чверть кола. Сам він не рухається — лише змінює напрямок.',
    },
    instruction: 'Намалюй куток за пунктиром.',
    hint: 'Два кроки вперед, поворот праворуч, ще два кроки.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'зелений', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90'],
    solution: [step(), step(), right90(), step(), step()],
    success: { mode: 'shape' },
    successMessage: 'Ти зробив акуратний куток.',
    successTitle: 'Чудова робота!',
  },
  {
    id: 'lesson-03', chapter: CH1, title: 'Рівень 3: Ліворуч',
    intro: {
      icon: '↺',
      title: 'Поворот ліворуч',
      body: 'Блок «поворот ліворуч» повертає равлика в інший бік — проти годинникової стрілки.',
    },
    instruction: 'Намалюй куток в інший бік за пунктиром.',
    hint: 'Два кроки вперед, поворот ліворуч, три кроки. Рахуй крапки на пунктирі.',
    start: { x: 100, y: 50, heading: 0 },
    pen: { color: 'синій', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90'],
    solution: [step(), step(), left90(), step(), step(), step()],
    success: { mode: 'shape' },
    successMessage: 'Ліворуч теж виходить!',
    successTitle: 'Молодець!',
  },
  {
    id: 'lesson-04', chapter: CH1, title: 'Рівень 4: Сходинки',
    instruction: 'Збудуй сходи з трьох сходинок.',
    hint: 'Одна сходинка: крок, поворот праворуч, крок, поворот ліворуч. Зроби так три рази.',
    start: { x: -100, y: 100, heading: 0 },
    pen: { color: 'фіолетовий', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90'],
    solution: [
      step(), right90(), step(), left90(),
      step(), right90(), step(), left90(),
      step(), right90(), step(), left90(),
    ],
    success: { mode: 'shape' },
    successMessage: 'Сходи готові!',
    successTitle: 'Угору!',
  },
  {
    id: 'lesson-05', chapter: CH1, title: 'Рівень 5: Квадрат вручну',
    instruction: 'Намалюй квадрат за пунктиром. Блоки доведеться ставити по одному.',
    hint: 'Кожна сторона — два кроки вперед, після неї поворот праворуч. Сторін чотири.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'рожевий', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90'],
    solution: [
      step(), step(), right90(), step(), step(), right90(),
      step(), step(), right90(), step(), step(), right90(),
    ],
    success: { mode: 'shape' },
    successMessage: 'Квадрат готовий! Але скільки блоків довелося поставити…',
    successTitle: 'Чудова робота!',
  },

  // ── Розділ 2. Повторення ──
  {
    id: 'lesson-06', chapter: CH2, title: 'Рівень 6: Чарівний цикл',
    intro: {
      icon: '↻',
      title: 'Повторити',
      body: 'Блок «повторити» виконує все, що всередині нього, кілька разів. Не треба ставити однакові блоки вручну.',
    },
    instruction: 'Проведи вгору лінію завдовжки чотири клітинки. Допоможе «повторити».',
    hint: 'Поклади один «крок вперед» усередину «повторити» й постав число повторів 4.',
    start: { x: 0, y: 100, heading: 0 },
    pen: { color: 'червоний', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90', 'repeat'],
    solution: [rep(4, [step()])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Один цикл замість чотирьох блоків!',
    successTitle: 'Чарівно!',
  },
  {
    id: 'lesson-07', chapter: CH2, title: 'Рівень 7: Квадрат циклом',
    instruction: 'Намалюй той самий квадрат, що в рівні 5, але з найменшою кількістю блоків.',
    hint: 'Одна сторона квадрата — два кроки й поворот праворуч. Повтори її стільки разів, скільки сторін.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'фіолетовий', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90', 'repeat'],
    solution: [rep(4, [step(), step(), right90()])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Квадрат готовий — і блоків набагато менше!',
    successTitle: 'Відмінна логіка!',
  },
  {
    id: 'lesson-08', chapter: CH2, title: 'Рівень 8: Сходи циклом',
    instruction: 'Намалюй ті самі сходи з трьох сходинок, що в рівні 4, але через «повторити».',
    hint: 'Усередину «повторити» поклади одну сходинку: крок, поворот праворуч, крок, поворот ліворуч.',
    start: { x: -100, y: 100, heading: 0 },
    pen: { color: 'синій', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90', 'repeat'],
    solution: [rep(3, [step(), right90(), step(), left90()])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Сходи готові!',
    successTitle: 'Угору!',
  },
  {
    id: 'lesson-09', chapter: CH2, title: 'Рівень 9: Пунктир',
    intro: {
      icon: '⬆',
      title: 'Підняти й опустити олівець',
      body: '«Підняти олівець» — равлик рухається без сліду. «Опустити олівець» — слід знову з’являється.',
    },
    instruction: 'Намалюй пунктир вправо: три риски завдовжки в клітинку, між ними проміжки в клітинку.',
    hint: 'Риска — крок з опущеним олівцем, проміжок — крок з піднятим. Повтори це тричі.',
    start: { x: -150, y: 0, heading: 90 },
    pen: { color: 'рожевий', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90', 'pen_up', 'pen_down', 'repeat'],
    solution: [rep(3, [step(), blk('pen_up'), step(), blk('pen_down')])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Пунктир намальований!',
    successTitle: 'Відмінно!',
  },
  {
    id: 'lesson-10', chapter: CH2, title: 'Рівень 10: Два квадрати',
    instruction: 'Намалюй два квадрати зі стороною в клітинку, один над одним. Між ними має лишитись порожня клітинка.',
    hint: 'Після першого квадрата равлик знову на старті. Підніми олівець, перейди до початку другого квадрата й опусти олівець.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'зелений', width: 4 },
    showGrid: true,
    toolbox: ['step', 'turn_right90', 'turn_left90', 'pen_up', 'pen_down', 'repeat'],
    solution: [
      rep(4, [step(), right90()]),
      blk('pen_up'), step(), step(), blk('pen_down'),
      rep(4, [step(), right90()]),
    ],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Два квадрати готові!',
    successTitle: 'Подвійна робота!',
  },

  // ── Розділ 3. Числа і кути ──
  {
    id: 'lesson-11', chapter: CH3, title: 'Рівень 11: Довга лінія',
    intro: {
      icon: '#',
      title: 'Числа в блоках',
      body: 'Тепер ти сам обираєш відстань: «вперед 100» — це два кроки одразу. У блоків повороту число — кут у градусах: 90 — чверть оберту.',
    },
    instruction: 'Проведи вгору лінію завдовжки три клітинки одним блоком.',
    start: { x: 0, y: 50, heading: 0 },
    pen: { color: 'жовтогарячий', width: 4 },
    showGrid: 'faint',
    toolbox: NUMBER_TOOLS,
    solution: [fwd(150)],
    success: { mode: 'shape' },
    successMessage: 'Одного блока досить!',
    successTitle: 'Чудово!',
  },
  {
    id: 'lesson-12', chapter: CH3, title: 'Рівень 12: Прямокутник',
    instruction: 'Намалюй прямокутник завширшки 150 і заввишки 50. Допоможе «повторити».',
    hint: 'У прямокутника довга й коротка сторони чергуються. Які дві сторони можна покласти в один цикл?',
    start: { x: -100, y: 0, heading: 90 },
    pen: { color: 'червоний', width: 4 },
    showGrid: 'faint',
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(2, [fwd(150), right(90), fwd(50), right(90)])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Прямокутник готовий!',
    successTitle: 'Геометрія — це просто!',
  },
  {
    id: 'lesson-13', chapter: CH3, title: 'Рівень 13: Трикутник',
    intro: {
      icon: '△',
      title: 'Кут повороту',
      body: 'Після обходу правильного багатокутника равлик знову дивиться в початковий бік. Однаковий поворот після кожної сторони — 360 ÷ кількість сторін. Для квадрата це 360 ÷ 4 = 90°.',
    },
    instruction: 'Намалюй рівносторонній трикутник зі стороною 100.',
    hint: 'Пригадай правило: повернути на 360 ÷ кількість сторін. У трикутника сторін три.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'жовтогарячий', width: 4 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(3, [fwd(100), right(120)])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Трикутник намальований!',
    successTitle: 'Чудова геометрія!',
  },
  {
    id: 'lesson-14', chapter: CH3, title: 'Рівень 14: Знайди помилку',
    intro: {
      icon: '🔍',
      title: 'Налагодження',
      body: 'Програма вже є, але вона малює не те. Запусти її, порівняй малюнок із пунктиром і виправ помилку.',
    },
    instruction: 'Равлик мав намалювати рівносторонній трикутник, але вийшло щось інше. Знайди помилку й виправ її.',
    hint: 'Запусти програму й подивись, де равлик звернув не туди. Перевір кут повороту за правилом 360 ÷ 3.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'червоний', width: 4 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    startBlocks: [rep(3, [fwd(80), right(90)])],
    solution: [rep(3, [fwd(80), right(120)])],
    success: { mode: 'shape' },
    successMessage: 'Помилку знайдено й виправлено!',
    successTitle: 'Ти — налагоджувач!',
  },
  {
    id: 'lesson-15', chapter: CH3, title: 'Рівень 15: Шестикутник',
    instruction: 'Намалюй правильний шестикутник зі стороною 60. Кут повороту порахуй сам.',
    hint: 'Те саме правило, що для трикутника: 360 ÷ кількість сторін.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'зелений', width: 4 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(6, [fwd(60), right(60)])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Шестикутник — як бджолині стільники!',
    successTitle: 'Ти порахував кут!',
  },
  {
    id: 'lesson-16', chapter: CH3, title: 'Рівень 16: Зірка',
    intro: {
      icon: '★',
      title: 'Різкий поворот',
      body: 'У зірки равлик повертає дуже різко — майже розвертається. Пробуй різні кути й дивись на пунктир: потрібний кут ближче до 150°, ніж до 90°.',
    },
    instruction: 'Намалюй п’ятикутну зірку з променями завдовжки 120, не відриваючи олівця.',
    start: { x: 0, y: 50, heading: 0 },
    pen: { color: 'фіолетовий', width: 4 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(5, [fwd(120), right(144)])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Зірка намальована! Ти — художник!',
    successTitle: 'Зіркова робота!',
  },
  {
    id: 'lesson-17', chapter: CH3, title: 'Рівень 17: Майже коло',
    instruction: 'Намалюй майже коло за пунктиром. Після кожного руху на 10 кроків поверни праворуч на 10°. Скільки таких повторів потрібно для повного оберту?',
    hint: 'Повний оберт — 360°. Поділи 360 на 10, щоб знайти кількість повторів.',
    start: { x: -50, y: 0, heading: 0 },
    pen: { color: 'синій', width: 4 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(36, [fwd(10), right(10)])],
    success: { mode: 'shape' },
    constraints: REPEAT_ONLY,
    successMessage: 'Багато маленьких кроків — і вийшло коло!',
    successTitle: 'Майже ідеально!',
  },

  // ── Розділ 4. Кольори і творчість ──
  {
    id: 'lesson-18', chapter: CH4, title: 'Рівень 18: Веселковий квадрат',
    intro: {
      icon: '●',
      title: 'Колір',
      body: 'Блок «колір» змінює колір олівця. Усі наступні лінії будуть цього кольору, доки не зміниш його знову.',
    },
    instruction: 'Намалюй квадрат зі стороною 100. Сторони йдуть за стрілкою: червона, жовта, зелена, синя.',
    start: { x: -50, y: 50, heading: 0 },
    pen: { color: 'чорний', width: 4 },
    showGrid: false,
    toolbox: ['forward', 'right', 'left', 'color'],
    solution: [
      blk('color', 'червоний'), fwd(100), right(90),
      blk('color', 'жовтий'), fwd(100), right(90),
      blk('color', 'зелений'), fwd(100), right(90),
      blk('color', 'синій'), fwd(100), right(90),
    ],
    success: { mode: 'shape', checkColor: true },
    successMessage: 'Яка яскрава веселка!',
    successTitle: 'Кольорова робота!',
  },
  {
    id: 'lesson-19', chapter: CH4, title: 'Рівень 19: Квітка',
    intro: {
      icon: '✿',
      title: 'Цикл у циклі',
      body: 'Один «повторити» можна поставити всередину іншого. Внутрішній цикл виконується повністю на кожному колі зовнішнього.',
    },
    instruction: 'Намалюй квітку: шість квадратів зі стороною 60, кожен повернутий на 60° відносно попереднього.',
    hint: 'Спершу намалюй один квадрат. Потім повтори дві дії: намалюй такий квадрат і повернися праворуч на 60°.',
    start: { x: 0, y: 0, heading: 0 },
    pen: { color: 'рожевий', width: 3 },
    showGrid: false,
    toolbox: [...NUMBER_TOOLS, 'repeat'],
    solution: [rep(6, [rep(4, [fwd(60), right(90)]), right(60)])],
    success: { mode: 'shape' },
    constraints: { requireBlocks: ['repeat'], requireNestedRepeat: true },
    successMessage: 'Яка гарна квітка!',
    successTitle: 'Квітуча робота!',
  },
  {
    id: 'lesson-20', chapter: CH4, title: 'Рівень 20: Вільне малювання',
    instruction: 'Твій равлик, твої правила! Намалюй власний малюнок (щонайменше 8 відрізків).',
    start: { x: 0, y: 0, heading: 0 },
    pen: { color: 'жовтогарячий', width: 4 },
    showGrid: false,
    toolbox: [
      'step', 'turn_right90', 'turn_left90', 'forward', 'back', 'right', 'left',
      'pen_up', 'pen_down', 'color', 'repeat',
    ],
    success: { mode: 'free', minSegments: 8 },
    successMessage: 'Ти — справжній художник!',
    successTitle: 'Творча робота!',
    successButton: 'Почати знову',
  },
];
