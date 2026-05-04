const ALL_TILES = [
  'up', 'right', 'down', 'left',
  'right-up', 'down-right', 'left-down', 'up-left',
  'right-down', 'down-left', 'left-up', 'up-right'
];

function cloneArrowMap(source) {
  return Object.fromEntries(Object.entries(source || {}).map(([key, value]) => [key, value]));
}

function centerLevelLayout(level) {
  const coords = [
    level.start,
    level.apple,
    ...level.obstacles.map((item) => ({ r: item.r, c: item.c })),
    ...Object.keys(level.presetArrows).map((key) => {
      const [r, c] = key.split(',').map(Number);
      return { r, c };
    })
  ];

  const minR = Math.min(...coords.map((item) => item.r));
  const maxR = Math.max(...coords.map((item) => item.r));
  const minC = Math.min(...coords.map((item) => item.c));
  const maxC = Math.max(...coords.map((item) => item.c));
  const boxHeight = maxR - minR + 1;
  const boxWidth = maxC - minC + 1;
  const targetMinR = Math.max(0, Math.floor((level.rows - boxHeight) / 2));
  const targetMinC = Math.max(0, Math.floor((level.cols - boxWidth) / 2));
  const shiftR = targetMinR - minR;
  const shiftC = targetMinC - minC;

  return {
    ...level,
    start: { r: level.start.r + shiftR, c: level.start.c + shiftC },
    apple: { r: level.apple.r + shiftR, c: level.apple.c + shiftC },
    obstacles: level.obstacles.map((item) => ({ ...item, r: item.r + shiftR, c: item.c + shiftC })),
    presetArrows: Object.fromEntries(
      Object.entries(level.presetArrows).map(([key, value]) => {
        const [r, c] = key.split(',').map(Number);
        return [`${r + shiftR},${c + shiftC}`, value];
      })
    )
  };
}

function createLevel(definition) {
  return {
    id: definition.id,
    name: definition.name,
    type: definition.type || 'play',
    rows: definition.rows,
    cols: definition.cols,
    start: { ...definition.start },
    apple: { ...definition.apple },
    obstacles: (definition.obstacles || []).map((item) => ({ ...item })),
    startFacing: definition.startFacing || 'right',
    allowedTiles: [...(definition.allowedTiles || [])],
    presetArrows: cloneArrowMap(definition.presetArrows),
    hint: definition.hint || '',
    goal: definition.goal || ''
  };
}

export const levels = [
  createLevel({
    id: 1,
    name: 'Пряма доріжка',
    type: 'play', rows: 6, cols: 8,
    start: { r: 2, c: 2 }, apple: { r: 2, c: 5 }, obstacles: [],
    allowedTiles: ['right'], presetArrows: {},
    hint: 'Перетягни стрілочку праворуч на клітинки між равликом і яблуком.',
    goal: 'Навчись рухатися праворуч.'
  }),
  createLevel({
    id: 2,
    name: 'Крокуємо вгору',
    type: 'play', rows: 6, cols: 8,
    start: { r: 4, c: 3 }, apple: { r: 1, c: 3 }, obstacles: [],
    allowedTiles: ['up'], presetArrows: {},
    hint: 'Тепер яблуко нагорі. Яка стрілка тут потрібна?',
    goal: 'Навчись рухатися вгору.'
  }),
  createLevel({
    id: 3,
    name: 'Ліворуч до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 2, c: 6 }, apple: { r: 2, c: 1 }, obstacles: [],
    startFacing: 'left',
    allowedTiles: ['left'], presetArrows: {},
    hint: 'Яблуко ліворуч! Поклади правильні стрілки й доведи равлика до нього.',
    goal: 'Навчись рухатися ліворуч.'
  }),
  createLevel({
    id: 4,
    name: 'Кроки вниз',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 3 }, apple: { r: 5, c: 3 }, obstacles: [],
    allowedTiles: ['down'], presetArrows: {},
    hint: 'Тепер равлик іде вниз. Проклади шлях донизу.',
    goal: 'Навчись рухатися вниз.'
  }),
  createLevel({
    id: 5,
    name: 'Неправильний шлях',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 3, c: 1 }, apple: { r: 3, c: 6 }, obstacles: [],
    allowedTiles: ['left', 'right'],
    presetArrows: { '3,2': 'right', '3,3': 'right', '3,4': 'left', '3,5': 'left' },
    hint: 'Маршрут уже готовий, але щось пішло не так. Знайди помилки і виправ їх.',
    goal: 'Навчись перевіряти і виправляти послідовність стрілок.'
  }),
  createLevel({
    id: 6,
    name: 'Поворот до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 2 }, apple: { r: 1, c: 5 }, obstacles: [],
    allowedTiles: ['up', 'right', 'left-up'],
    presetArrows: { '3,5': 'left-up' },
    hint: 'На полі вже стоїть поворотна стрілка — вона повертає равлика вгору. Поклади прямі стрілки вправо до неї, а потім вгору після неї.',
    goal: 'Зрозуміти, що робить поворотна стрілка.'
  }),
  createLevel({
    id: 7,
    name: 'Звивистий шлях до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 1, c: 2 }, apple: { r: 4, c: 5 }, obstacles: [],
    allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-right'], presetArrows: {},
    hint: 'Склади маршрут до яблука, використовуючи наявні стрілки з поворотами.',
    goal: 'Навчись поєднувати прямі стрілки з поворотами.'
  }),
  createLevel({
    id: 8,
    name: 'Попереду перешкоди!',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 1 }, apple: { r: 3, c: 6 },
    obstacles: [
      { r: 3, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 5, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['up', 'right', 'down', 'left', 'down-right', 'left-down'], presetArrows: {},
    hint: 'Склади безпечний маршрут до яблука та обійди перешкоди на шляху.',
    goal: 'Навчись планувати шлях в обхід каміння й колод.'
  }),
  createLevel({
    id: 9,
    name: 'Обходимо перешкоди',
    type: 'play', rows: 6, cols: 8,
    start: { r: 2, c: 1 }, apple: { r: 2, c: 6 },
    obstacles: [
      { r: 2, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 3, kind: 'log', label: 'Колода' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['up', 'right', 'down', 'left', 'up-right', 'left-up'], presetArrows: {},
    hint: 'Побудуй маршрут до яблука з новими поворотами.',
    goal: 'Навчись обирати правильну пару поворотів для обходу.'
  }),
  createLevel({
    id: 10,
    name: 'Сходинки до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 1, c: 0 }, apple: { r: 4, c: 6 },
    obstacles: [
      { r: 1, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 1, kind: 'log', label: 'Колода' },
      { r: 2, c: 4, kind: 'log', label: 'Колода' },
      { r: 3, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-right'], presetArrows: {},
    hint: 'Проклади маршрут між перешкодами, використовуючи потрібні повороти.',
    goal: 'Навчись будувати складніший шлях між перешкодами.'
  }),
  createLevel({
    id: 11,
    name: 'Поворот не туди',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 1, c: 6 }, apple: { r: 4, c: 1 },
    startFacing: 'left',
    obstacles: [
      { r: 1, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 2, kind: 'log', label: 'Колода' },
      { r: 2, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 1, kind: 'log', label: 'Колода' },
      { r: 3, c: 4, kind: 'log', label: 'Колода' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-left', 'right-down', 'down-left'],
    presetArrows: {
      '1,5': 'left',
      '1,4': 'left',
      '2,4': 'down-left',
      '2,3': 'right-down',
      '3,3': 'left',
      '3,2': 'right-down',
      '4,2': 'down-left'
    },
    hint: 'Маршрут уже готовий, але щось пішло не так. Знайди, де саме потрібно виправити стрілки.',
    goal: 'Навчись відлагоджувати складні маршрути з поворотами.'
  }),
  createLevel({
    id: 12,
    name: 'Поворот занадто рано',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 3, c: 0 }, apple: { r: 3, c: 7 },
    obstacles: [
      { r: 3, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 2, kind: 'log', label: 'Колода' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ['up', 'right', 'down', 'left-up', 'down-right', 'left-down'],
    presetArrows: {
      '3,1': 'left-up',
      '2,1': 'down-right',
      '2,2': 'right',
      '2,3': 'right',
      '2,4': 'left-down',
      '2,5': 'left-down',
      '3,5': 'up-right',
      '3,6': 'right'
    },
    hint: 'Маршрут майже готовий, але один поворот стоїть занадто рано і веде до перешкоди. Запусти, подивись на зупинку й заміни цю команду.',
    goal: 'Навчитись бачити не лише неправильну стрілку, а й неправильне місце для правильної стрілки.'
  }),
  createLevel({
    id: 13,
    name: 'Два повороти підряд',
    type: 'play', rows: 6, cols: 8,
    start: { r: 2, c: 1 }, apple: { r: 3, c: 6 },
    obstacles: [
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' },
      { r: 3, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['right', 'down', 'left-down', 'up-right'],
    presetArrows: {},
    hint: 'Прямий шлях перекрито. Постав два повороти поруч: спочатку вправо → вниз, а одразу після нього вниз → вправо.',
    goal: 'Навчитись читати два сусідні повороти як одну маленьку “сходинку” маршруту.'
  }),
  createLevel({
    id: 14,
    name: 'Загублена команда в обході',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 4, c: 0 }, apple: { r: 1, c: 7 },
    obstacles: [
      { r: 4, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 5, kind: 'log', label: 'Колода' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ['up', 'right', 'left-up', 'down-right'],
    presetArrows: {
      '4,1': 'left-up',
      '3,1': 'up',
      '2,1': 'down-right',
      '2,2': 'right',
      '2,4': 'left-up',
      '1,4': 'down-right',
      '1,5': 'right',
      '1,6': 'right'
    },
    hint: 'У готовому обході загубилася одна команда. Запусти маршрут і знайди порожню клітинку, де равлик зупиняється.',
    goal: 'Навчитись знаходити пропуск у вже складеному маршруті, а не будувати все з нуля.'
  }),
  createLevel({
    id: 15,
    name: 'Довга дорога з пастками',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 0 }, apple: { r: 5, c: 7 },
    obstacles: [
      { r: 3, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 2, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 4, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['down', 'right', 'down-right', 'up-right', 'left-up', 'left-down'],
    presetArrows: {},
    hint: 'Перешкоди стоять просто перед равликом, тому спершу треба обійти їх знизу, а потім повернутися до яблука.',
    goal: 'Навчитись будувати довший маршрут з кількома поворотами, коли прямий шлях одразу заблокований.'
  }),
  createLevel({
    id: 16,
    name: 'Лісовий лабіринт',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 0 }, apple: { r: 5, c: 6 },
    obstacles: [
      { r: 0, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 2, kind: 'log',  label: 'Колода' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 4, kind: 'log',  label: 'Колода' },
      { r: 4, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 4, kind: 'log',  label: 'Колода' }
    ],
    allowedTiles: ALL_TILES,
    presetArrows: {},
    hint: 'Тут доступні всі стрілки. Спочатку подивись на все поле, потім починай складати маршрут.',
    goal: 'Навчитись планувати маршрут перш ніж починати.'
  }),
  createLevel({
    id: 17,
    name: 'Дві помилки на довгій дорозі',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 3, c: 0 }, apple: { r: 5, c: 7 },
    obstacles: [
      { r: 3, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 2, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 4, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['down', 'right', 'down-right', 'up-right', 'left-up', 'left-down'],
    presetArrows: {
      '4,0': 'down',
      '5,0': 'up-right',
      '5,1': 'right',
      '5,2': 'right',
      '4,2': 'down-right',
      '4,3': 'right',
      '5,4': 'right',
      '5,5': 'right',
      '5,6': 'right'
    },
    hint: 'Тут дві помилки. Виправ першу, запусти ще раз — і тільки тоді шукай другу.',
    goal: 'Навчитись налагоджувати довший алгоритм поступово: одна перевірка — одна помилка.'
  }),
  createLevel({
    id: 18,
    name: 'Переплутані сусідні повороти',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 2, c: 1 }, apple: { r: 3, c: 6 },
    startFacing: 'right',
    obstacles: [
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' },
      { r: 3, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['right', 'down', 'left-down', 'up-right'],
    presetArrows: {
      '2,2': 'right',
      '2,3': 'up-right',
      '3,3': 'left-down',
      '3,4': 'right',
      '3,5': 'right'
    },
    hint: 'Дві сусідні поворотні стрілки переплутали місцями. Подивись, з якого боку равлик заходить у кожен поворот, і поміняй їх.',
    goal: 'Навчитись розрізняти повороти не за формою, а за входом і виходом.'
  }),
  createLevel({
    id: 19,
    name: 'Через весь ліс',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 7 }, apple: { r: 5, c: 0 },
    startFacing: 'left',
    obstacles: [
      { r: 0, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 4, kind: 'log',  label: 'Колода' },
      { r: 2, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 2, kind: 'log',  label: 'Колода' },
      { r: 3, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 5, kind: 'log',  label: 'Колода' },
      { r: 5, c: 3, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ALL_TILES,
    presetArrows: {},
    hint: 'Довгий шлях через цілий ліс. Плануй крок за кроком.',
    goal: 'Застосуй усі вивчені команди разом.'
  }),
  createLevel({
    id: 20,
    name: 'Велика подорож равлика',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 0 }, apple: { r: 5, c: 7 },
    obstacles: [
      { r: 0, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 3, kind: 'log',  label: 'Колода' },
      { r: 1, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 1, kind: 'log',  label: 'Колода' },
      { r: 2, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 3, kind: 'log',  label: 'Колода' },
      { r: 3, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 5, kind: 'log',  label: 'Колода' },
      { r: 5, c: 3, kind: 'log',  label: 'Колода' }
    ],
    allowedTiles: ALL_TILES,
    presetArrows: {},
    hint: 'Це фінал! Поглянь на все поле, знайди прохід і проведи равлика до яблука.',
    goal: 'Застосуй усе, чого навчився, у великій подорожі.'
  })
];
export function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId) || null;
}
