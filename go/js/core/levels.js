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
    hint: 'Постав стрілки вправо до яблука.',
    goal: 'Рух праворуч.'
  }),
  createLevel({
    id: 2,
    name: 'Крокуємо вгору',
    type: 'play', rows: 6, cols: 8,
    start: { r: 4, c: 3 }, apple: { r: 1, c: 3 }, obstacles: [],
    allowedTiles: ['up'], presetArrows: {},
    hint: 'Яблуко нагорі. Постав стрілки вгору.',
    goal: 'Рух угору.'
  }),
  createLevel({
    id: 3,
    name: 'Ліворуч до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 2, c: 6 }, apple: { r: 2, c: 1 }, obstacles: [],
    startFacing: 'left',
    allowedTiles: ['left'], presetArrows: {},
    hint: 'Яблуко ліворуч. Постав стрілки вліво.',
    goal: 'Рух ліворуч.'
  }),
  createLevel({
    id: 4,
    name: 'Кроки вниз',
    type: 'play', rows: 6, cols: 8,
    start: { r: 0, c: 3 }, apple: { r: 5, c: 3 }, obstacles: [],
    allowedTiles: ['down'], presetArrows: {},
    hint: 'Яблуко внизу. Постав стрілки вниз.',
    goal: 'Рух униз.'
  }),
  createLevel({
    id: 5,
    name: 'Неправильний шлях',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 3, c: 1 }, apple: { r: 3, c: 6 }, obstacles: [],
    allowedTiles: ['left', 'right'],
    presetArrows: { '3,2': 'right', '3,3': 'right', '3,4': 'left', '3,5': 'left' },
    hint: 'Маршрут уже є. Запусти равлика й виправ помилку.',
    goal: 'Знайди помилку.'
  }),
  createLevel({
    id: 6,
    name: 'Поворот до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 3, c: 2 }, apple: { r: 1, c: 5 }, obstacles: [],
    allowedTiles: ['up', 'right', 'left-up'],
    presetArrows: { '3,5': 'left-up' },
    hint: 'На полі вже є поворот. Доведи равлика до нього, а потім — до яблука.',
    goal: 'Перший поворот.'
  }),
  createLevel({
    id: 7,
    name: 'Звивистий шлях до яблука',
    type: 'play', rows: 6, cols: 8,
    start: { r: 1, c: 2 }, apple: { r: 4, c: 5 }, obstacles: [],
    allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-right'], presetArrows: {},
    hint: 'Постав прямі стрілки й повороти до яблука.',
    goal: 'Прямо і поворот.'
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
    hint: 'Перед равликом перешкоди. Обійди їх.',
    goal: 'Обхід перешкод.'
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
    hint: 'Обійди перешкоди іншою стороною.',
    goal: 'Інший обхід.'
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
    hint: 'Проведи равлика між перешкодами.',
    goal: 'Шлях між камінням.'
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
    hint: 'Маршрут уже є. Запусти й знайди неправильний поворот.',
    goal: 'Помилка в повороті.'
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
    hint: 'Рівник звернув не там. Запусти й подивись де він зупинився.',
    goal: 'Поворот не там.'
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
    hint: 'Прямо не пройти. Зроби маленьку сходинку з двох поворотів.',
    goal: 'Два повороти поруч.'
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
    hint: 'В обході бракує однієї стрілки. Знайди порожнє місце.',
    goal: 'Загублена стрілка.'
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
    hint: 'Прямо не пройти. Знайди обхід.',
    goal: 'Довший шлях.'
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
    hint: 'Подивись на все поле. Потім складай шлях.',
    goal: 'Плануй шлях.'
  }),
  createLevel({
    id: 17,
    name: 'Дві помилки на звивистій дорозі',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 5, c: 0 }, apple: { r: 1, c: 7 },
    obstacles: [
      { r: 4, c: 1, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 3, kind: 'log', label: 'Колода' },
      { r: 4, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 1, kind: 'log', label: 'Колода' },
      { r: 3, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 3, kind: 'log', label: 'Колода' },
      { r: 2, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 1, c: 3, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['right', 'up', 'left-up', 'down-right'],
    presetArrows: {
      '5,1': 'right',
      '5,2': 'left-up',
      '4,2': 'up',
      '3,2': 'up',
      '3,3': 'right',
      '3,4': 'left-up',
      '2,4': 'up',
      '1,4': 'down-right',
      '1,5': 'right'
    },
    hint: 'Тут дві помилки. Виправ одну, потім шукай другу.',
    goal: 'Дві помилки.'
  }),
  createLevel({
    id: 18,
    name: 'Переплутані повороти в лабіринті',
    type: 'debug', rows: 6, cols: 8,
    start: { r: 4, c: 0 }, apple: { r: 5, c: 7 },
    startFacing: 'right',
    obstacles: [
      { r: 1, c: 4, kind: 'log', label: 'Колода' },
      { r: 2, c: 3, kind: 'rock', label: 'Каміння' },
      { r: 2, c: 6, kind: 'rock', label: 'Каміння' },
      { r: 3, c: 3, kind: 'log', label: 'Колода' },
      { r: 4, c: 5, kind: 'rock', label: 'Каміння' },
      { r: 4, c: 6, kind: 'log', label: 'Колода' },
      { r: 5, c: 4, kind: 'rock', label: 'Каміння' },
      { r: 5, c: 5, kind: 'log', label: 'Колода' }
    ],
    allowedTiles: ['right', 'up', 'down', 'left-up', 'down-right', 'left-down', 'up-right'],
    presetArrows: {
      '4,1': 'right',
      '4,2': 'right',
      '4,3': 'right',
      '4,4': 'left-up',
      '3,4': 'up',
      '2,4': 'down-right',
      '2,5': 'up-right',
      '3,5': 'left-down',
      '3,6': 'right',
      '3,7': 'left-down',
      '4,7': 'down'
    },
    hint: 'Два повороти стоять не на своїх місцях. Поміняй їх.',
    goal: 'Повороти місцями.'
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
    hint: 'Довгий шлях через ліс. Іди крок за кроком.',
    goal: 'Великий маршрут.'
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
    hint: 'Фінал! Знайди прохід до яблука.',
    goal: 'Велика подорож.'
  })
];
export function getLevelById(levelId) {
  return levels.find((level) => level.id === levelId) || null;
}
