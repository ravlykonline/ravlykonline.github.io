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
    start: { r: 3, c: 2 }, apple: { r: 2, c: 5 }, obstacles: [],
    allowedTiles: ['up', 'right', 'down', 'left', 'left-up'], presetArrows: {},
    hint: 'Склади маршрут до яблука і спробуй використати поворот.',
    goal: 'Познайомся з першим поворотом на маршруті.'
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
    name: 'Мандрівка між перешкодами',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 1 }, apple: { r: 3, c: 5 },
    obstacles: [
      { r: 0, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 4, kind: 'log', label: 'Колода' },
      { r: 2, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 2, kind: 'log', label: 'Колода' },
      { r: 3, c: 4, kind: 'log', label: 'Колода' },
      { r: 4, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 2, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'На цьому рівні відкриті всі стрілки. Знайди найкращий маршрут між перешкодами.',
    goal: 'Навчись самостійно обирати потрібні стрілки серед усіх доступних.'
  }),
  createLevel({
    id: 13,
    name: 'Прогулянка в лісі',
    type: 'play', rows: 6, cols: 8,
    start: { r: 4, c: 6 }, apple: { r: 1, c: 1 },
    startFacing: 'left',
    obstacles: [
      { r: 0, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 2, kind: 'log', label: 'Колода' },
      { r: 2, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 5, kind: 'log', label: 'Колода' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 5, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Склади маршрут до яблука, оминаючи перешкоди на полі.',
    goal: 'Навчись планувати довший шлях серед різних перешкод.'
  }),
  createLevel({
    id: 14,
    name: 'Шлях між перешкодами',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 7 }, apple: { r: 5, c: 0 },
    startFacing: 'left',
    obstacles: [
      { r: 0, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 6, kind: 'log', label: 'Колода' },
      { r: 1, c: 3, kind: 'log', label: 'Колода' },
      { r: 1, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 1, kind: 'log', label: 'Колода' },
      { r: 2, c: 6, kind: 'log', label: 'Колода' },
      { r: 3, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 1, kind: 'log', label: 'Колода' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 3, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Проклади звивистий маршрут між колодами та камінням.',
    goal: 'Навчись планувати довгий шлях серед перешкод.'
  }),
  createLevel({
    id: 15,
    name: 'На іншому боці лісу',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 7 }, apple: { r: 0, c: 0 },
    startFacing: 'left',
    obstacles: [
      { r: 0, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 3, kind: 'log', label: 'Колода' },
      { r: 0, c: 6, kind: 'log', label: 'Колода' },
      { r: 1, c: 1, kind: 'log', label: 'Колода' },
      { r: 1, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 6, kind: 'log', label: 'Колода' },
      { r: 3, c: 1, kind: 'log', label: 'Колода' },
      { r: 3, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 6, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Знайди шлях до яблука та обійди перешкоди.',
    goal: 'Навчись планувати довгий маршрут.'
  }),
  createLevel({
    id: 16,
    name: 'Звивистий шлях у лісі',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 0 }, apple: { r: 4, c: 2 },
    obstacles: [
      { r: 0, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 0, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 1, kind: 'log', label: 'Колода' },
      { r: 1, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 3, kind: 'log', label: 'Колода' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' },
      { r: 3, c: 1, kind: 'log', label: 'Колода' },
      { r: 3, c: 7, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 4, kind: 'log', label: 'Колода' },
      { r: 4, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 6, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Знайди шлях до яблука крізь щільно розставлені перешкоди.',
    goal: 'Навчись планувати маршрут серед перешкод.'
  }),
  createLevel({
    id: 17,
    name: 'Полоса перешкод',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 0 }, apple: { r: 2, c: 6 },
    obstacles: [
      { r: 1, c: 1, kind: 'log', label: 'Колода' },
      { r: 1, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 7, kind: 'log', label: 'Колода' },
      { r: 2, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 3, kind: 'log', label: 'Колода' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' },
      { r: 2, c: 7, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 1, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 7, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 5, kind: 'log', label: 'Колода' },
      { r: 4, c: 7, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Знайди прохід крізь щільну мережу перешкод.',
    goal: 'Навчись бачити шлях серед колод та каміння.'
  }),
  createLevel({
    id: 18,
    name: 'Великий лабіринт лісу',
    type: 'play', rows: 6, cols: 8,
    start: { r: 5, c: 0 }, apple: { r: 0, c: 7 },
    obstacles: [
      { r: 0, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 0, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 1, kind: 'log', label: 'Колода' },
      { r: 2, c: 3, kind: 'log', label: 'Колода' },
      { r: 2, c: 5, kind: 'log', label: 'Колода' },
      { r: 2, c: 7, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 7, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 1, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Знайди найкращий маршрут крізь великий лабіринт.',
    goal: 'Навчись планувати довгий шлях через багато перешкод.'
  }),
  createLevel({
    id: 19,
    name: 'Густі хащі',
    type: 'play', rows: 6, cols: 8,
    start: { r: 5, c: 0 }, apple: { r: 3, c: 5 },
    obstacles: [
      { r: 1, c: 2, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 3, kind: 'log', label: 'Колода' },
      { r: 1, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 5, kind: 'log', label: 'Колода' },
      { r: 2, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 6, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 0, kind: 'log', label: 'Колода' },
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 2, kind: 'log', label: 'Колода' },
      { r: 4, c: 4, kind: 'log', label: 'Колода' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Проклади маршрут крізь густі хащі лісу.',
    goal: 'Навчись бачити проходи в щільно заповненому лісі.'
  }),
  createLevel({
    id: 20,
    name: 'Велика подорож равлика',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 0 }, apple: { r: 5, c: 7 },
    obstacles: [
      { r: 0, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 0, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 1, kind: 'log', label: 'Колода' },
      { r: 2, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 6, kind: 'log', label: 'Колода' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 3, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 1, kind: 'log', label: 'Колода' },
      { r: 4, c: 6, kind: 'log', label: 'Колода' },
      { r: 5, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 4, kind: 'log', label: 'Колода' },
      { r: 5, c: 6, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ALL_TILES, presetArrows: {},
    hint: 'Фінальний рівень: подивись на все поле, сплануй шлях і приведи равлика до яблука.',
    goal: 'Застосуй всі навички планування маршруту на одному великому полі.'
  })
];
export function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId) || null;
}
