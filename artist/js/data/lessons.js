export const lessons = [
  {
    id: 'lesson-01',
    order: 1,
    title: 'Рівень 1: Рухайся вперед',
    instruction: 'Пересунь равлика вниз на 4 клітинки.',
    start: { x: 4, y: 1, dir: 'S' },
    toolbox: ['move_s'],
    success: {
      mode: 'exact-path',
      goal: [[4, 2], [4, 3], [4, 4], [4, 5]],
    },
    trailColor: 'var(--color-trail-orange)',
    successMessage: 'Ти намалював пряму лінію.',
    successTitle: 'Чудова робота!',
    successButton: 'Наступний рівень →',
  },
  {
    id: 'lesson-02',
    order: 2,
    title: 'Рівень 2: Кут',
    instruction: 'Рухайся вправо 3 клітинки, потім вниз 3 клітинки.',
    start: { x: 1, y: 2, dir: 'E' },
    toolbox: ['move_e', 'move_s'],
    success: {
      mode: 'exact-path',
      goal: [[2, 2], [3, 2], [4, 2], [4, 3], [4, 4], [4, 5]],
    },
    trailColor: 'var(--color-trail-teal)',
    successMessage: 'Ти зробив акуратний кут.',
    successTitle: 'Чудова робота!',
    successButton: 'Наступний рівень →',
  },
  {
    id: 'lesson-03',
    order: 3,
    title: 'Рівень 3: Повторення',
    instruction: 'Намалюй лінію вниз 5 разів, використавши лише 2 блоки.',
    start: { x: 4, y: 1, dir: 'S' },
    toolbox: ['move_s', 'repeat'],
    success: {
      mode: 'exact-path',
      goal: [[4, 2], [4, 3], [4, 4], [4, 5], [4, 6]],
    },
    trailColor: 'var(--color-trail-pink)',
    successMessage: 'Ти успішно використав цикл.',
    successTitle: 'Відмінна логіка!',
    successButton: 'Наступний рівень →',
  },
  {
    id: 'lesson-04',
    order: 4,
    title: 'Рівень 4: Форма букви',
    instruction: 'Намалюй форму: вправо 3 клітинки, потім вниз 3 клітинки.',
    start: { x: 2, y: 2, dir: 'E' },
    toolbox: ['move_e', 'move_s', 'repeat'],
    success: {
      mode: 'exact-path',
      goal: [[3, 2], [4, 2], [5, 2], [5, 3], [5, 4], [5, 5]],
    },
    trailColor: 'var(--color-trail-purple)',
    successMessage: 'Форма збігається з завданням.',
    successTitle: 'Чудова робота!',
    successButton: 'Наступний рівень →',
  },
  {
    id: 'lesson-05',
    order: 5,
    title: 'Рівень 5: Сходи',
    instruction: 'Повторюй: вправо, потім вниз — три рази.',
    start: { x: 1, y: 1, dir: 'E' },
    toolbox: ['move_e', 'move_s', 'repeat'],
    success: {
      mode: 'exact-path',
      goal: [[2, 1], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4]],
    },
    trailColor: 'var(--color-trail-green)',
    successMessage: 'Сходи виглядають правильно.',
    successTitle: 'Молодець!',
    successButton: 'Наступний рівень →',
  },
  {
    id: 'lesson-06',
    order: 6,
    title: 'Рівень 6: Вільне малювання',
    instruction: 'Малюй що завгодно. Зроби щонайменше 6 ходів.',
    start: { x: 4, y: 3, dir: 'E' },
    toolbox: ['move_n', 'move_s', 'move_e', 'move_w', 'repeat'],
    success: {
      mode: 'minimum-steps',
      minSteps: 6,
    },
    trailColor: 'var(--color-trail-orange)',
    successMessage: 'Ти створив власний малюнок.',
    successTitle: 'Творча робота!',
    successButton: 'Завершити',
  },
  // ── Turtle levels ─────────────────────────────────────────────────────────

  // Level 7: straight line. Ghost: (0,0)→(0,-100) — heading 0 = up = negative y
  {
    id: 'lesson-07',
    order: 7,
    mode: 'turtle',
    title: 'Рівень 7: Пряма лінія',
    instruction: 'Намалюй вертикальну лінію. Використай команду «вперед 100».',
    start: { x: 0, y: 0, heading: 0 },
    toolbox: ['turtle_forward'],
    goalSegments: [{ from: [0, 0], to: [0, -100] }],
    success: { mode: 'turtle-minimum', minSegments: 1 },
    trailColor: 'var(--color-trail-orange)',
    successMessage: 'Черепаха намалювала пряму лінію!',
    successTitle: 'Чудово!',
    successButton: 'Наступний рівень →',
  },

  // Level 8: dashed line. Ghost: 3 segments with gaps.
  // Solution: вперед 40, підняти, вперед 25, опустити, вперед 40, підняти, вперед 25, опустити, вперед 40
  {
    id: 'lesson-08',
    order: 8,
    mode: 'turtle',
    title: 'Рівень 8: Пунктирна лінія',
    instruction: 'Намалюй пунктир: вперед 40, підняти, вперед 25, опустити — повтори 3 рази.',
    start: { x: 0, y: 0, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_pen_up', 'turtle_pen_down'],
    goalSegments: [
      { from: [0, 0], to: [0, -40] },
      { from: [0, -65], to: [0, -105] },
      { from: [0, -130], to: [0, -170] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 3 },
    trailColor: 'var(--color-trail-teal)',
    successMessage: 'Пунктирна лінія намальована!',
    successTitle: 'Відмінно!',
    successButton: 'Наступний рівень →',
  },

  // Level 9: right angle. Ghost: (0,0)→(0,-100), (0,-100)→(100,-100)
  // Solution: вперед 100, праворуч 90, вперед 100
  {
    id: 'lesson-09',
    order: 9,
    mode: 'turtle',
    title: 'Рівень 9: Прямий кут',
    instruction: 'Намалюй прямий кут: вперед 100, праворуч 90, вперед 100.',
    start: { x: 0, y: 0, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right'],
    goalSegments: [
      { from: [0, 0], to: [0, -100] },
      { from: [0, -100], to: [100, -100] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 2 },
    trailColor: 'var(--color-trail-purple)',
    successMessage: 'Прямий кут готовий!',
    successTitle: 'Правильно!',
    successButton: 'Наступний рівень →',
  },

  // Level 10: staircase (right + left). Ghost: 4-step staircase going up-right.
  // Solution: вперед 60, праворуч 90, вперед 60, ліворуч 90, вперед 60, праворуч 90, вперед 60
  {
    id: 'lesson-10',
    order: 10,
    mode: 'turtle',
    title: 'Рівень 10: Сходи',
    instruction: 'Намалюй сходи: вперед 60, праворуч 90, вперед 60, ліворуч 90 — двічі, потім вперед 60.',
    start: { x: 0, y: 0, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right', 'turtle_left'],
    goalSegments: [
      { from: [0, 0], to: [0, -60] },
      { from: [0, -60], to: [60, -60] },
      { from: [60, -60], to: [60, -120] },
      { from: [60, -120], to: [120, -120] },
      { from: [120, -120], to: [120, -180] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 5 },
    trailColor: 'var(--color-trail-pink)',
    successMessage: 'Сходи намальовані!',
    successTitle: 'Молодець!',
    successButton: 'Наступний рівень →',
  },

  // Level 11: square using repeat. Ghost: 80×80 centered.
  // Solution: повторити 4 рази { вперед 80, праворуч 90 }
  // start (-40, 40): vertices (-40,40),(-40,-40),(40,-40),(40,40)
  {
    id: 'lesson-11',
    order: 11,
    mode: 'turtle',
    title: 'Рівень 11: Квадрат',
    instruction: 'Намалюй квадрат: повтори 4 рази «вперед 80, праворуч 90».',
    start: { x: -40, y: 40, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right', 'repeat'],
    goalSegments: [
      { from: [-40, 40], to: [-40, -40] },
      { from: [-40, -40], to: [40, -40] },
      { from: [40, -40], to: [40, 40] },
      { from: [40, 40], to: [-40, 40] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 4 },
    trailColor: 'var(--color-trail-green)',
    successMessage: 'Квадрат намальований!',
    successTitle: 'Геометрія — це просто!',
    successButton: 'Наступний рівень →',
  },

  // Level 12: equilateral triangle. Ghost: start (-40,40), side 100.
  // Vertices: (-40,40),(-40,-60),(47,-10). heading 0→120→240.
  // Solution: повторити 3 рази { вперед 100, праворуч 120 }
  {
    id: 'lesson-12',
    order: 12,
    mode: 'turtle',
    title: 'Рівень 12: Трикутник',
    instruction: 'Намалюй рівносторонній трикутник: повтори 3 рази «вперед 100, праворуч 120».',
    start: { x: -40, y: 40, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right', 'repeat'],
    goalSegments: [
      { from: [-40, 40], to: [-40, -60] },
      { from: [-40, -60], to: [47, -10] },
      { from: [47, -10], to: [-40, 40] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 3 },
    trailColor: 'var(--color-trail-orange)',
    successMessage: 'Трикутник намальований!',
    successTitle: 'Чудова геометрія!',
    successButton: 'Наступний рівень →',
  },

  // Level 13: 5-pointed star. Ghost: start (0,60), repeat 5: вперед 120, праворуч 144.
  // Vertices (approx): (0,60),(0,-60),(71,37),(-44,0),(71,-37),(0,60)
  // Solution: повторити 5 разів { вперед 120, праворуч 144 }
  {
    id: 'lesson-13',
    order: 13,
    mode: 'turtle',
    title: 'Рівень 13: Зірка',
    instruction: 'Намалюй зірку: повтори 5 разів «вперед 120, праворуч 144».',
    start: { x: 0, y: 60, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right', 'repeat'],
    goalSegments: [
      { from: [0, 60], to: [0, -60] },
      { from: [0, -60], to: [71, 37] },
      { from: [71, 37], to: [-44, 0] },
      { from: [-44, 0], to: [71, -37] },
      { from: [71, -37], to: [0, 60] },
    ],
    success: { mode: 'turtle-minimum', minSegments: 5 },
    trailColor: 'var(--color-trail-purple)',
    successMessage: 'Зірка намальована! Ти — художник!',
    successTitle: 'Зіркова робота!',
    successButton: 'Наступний рівень →',
  },

  // Level 14: free drawing — no ghost, all tools.
  {
    id: 'lesson-14',
    order: 14,
    mode: 'turtle',
    title: 'Рівень 14: Вільне малювання',
    instruction: 'Твоя черепаха, твої правила! Намалюй власний малюнок (щонайменше 8 відрізків).',
    start: { x: 0, y: 0, heading: 0 },
    toolbox: ['turtle_forward', 'turtle_right', 'turtle_left', 'turtle_pen_up', 'turtle_pen_down', 'repeat'],
    success: { mode: 'turtle-minimum', minSegments: 8 },
    trailColor: 'var(--color-trail-teal)',
    successMessage: 'Ти — справжній художник!',
    successTitle: 'Творча робота!',
    successButton: 'Почати знову',
  },
];
