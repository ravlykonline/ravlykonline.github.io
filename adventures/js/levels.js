(function () {
  const app = (window.SnailGame = window.SnailGame || {});

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

  app.levels = [
    createLevel({
      id: 1,
      name: '\u041f\u0440\u044f\u043c\u0430 \u0434\u043e\u0440\u0456\u0436\u043a\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 2, c: 2 }, apple: { r: 2, c: 5 }, obstacles: [],
      allowedTiles: ['right'], presetArrows: {},
      hint: '\u041f\u043e\u0441\u0442\u0430\u0432 \u0441\u0442\u0440\u0456\u043b\u043e\u0447\u043a\u0438 \u043f\u0440\u0430\u0432\u043e\u0440\u0443\u0447, \u0449\u043e\u0431 \u0440\u0430\u0432\u043b\u0438\u043a \u0434\u0456\u0439\u0448\u043e\u0432 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0440\u0443\u0445\u0430\u0442\u0438\u0441\u044f \u043f\u0440\u044f\u043c\u043e \u043f\u0440\u0430\u0432\u043e\u0440\u0443\u0447.'
    }),
    createLevel({
      id: 2,
      name: '\u0422\u0440\u0438 \u043a\u0440\u043e\u043a\u0438 \u0432\u0433\u043e\u0440\u0443',
      type: 'play', rows: 6, cols: 8,
      start: { r: 4, c: 3 }, apple: { r: 1, c: 3 }, obstacles: [],
      allowedTiles: ['up'], presetArrows: {},
      hint: '\u0422\u0435\u043f\u0435\u0440 \u0440\u0430\u0432\u043b\u0438\u043a \u0456\u0434\u0435 \u0442\u0456\u043b\u044c\u043a\u0438 \u0432\u0433\u043e\u0440\u0443.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0440\u0443\u0445\u0430\u0442\u0438\u0441\u044f \u0432\u0433\u043e\u0440\u0443.'
    }),
    createLevel({
      id: 3,
      name: '\u041b\u0456\u0432\u043e\u0440\u0443\u0447 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 2, c: 6 }, apple: { r: 2, c: 1 }, obstacles: [],
      allowedTiles: ['left'], presetArrows: {},
      hint: '\u0422\u0435\u043f\u0435\u0440 \u0440\u0430\u0432\u043b\u0438\u043a \u0439\u0434\u0435 \u043b\u0456\u0432\u043e\u0440\u0443\u0447. \u041f\u043e\u043a\u043b\u0430\u0434\u0438 \u043f\u0440\u044f\u043c\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0432\u043b\u0456\u0432\u043e.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0440\u0443\u0445\u0430\u0442\u0438\u0441\u044f \u043b\u0456\u0432\u043e\u0440\u0443\u0447.'
    }),
    createLevel({
      id: 4,
      name: '\u041a\u0440\u043e\u043a \u0432\u043d\u0438\u0437',
      type: 'play', rows: 6, cols: 8,
      start: { r: 0, c: 3 }, apple: { r: 5, c: 3 }, obstacles: [],
      allowedTiles: ['down'], presetArrows: {},
      hint: '\u0422\u0435\u043f\u0435\u0440 \u0440\u0430\u0432\u043b\u0438\u043a \u0456\u0434\u0435 \u0432\u043d\u0438\u0437. \u041f\u043e\u043a\u043b\u0430\u0434\u0438 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0434\u043e\u043d\u0438\u0437\u0443.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0440\u0443\u0445\u0430\u0442\u0438\u0441\u044f \u0432\u043d\u0438\u0437.'
    }),
    createLevel({
      id: 5,
      name: '\u0412\u0438\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044f \u0441\u0442\u0440\u0456\u043b\u043e\u043a',
      type: 'debug', rows: 6, cols: 8,
      start: { r: 3, c: 1 }, apple: { r: 3, c: 6 }, obstacles: [],
      allowedTiles: ['left', 'right'],
      presetArrows: { '3,2': 'right', '3,3': 'right', '3,4': 'left', '3,5': 'left' },
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u043f\u043e\u043c\u0438\u043b\u043a\u043e\u0432\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0439 \u0432\u0438\u043f\u0440\u0430\u0432 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u0435\u0440\u0435\u0432\u0456\u0440\u044f\u0442\u0438 \u0456 \u0432\u0438\u043f\u0440\u0430\u0432\u043b\u044f\u0442\u0438 \u043f\u043e\u0441\u043b\u0456\u0434\u043e\u0432\u043d\u0456\u0441\u0442\u044c \u0441\u0442\u0440\u0456\u043b\u043e\u043a.'
    }),
    createLevel({
      id: 6,
      name: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 3, c: 2 }, apple: { r: 2, c: 5 }, obstacles: [],
      allowedTiles: ['up', 'right', 'down', 'left', 'left-up'], presetArrows: {},
      hint: '\u0421\u043a\u043b\u0430\u0434\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430 \u0456 \u0441\u043f\u0440\u043e\u0431\u0443\u0439 \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u0430\u0442\u0438 \u043f\u043e\u0432\u043e\u0440\u043e\u0442.',
      goal: '\u041f\u043e\u0437\u043d\u0430\u0439\u043e\u043c\u0438\u0442\u0438\u0441\u044f \u0437 \u043f\u0435\u0440\u0448\u0438\u043c \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u043e\u043c \u043d\u0430 \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u0456.'
    }),
    createLevel({
      id: 7,
      name: '\u041f\u043e\u0432\u043e\u0440\u043e\u0442\u0438 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 1, c: 2 }, apple: { r: 4, c: 5 }, obstacles: [],
      allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-right'], presetArrows: {},
      hint: '\u0421\u043a\u043b\u0430\u0434\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430, \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u044e\u0447\u0438 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0456 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043e\u0454\u0434\u043d\u0443\u0432\u0430\u0442\u0438 \u043f\u0440\u044f\u043c\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0437 \u0434\u0432\u043e\u043c\u0430 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0430\u043c\u0438.'
    }),
    createLevel({
      id: 8,
      name: '\u041e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438',
      type: 'play', rows: 6, cols: 8,
      start: { r: 3, c: 1 }, apple: { r: 3, c: 6 },
      obstacles: [
        { r: 3, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ['up', 'right', 'down', 'left', 'down-right', 'left-down'], presetArrows: {},
      hint: '\u041e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438 \u0442\u0430 \u0441\u043a\u043b\u0430\u0434\u0438 \u0431\u0435\u0437\u043f\u0435\u0447\u043d\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u0448\u043b\u044f\u0445 \u043d\u0430\u0432\u043a\u043e\u043b\u043e \u043a\u0430\u043c\u0456\u043d\u043d\u044f \u0439 \u043a\u043e\u043b\u043e\u0434.'
    }),
    createLevel({
      id: 9,
      name: '\u041e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438 \u0437\u043d\u0438\u0437\u0443',
      type: 'play', rows: 6, cols: 8,
      start: { r: 2, c: 1 }, apple: { r: 2, c: 6 },
      obstacles: [
        { r: 2, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ['up', 'right', 'down', 'left', 'up-right', 'left-up'], presetArrows: {},
      hint: '\u041e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438 \u0437\u043d\u0438\u0437\u0443 \u0442\u0430 \u043f\u043e\u0431\u0443\u0434\u0443\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430 \u0456\u043d\u0448\u0438\u043c\u0438 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0430\u043c\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043e\u0431\u0438\u0440\u0430\u0442\u0438 \u043f\u0440\u0430\u0432\u0438\u043b\u044c\u043d\u0443 \u043f\u0430\u0440\u0443 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0456\u0432 \u0434\u043b\u044f \u043e\u0431\u0445\u043e\u0434\u0443.'
    }),
    createLevel({
      id: 10,
      name: '\u041e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438 \u0441\u0445\u043e\u0434\u0438\u043d\u043a\u0430\u043c\u0438',
      type: 'play', rows: 6, cols: 8,
      start: { r: 1, c: 0 }, apple: { r: 4, c: 6 },
      obstacles: [
        { r: 1, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ['up', 'right', 'down', 'left', 'left-down', 'up-right'], presetArrows: {},
      hint: '\u041f\u0440\u043e\u043a\u043b\u0430\u0434\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438, \u0432\u0438\u043a\u043e\u0440\u0438\u0441\u0442\u043e\u0432\u0443\u044e\u0447\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0456 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0431\u0443\u0434\u0443\u0432\u0430\u0442\u0438 \u0441\u043a\u043b\u0430\u0434\u043d\u0456\u0448\u0438\u0439 \u0448\u043b\u044f\u0445 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438.'
    }),
    createLevel({
      id: 11,
      name: '\u0412\u0438\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043d\u044f \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u0443',
      type: 'debug', rows: 6, cols: 8,
      start: { r: 1, c: 6 }, apple: { r: 4, c: 1 },
      startFacing: 'left',
      obstacles: [
        { r: 1, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 2, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' }
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
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u0445\u0438\u0431\u043d\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0439 \u0432\u0438\u043f\u0440\u0430\u0432 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0432\u0456\u0434\u043b\u0430\u0433\u043e\u0434\u0436\u0443\u0432\u0430\u0442\u0438 \u0441\u043a\u043b\u0430\u0434\u043d\u0456 \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u0438 \u0437 \u043f\u043e\u0432\u043e\u0440\u043e\u0442\u0430\u043c\u0438.'
    }),
    createLevel({
      id: 12,
      name: '\u041b\u0430\u0431\u0456\u0440\u0438\u043d\u0442 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438',
      type: 'play', rows: 6, cols: 8,
      start: { r: 3, c: 1 }, apple: { r: 3, c: 5 },
      obstacles: [
        { r: 0, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 2, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 2, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u041d\u0430 \u0446\u044c\u043e\u043c\u0443 \u0440\u0456\u0432\u043d\u0456 \u0432\u0456\u0434\u043a\u0440\u0438\u0442\u0456 \u0432\u0441\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438. \u0417\u043d\u0430\u0439\u0434\u0438 \u043d\u0430\u0439\u043a\u0440\u0430\u0449\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0441\u0430\u043c\u043e\u0441\u0442\u0456\u0439\u043d\u043e \u043e\u0431\u0438\u0440\u0430\u0442\u0438 \u043f\u043e\u0442\u0440\u0456\u0431\u043d\u0456 \u0441\u0442\u0440\u0456\u043b\u043a\u0438 \u0441\u0435\u0440\u0435\u0434 \u0443\u0441\u0456\u0445 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0438\u0445.'
    }),
    createLevel({
      id: 13,
      name: '\u0417\u0432\u0438\u0432\u0438\u0441\u0442\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442',
      type: 'play', rows: 6, cols: 8,
      start: { r: 4, c: 6 }, apple: { r: 1, c: 1 },
      startFacing: 'left',
      obstacles: [
        { r: 0, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 2, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0421\u043a\u043b\u0430\u0434\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430, \u043e\u043c\u0438\u043d\u0430\u044e\u0447\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438 \u043d\u0430 \u043f\u043e\u043b\u0456.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u0434\u043e\u0432\u0448\u0438\u0439 \u0448\u043b\u044f\u0445 \u0441\u0435\u0440\u0435\u0434 \u0440\u0456\u0437\u043d\u0438\u0445 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434.'
    }),
    createLevel({
      id: 14,
      name: '\u0417\u0438\u0433\u0437\u0430\u0433 \u043c\u0456\u0436 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0430\u043c\u0438',
      type: 'play', rows: 6, cols: 8,
      start: { r: 0, c: 7 }, apple: { r: 5, c: 0 },
      startFacing: 'left',
      obstacles: [
        { r: 0, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u041f\u0440\u043e\u043a\u043b\u0430\u0434\u0438 \u0437\u0432\u0438\u0432\u0438\u0441\u0442\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043c\u0456\u0436 \u043a\u043e\u043b\u043e\u0434\u0430\u043c\u0438 \u0442\u0430 \u043a\u0430\u043c\u0456\u043d\u043d\u044f\u043c.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u0434\u043e\u0432\u0433\u0438\u0439 \u0437\u0438\u0433\u0437\u0430\u0433 \u0441\u0435\u0440\u0435\u0434 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434.'
    }),
    createLevel({
      id: 15,
      name: '\u041e\u0431\u0445\u0456\u0434 \u0432\u0456\u0434 \u0432\u0435\u0440\u0445\u043d\u044c\u043e\u0433\u043e \u043a\u0443\u0442\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 0, c: 7 }, apple: { r: 0, c: 0 },
      startFacing: 'left',
      obstacles: [
        { r: 0, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 0, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u0448\u043b\u044f\u0445 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430 \u0447\u0435\u0440\u0435\u0437 \u0432\u0435\u0440\u0445\u043d\u0456\u0439 \u043a\u0440\u0430\u0439 \u0442\u0430 \u043e\u0431\u0456\u0439\u0434\u0438 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u0434\u043e\u0432\u0433\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u0432\u0456\u0434 \u043e\u0434\u043d\u043e\u0433\u043e \u043a\u0443\u0442\u0430 \u0434\u043e \u0456\u043d\u0448\u043e\u0433\u043e.'
    }),
    createLevel({
      id: 16,
      name: '\u0421\u043a\u043b\u0430\u0434\u043d\u0438\u0439 \u043e\u0431\u0445\u0456\u0434',
      type: 'play', rows: 6, cols: 8,
      start: { r: 0, c: 0 }, apple: { r: 4, c: 2 },
      obstacles: [
        { r: 0, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 0, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 7, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u0448\u043b\u044f\u0445 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430 \u043a\u0440\u0456\u0437\u044c \u0449\u0456\u043b\u044c\u043d\u0438\u0439 \u0432\u0456\u0437\u0435\u0440\u0443\u043d\u043e\u043a \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u0442\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043d\u0430 \u0449\u0456\u043b\u044c\u043d\u043e \u0437\u0430\u0431\u0443\u0434\u043e\u0432\u0430\u043d\u043e\u043c\u0443 \u043f\u043e\u043b\u0456.'
    }),
    createLevel({
      id: 17,
      name: '\u041c\u0435\u0440\u0435\u0436\u0438\u0432\u043e \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434',
      type: 'play', rows: 6, cols: 8,
      start: { r: 3, c: 0 }, apple: { r: 2, c: 6 },
      obstacles: [
        { r: 1, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 7, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 7, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 3, c: 7, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 7, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u043f\u0440\u043e\u0445\u0456\u0434 \u043a\u0440\u0456\u0437\u044c \u0449\u0456\u043b\u044c\u043d\u0443 \u043c\u0435\u0440\u0435\u0436\u0443 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0431\u0430\u0447\u0438\u0442\u0438 \u0432\u0456\u043b\u044c\u043d\u0456 \u043a\u043b\u0456\u0442\u0438\u043d\u043a\u0438 \u0432 \u0433\u0443\u0441\u0442\u043e\u043c\u0443 \u0432\u0456\u0437\u0435\u0440\u0443\u043d\u043a\u0443.'
    }),
    createLevel({
      id: 18,
      name: '\u0412\u0435\u043b\u0438\u043a\u0438\u0439 \u043b\u0430\u0431\u0456\u0440\u0438\u043d\u0442',
      type: 'play', rows: 6, cols: 8,
      start: { r: 5, c: 0 }, apple: { r: 0, c: 7 },
      obstacles: [
        { r: 0, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 0, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 7, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 3, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 7, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0417\u043d\u0430\u0439\u0434\u0438 \u0434\u043e\u0432\u0433\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043a\u0440\u0456\u0437\u044c \u0432\u0435\u043b\u0438\u043a\u0438\u0439 \u043b\u0430\u0431\u0456\u0440\u0438\u043d\u0442.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0442\u0440\u0438\u043c\u0430\u0442\u0438 \u0432 \u0433\u043e\u043b\u043e\u0432\u0456 \u0434\u043e\u0432\u0433\u0438\u0439 \u0448\u043b\u044f\u0445 \u0447\u0435\u0440\u0435\u0437 \u0431\u0430\u0433\u0430\u0442\u043e \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434.'
    }),
    createLevel({
      id: 19,
      name: '\u0413\u0443\u0441\u0442\u0438\u0439 \u043c\u0430\u0440\u0448\u0440\u0443\u0442',
      type: 'play', rows: 6, cols: 8,
      start: { r: 5, c: 0 }, apple: { r: 3, c: 5 },
      obstacles: [
        { r: 1, c: 2, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 1, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 5, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 0, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 2, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 5, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u041f\u0440\u043e\u043a\u043b\u0430\u0434\u0438 \u043c\u0430\u0440\u0448\u0440\u0443\u0442 \u043a\u0440\u0456\u0437\u044c \u0433\u0443\u0441\u0442\u043e \u0440\u043e\u0437\u043a\u0438\u0434\u0430\u043d\u0456 \u043f\u0435\u0440\u0435\u0448\u043a\u043e\u0434\u0438.',
      goal: '\u041d\u0430\u0432\u0447\u0438\u0442\u0438\u0441\u044f \u0431\u0430\u0447\u0438\u0442\u0438 \u043a\u043e\u0440\u0438\u0434\u043e\u0440\u0438 \u0432 \u0449\u0456\u043b\u044c\u043d\u043e \u0437\u0430\u0431\u0443\u0434\u043e\u0432\u0430\u043d\u043e\u043c\u0443 \u043f\u043e\u043b\u0456.'
    }),
    createLevel({
      id: 20,
      name: '\u0412\u0435\u043b\u0438\u043a\u0430 \u043f\u043e\u0434\u043e\u0440\u043e\u0436 \u0440\u0430\u0432\u043b\u0438\u043a\u0430',
      type: 'play', rows: 6, cols: 8,
      start: { r: 0, c: 0 }, apple: { r: 5, c: 7 },
      obstacles: [
        { r: 0, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 0, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 1, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 2, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 4, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 2, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 3, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 3, c: 6, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 4, c: 1, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 4, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 5, c: 1, kind: 'rock', label: '\u041a\u0430\u043c\u0456\u043d\u043d\u044f' },
        { r: 5, c: 4, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' },
        { r: 5, c: 6, kind: 'log', label: '\u041a\u043e\u043b\u043e\u0434\u0430' }
      ],
      allowedTiles: ALL_TILES, presetArrows: {},
      hint: '\u0424\u0456\u043d\u0430\u043b\u044c\u043d\u0438\u0439 \u0440\u0456\u0432\u0435\u043d\u044c: \u043f\u043e\u0434\u0438\u0432\u0438\u0441\u044c \u043d\u0430 \u0432\u0441\u0435 \u043f\u043e\u043b\u0435, \u0441\u043f\u043b\u0430\u043d\u0443\u0439 \u0448\u043b\u044f\u0445 \u0456 \u043f\u0440\u0438\u0432\u0435\u0434\u0438 \u0440\u0430\u0432\u043b\u0438\u043a\u0430 \u0434\u043e \u044f\u0431\u043b\u0443\u043a\u0430.',
      goal: '\u0417\u0430\u0441\u0442\u043e\u0441\u0443\u0432\u0430\u0442\u0438 \u0432\u0441\u0456 \u043d\u0430\u0432\u0438\u0447\u043a\u0438 \u043f\u043b\u0430\u043d\u0443\u0432\u0430\u043d\u043d\u044f \u043c\u0430\u0440\u0448\u0440\u0443\u0442\u0443 \u043d\u0430 \u043e\u0434\u043d\u043e\u043c\u0443 \u0432\u0435\u043b\u0438\u043a\u043e\u043c\u0443 \u043f\u043e\u043b\u0456.'
    })
  ];
  app.getLevelById = function getLevelById(levelId) {
    return app.levels.find((level) => level.id === levelId) || null;
  };
})();













