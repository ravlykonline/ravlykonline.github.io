import { TaskPicker } from '../js/game/task-picker.js';
import { EventBus } from '../js/core/event-bus.js';
import { circleIntersectsRect, hasWorldCollision } from '../js/game/collision-system.js';
import { LevelData } from '../js/game/level-data.js';
import { createInitialSessionState } from '../js/game/session-state.js';
import { getDistanceFromRectCenter, rectsOverlap, canPlaceRect } from '../js/game/spawn-rules.js';
import { positionNpcs } from '../js/game/npc-spawner.js';
import { generateWorld } from '../js/game/world-generator.js';
import { approach, normalizeAngleDifference, updateAngle } from '../js/core/motion.js';
import { isNpcWithinRange, shouldCollectItem, pickNearestByDistance } from '../js/game/rules.js';
import { TaskRegistry } from '../js/tasks/task-registry.js';
import { TaskCatalog } from '../js/tasks/task-catalog.js';
import { evaluateSingleChoice } from '../js/tasks/task-evaluators/single-choice.js';
import { validateTask } from '../js/tasks/task-validator.js';
import { ScoreSystem } from '../js/systems/score-system.js';
import { HUDController } from '../js/ui/hud-controller.js';
import { ThemeModeController } from '../js/ui/theme-mode.js';
import { t } from '../js/i18n/index.js';
import { Input } from '../js/core/input.js';
import { CONFIG, createLevelConfig } from '../js/core/config.js';

const results = document.getElementById('results');
const summary = document.getElementById('summary');
const testResults = [];

function createSeededRandom(seed) {
    let value = seed;

    return () => {
        value = (value * 1664525 + 1013904223) >>> 0;
        return value / 4294967296;
    };
}

function countOccupiedQuadrants(items, config) {
    const quadrants = new Set();

    items.forEach((item) => {
        const centerX = item.x + item.w / 2;
        const centerY = item.y + item.h / 2;
        const column = centerX < config.worldWidth / 2 ? 0 : 1;
        const row = centerY < config.worldHeight / 2 ? 0 : 1;
        quadrants.add(`${column}:${row}`);
    });

    return quadrants.size;
}

const TEST_WORLD_CONFIG = {
    worldWidth: 1000,
    worldHeight: 1000,
    obstacleCount: 2,
    appleCount: 2,
    pearCount: 2
};

const TEST_NPCS = [
    {
        id: 'mouse_test',
        nameKey: 'npc.mouseName',
        taskPoolId: 'observation.beginner',
        type: 'mouse',
        x: 10,
        y: 20,
        w: 48,
        h: 48,
        completed: false
    },
    {
        id: 'beetle_test',
        nameKey: 'npc.beetleName',
        taskPoolId: 'logic.beginner',
        type: 'beetle',
        x: 70,
        y: 20,
        w: 48,
        h: 48,
        completed: false
    }
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function test(name, run) {
    try {
        run();
        testResults.push({ name, ok: true });
    } catch (error) {
        testResults.push({ name, ok: false, error: error.message });
    }
}

test('TaskPicker вибирає перше завдання при random=0', () => {
    const selected = TaskPicker.pickRandomTask('observation.beginner', () => 0);
    assert(selected.type === 'odd-one-out', 'Очікувався перший тип задачі з observation.beginner.');
});

test('TaskPicker вибирає останнє завдання при random близькому до 1', () => {
    const selected = TaskPicker.pickRandomTask('logic.beginner', () => 0.99);
    assert(selected.type === 'logic-pairs', 'Очікувався останній тип задачі з logic.beginner.');
});

test('SessionState створює чисту сесію без збереженого прогресу', () => {
    const session = createInitialSessionState({
        playerStart: { x: 100, y: 120 },
        npcs: [
            {
                id: 'mouse_test',
                nameKey: 'npc.mouseName',
                taskPoolId: 'observation.beginner',
                type: 'mouse',
                x: 10,
                y: 20,
                w: 48,
                h: 48,
                completed: false
            }
        ]
    }, { random: () => 0 });

    assert(session.player.x === 100 && session.player.y === 120, 'SessionState має брати стартову позицію гравця.');
    assert(session.collectibles.length === 0, 'Нова сесія стартує без згенерованих предметів до world generation.');
    assert(session.obstacles.length === 0, 'Нова сесія стартує без згенерованих перешкод до world generation.');
    assert(session.npcs.length === 1, 'SessionState має створювати NPC сесії.');
    assert(session.npcs[0].completed === false, 'NPC у новій сесії не має бути виконаним.');
    assert(Boolean(session.npcs[0].activeTask), 'NPC має отримати випадкове завдання на сесію.');
    assert(session.flags.completedNpcIds.size === 0, 'Нова сесія не має збережених completed NPC.');
});

test('WorldGenerator створює перешкоди й яблука без накладання на перешкоди', () => {
    const values = [
        0.1, 0.1, 0.1, 0.1, 0.1,
        0.1, 0.1, 0.1, 0.9, 0.9,
        0.5, 0.1,
        0.1, 0.5
    ];
    let index = 0;
    const random = () => {
        const value = values[index % values.length];
        index += 1;
        return value;
    };
    const player = { x: 500, y: 500 };
    const world = generateWorld({
        config: TEST_WORLD_CONFIG,
        player,
        random
    });

    assert(world.obstacles.length === TEST_WORLD_CONFIG.obstacleCount, 'Має створювати потрібну кількість перешкод.');
    assert(
        world.collectibles.filter((item) => item.kind === 'apple').length === TEST_WORLD_CONFIG.appleCount,
        'Має створювати потрібну кількість яблук.'
    );
    assert(
        world.collectibles.filter((item) => item.kind === 'pear').length === TEST_WORLD_CONFIG.pearCount,
        'Має створювати потрібну кількість груш.'
    );
    assert(
        new Set(world.collectibles.map((item) => item.id)).size === world.collectibles.length,
        'Кожен предмет має унікальний id — інакше DOM-елементи конфліктують.'
    );
    assert(
        world.obstacles.every((obstacle) => getDistanceFromRectCenter(obstacle, player) >= 220),
        'Перешкоди не мають з’являтися біля старту Равлика.'
    );
    assert(
        world.collectibles.every((item) => !world.obstacles.some((obstacle) => rectsOverlap(item, obstacle))),
        'Предмети не мають з’являтися всередині перешкод.'
    );
});

test('NpcSpawner розставляє NPC поза перешкодами і стартовою зоною', () => {
    const values = [0.1, 0.1, 0.85, 0.85, 0.18, 0.82, 0.82, 0.18];
    let index = 0;
    const random = () => {
        const value = values[index % values.length];
        index += 1;
        return value;
    };
    const player = { x: 500, y: 500 };
    const blockers = [{ x: 130, y: 130, w: 90, h: 90 }];
    const npcs = positionNpcs({
        npcs: TEST_NPCS,
        config: TEST_WORLD_CONFIG,
        player,
        blockers,
        random
    });

    assert(npcs.length === TEST_NPCS.length, 'Spawner має повернути всіх NPC.');
    assert(npcs.every((npc) => !blockers.some((blocker) => rectsOverlap(npc, blocker))), 'NPC не мають стояти в перешкодах.');
    assert(npcs.every((npc) => getDistanceFromRectCenter(npc, player) >= 280), 'NPC не мають стояти біля старту Равлика.');
    assert(rectsOverlap(npcs[0], npcs[1]) === false, 'NPC не мають накладатися один на одного.');
});

test('WorldGenerator не ставить яблука поверх NPC', () => {
    const values = [
        0.1, 0.1, 0.1, 0.1, 0.1,
        0.1, 0.1, 0.1, 0.9, 0.9,
        0.85, 0.85,
        0.18, 0.82,
        0.85, 0.85,
        0.5, 0.1,
        0.1, 0.5
    ];
    let index = 0;
    const random = () => {
        const value = values[index % values.length];
        index += 1;
        return value;
    };
    const world = generateWorld({
        config: TEST_WORLD_CONFIG,
        player: { x: 500, y: 500 },
        npcs: TEST_NPCS.slice(0, 1),
        random
    });

    assert(world.npcs.length === 1, 'WorldGenerator має повернути позиціонованих NPC.');
    assert(
        world.collectibles.every((item) => !world.npcs.some((npc) => rectsOverlap(item, npc))),
        'Яблука не мають з’являтися поверх NPC.'
    );
});

test('SpawnRules перевіряє відстань і накладання прямокутників', () => {
    const blockers = [{ x: 10, y: 10, w: 40, h: 40 }];
    const overlapping = { x: 35, y: 35, w: 20, h: 20 };
    const clear = { x: 120, y: 120, w: 20, h: 20 };
    const start = { x: 130, y: 130 };

    assert(rectsOverlap(overlapping, blockers[0]) === true, 'Перетин прямокутників має визначатися.');
    assert(rectsOverlap(clear, blockers[0]) === false, 'Окремі прямокутники не мають вважатися перетином.');
    assert(canPlaceRect(overlapping, { blockers }) === false, 'Не можна ставити об’єкт поверх blocker.');
    assert(canPlaceRect(clear, { blockers }) === true, 'Можна ставити об’єкт без перетину.');
    assert(
        canPlaceRect(clear, { blockers, avoidPoint: start, minDistanceFromPoint: 50 }) === false,
        'Об’єкт не можна ставити надто близько до забороненої точки.'
    );
});

test('CollisionSystem блокує рух у прямокутники, зокрема NPC', () => {
    const npc = { x: 100, y: 100, w: 48, h: 48 };

    assert(circleIntersectsRect({ x: 104, y: 124, radius: 20 }, npc) === true, 'Коло гравця не має заходити в NPC.');
    assert(circleIntersectsRect({ x: 40, y: 40, radius: 20 }, npc) === false, 'Далекий NPC не має блокувати рух.');
    assert(hasWorldCollision({
        x: 104,
        y: 124,
        radius: 20,
        worldWidth: 400,
        worldHeight: 400,
        rects: [npc]
    }) === true, 'World collision має враховувати NPC як blocker.');
});

test('approach рухається до цілі без перескоку', () => {
    assert(approach(0, 1, 0.2) === 0.2, 'Потрібен крок до цілі.');
    assert(approach(0.95, 1, 0.2) === 1, 'Значення не повинно перескакувати ціль.');
});

test('normalizeAngleDifference вибирає короткий шлях повороту', () => {
    assert(normalizeAngleDifference(270) === -90, '270 градусів мають скорочуватись до -90.');
    assert(normalizeAngleDifference(-270) === 90, '-270 градусів мають скорочуватись до 90.');
});

test('updateAngle плавно наближає кут до цільового', () => {
    const next = updateAngle(0, 90, 0.2, 0.8);
    assert(next > 0 && next < 90, 'Кут має змінюватись плавно, а не стрибком.');
});

test('isNpcWithinRange повертає true тільки в межах радіуса', () => {
    assert(isNpcWithinRange(100, 120) === true, 'NPC в радіусі має бути доступний.');
    assert(isNpcWithinRange(121, 120) === false, 'NPC поза радіусом не має бути доступний.');
});

test('shouldCollectItem враховує радіус гравця', () => {
    assert(shouldCollectItem(20, 20) === true, 'Близький предмет має збиратись.');
    assert(shouldCollectItem(40, 20) === false, 'Далекий предмет не має збиратись.');
});

test('pickNearestByDistance повертає найближчий елемент', () => {
    const items = [{ id: 'far', d: 10 }, { id: 'near', d: 2 }, { id: 'mid', d: 5 }];
    const nearest = pickNearestByDistance(items, (item) => item.d);
    assert(nearest.id === 'near', 'Потрібно повернути найближчий елемент.');
});

test('ThemeModeController оновлює data-theme та meta theme-color', () => {
    const button = document.createElement('button');
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    ThemeModeController.dom = { themeToggleBtn: button };
    ThemeModeController.mode = 'dark';
    ThemeModeController.applyMode();

    assert(document.body.dataset.theme === 'dark', 'Має встановлюватися dark тема.');
    assert(button.getAttribute('aria-pressed') === 'true', 'Для dark теми кнопка має містити aria-pressed=true.');
    assert(meta.getAttribute('content') === '#1f3a14', 'Має виставлятися dark theme-color.');

    ThemeModeController.mode = 'light';
    ThemeModeController.applyMode();

    assert(document.body.dataset.theme === 'light', 'Має встановлюватися light тема.');
    assert(button.getAttribute('aria-pressed') === 'false', 'Для light теми кнопка має містити aria-pressed=false.');
    assert(meta.getAttribute('content') === '#7cb342', 'Має виставлятися light theme-color.');

    meta.remove();
});

test('HUDController оновлює сесію, ціль і контекст окремо', () => {
    const dom = {
        hudSession: document.createElement('p'),
        hudObjective: document.createElement('p'),
        hudContext: document.createElement('p'),
        hudNpcBadge: document.createElement('span'),
        hudPanel: document.createElement('section'),
        hudToggleBtn: document.createElement('button')
    };

    HUDController.init({ dom });
    dom.hudToggleBtn.click();
    HUDController.setSessionSummary({ apples: 3, stars: 2 });
    HUDController.setObjective('Нова ціль для перевірки');
    HUDController.setContext('Поруч з’явився друг із завданням');
    HUDController.setNearbyNpc('Мишка');

    assert(dom.hudPanel.classList.contains('hud-panel--expanded'), 'HUD шторка має відкриватися кліком.');
    assert(dom.hudToggleBtn.getAttribute('aria-expanded') === 'true', 'HUD toggle має оновлювати aria-expanded.');
    assert(dom.hudSession.textContent.includes('3'), 'HUD має показувати яблука в сесійному статусі.');
    assert(dom.hudSession.textContent.includes('2'), 'HUD має показувати зірочки в сесійному статусі.');
    assert(dom.hudObjective.textContent === 'Нова ціль для перевірки', 'HUD має оновлювати ціль окремо.');
    assert(dom.hudContext.textContent === 'Поруч з’явився друг із завданням', 'HUD має оновлювати контекст окремо.');
    assert(dom.hudNpcBadge.textContent.includes('Мишка'), 'HUD має показувати бейдж сусіднього NPC.');
    assert(dom.hudNpcBadge.classList.contains('hidden') === false, 'Бейдж NPC має ставати видимим.');

    HUDController.setNearbyNpc(null);
    assert(dom.hudNpcBadge.classList.contains('hidden') === true, 'Бейдж NPC має ховатися, коли поруч нікого немає.');
});

test('Input recognizes only explicit interactive game UI targets', () => {
    const interactive = document.createElement('button');
    const child = document.createElement('span');
    const passive = document.createElement('div');

    interactive.dataset.gameInteractive = '';
    interactive.appendChild(child);

    assert(Input.isInteractiveTarget(interactive) === true, 'Interactive element should be skipped by movement input.');
    assert(Input.isInteractiveTarget(child) === true, 'Child of interactive element should be skipped by movement input.');
    assert(Input.isInteractiveTarget(passive) === false, 'Plain game element should remain available for movement input.');
});

test('TaskRegistry створює задачу на продовження послідовності', () => {
    const entry = TaskCatalog.getTasks('patterns.beginner').find((candidate) => candidate.type === 'sequence-next');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'sequence-next', 'Має створюватися задача sequence-next.');
    assert(task.choices.length >= 3, 'У sequence-next мають бути варіанти відповіді.');
});

test('TaskRegistry створює задачу на впорядкування чисел', () => {
    const entry = TaskCatalog.getTasks('counting.beginner').find((candidate) => candidate.type === 'order-numbers');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'order-numbers', 'Має створюватися задача order-numbers.');
    assert(task.correctOrder.length === task.numbers.length, 'Порядок відповіді має відповідати кількості чисел.');
});

test('TaskRegistry створює задачу на порівняння множин', () => {
    const entry = TaskCatalog.getTasks('visual-logic.beginner').find((candidate) => candidate.type === 'compare-sets');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'compare-sets', 'Має створюватися задача compare-sets.');
    assert(task.leftCount !== task.rightCount, 'У compare-sets групи мають відрізнятися.');
});

test('TaskRegistry створює задачу на лічбу', () => {
    const entry = TaskCatalog.getTasks('counting.beginner').find((candidate) => candidate.type === 'count-and-match');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'count-and-match', 'Має створюватися задача count-and-match.');
    assert(task.correctChoiceId === `${task.count}`, 'Правильна відповідь має збігатися з кількістю предметів.');
});

test('TaskRegistry створює задачу на просте додавання', () => {
    const entry = TaskCatalog.getTasks('arithmetic.beginner').find((candidate) => candidate.type === 'simple-addition');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'simple-addition', 'Має створюватися задача simple-addition.');
    assert(task.equation.includes('+'), 'У simple-addition має бути приклад на додавання.');
});

test('TaskRegistry створює задачу на візерунок з фігур', () => {
    const entry = TaskCatalog.getTasks('patterns.beginner').find((candidate) => candidate.type === 'shape-pattern');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'shape-pattern', 'Має створюватися задача shape-pattern.');
    assert(task.series.length >= 4, 'У shape-pattern має бути ряд фігур.');
});

test('TaskRegistry створює задачу на віднімання', () => {
    const entry = TaskCatalog.getTasks('arithmetic.beginner').find((candidate) => candidate.type === 'simple-subtraction');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'simple-subtraction', 'Має створюватися задача simple-subtraction.');
    assert(task.equation.includes('-'), 'У simple-subtraction має бути приклад на віднімання.');
});

test('TaskRegistry створює логічну пару', () => {
    const entry = TaskCatalog.getTasks('visual-logic.beginner').find((candidate) => candidate.type === 'logic-pairs');
    const task = TaskRegistry.createTaskFromEntry(entry);
    assert(task.type === 'logic-pairs', 'Має створюватися задача logic-pairs.');
    assert(typeof task.promptItem === 'string' && task.promptItem.length > 0, 'У logic-pairs має бути promptItem — один символ-підказка.');
    assert(Array.isArray(task.choices) && task.choices.length === 4, 'У logic-pairs має бути рівно 4 варіанти відповіді.');
    assert(task.choices.every((c) => c.id && c.label), 'Кожен варіант logic-pairs має мати id і label.');
    assert(task.choices.some((c) => c.id === task.correctChoiceId), 'Правильна відповідь має бути серед варіантів.');
});

test('TaskRegistry створює магічний квадрат з фігурами', () => {
    const entry = TaskCatalog.getTasks('patterns.beginner')
        .find((task) => task.type === 'magic-square');
    const task = TaskRegistry.createTaskFromEntry(entry);

    assert(task.type === 'magic-square', 'Має створюватися задача magic-square.');
    assert(task.grid.length === 9, 'Магічний квадрат має мати 9 клітинок.');
    assert(task.grid.includes(null), 'Магічний квадрат має містити одну порожню клітинку.');
    assert(task.choices.length >= 3, 'Магічний квадрат має мати варіанти відповіді.');
});

test('TaskValidator пропускає валідну задачу з варіантами', () => {
    const task = {
        id: 'test-task',
        type: 'sequence-next',
        prompt: 'Обери фігуру',
        instructions: 'Подивись і натисни відповідь.',
        reward: { stars: 1 },
        choices: [
            { id: 'a', label: '△' },
            { id: 'b', label: '○' }
        ],
        correctChoiceId: 'a'
    };

    assert(validateTask(task, { knownTypes: ['sequence-next'] }) === task, 'Валідатор має повернути задачу без змін.');
});

test('TaskValidator відхиляє варіанти без правильної відповіді', () => {
    const task = {
        id: 'broken-task',
        type: 'sequence-next',
        prompt: 'Обери фігуру',
        instructions: 'Подивись і натисни відповідь.',
        reward: { stars: 1 },
        choices: [
            { id: 'a', label: '△' },
            { id: 'b', label: '○' }
        ],
        correctChoiceId: 'c'
    };

    let didThrow = false;

    try {
        validateTask(task, { knownTypes: ['sequence-next'] });
    } catch (error) {
        didThrow = error.message.includes('правильна відповідь');
    }

    assert(didThrow, 'Валідатор має відхилити задачу, якщо correctChoiceId не існує серед choices.');
});

test('SingleChoiceEvaluator порівнює вибір із правильною відповіддю', () => {
    const task = { correctChoiceId: 3 };

    assert(evaluateSingleChoice(task, '3') === true, 'Evaluator має підтримувати числові й текстові id.');
    assert(evaluateSingleChoice(task, '2') === false, 'Evaluator має повертати false для хибного вибору.');
});

test('EventBus дозволяє відписатися і очистити listeners', () => {
    EventBus.reset();
    let calls = 0;
    const unsubscribe = EventBus.on('test:event', () => {
        calls += 1;
    });

    EventBus.emit('test:event');
    unsubscribe();
    EventBus.emit('test:event');

    assert(calls === 1, 'Після unsubscribe listener не має викликатися.');

    EventBus.on('test:event', () => {
        calls += 1;
    });
    EventBus.reset();
    EventBus.emit('test:event');

    assert(calls === 1, 'Після reset listeners не мають викликатися.');
});

test('ScoreSystem не дублює підписки після повторного init', () => {
    EventBus.reset();
    const dom = {
        scoreDisplay: document.createElement('div'),
        applesCount: document.createElement('span'),
        starsCount: document.createElement('span'),
        hudSession: document.createElement('p'),
        hudObjective: document.createElement('p'),
        hudContext: document.createElement('p'),
        hudNpcBadge: document.createElement('span')
    };

    HUDController.init({ dom });
    ScoreSystem.init({ eventBus: EventBus, dom });
    ScoreSystem.init({ eventBus: EventBus, dom });
    EventBus.emit('item:collected', { type: 'apple', value: 1 });
    EventBus.emit('puzzle:completed', { stars: 1 });

    assert(ScoreSystem.apples === 1, 'Яблуко має зарахуватися один раз після повторного init.');
    assert(ScoreSystem.stars === 1, 'Зірка має зарахуватися один раз після повторного init.');

    EventBus.reset();
    ScoreSystem.resetSubscriptions();
});

test('LevelData contains target NPC count with valid tasks and text keys', () => {
    const npcs = LevelData.level1.npcs;
    const ids = new Set(npcs.map((npc) => npc.id));

    assert(npcs.length >= 26 && npcs.length <= 30, 'Level should contain 26-30 NPCs.');
    assert(ids.size === npcs.length, 'NPC ids should be unique.');

    npcs.forEach((npc) => {
        const iconKey = `entities.${npc.type}Icon`;
        const poolIds = npc.taskPoolIds ?? [npc.taskPoolId];

        assert(poolIds.length >= 1, 'NPC should have at least one task pool.');
        assert(Boolean(npc.distributionGroup), 'NPC should have a distribution group for map interleaving.');
        poolIds.forEach((poolId) => {
            assert(TaskCatalog.getCategory(poolId), `Task pool "${poolId}" should exist.`);
        });
        assert(t(npc.nameKey) !== npc.nameKey, `Name key "${npc.nameKey}" should be translated.`);
        assert(t(iconKey) !== iconKey, `NPC type "${npc.type}" should have an icon.`);
    });
});

test('LevelData keeps distribution groups distinct from task pool ids', () => {
    const npcs = LevelData.level1.npcs;
    const visualFirstPoolGroups = new Set(
        npcs
            .filter((npc) => npc.taskPoolId === 'visual-logic.beginner')
            .map((npc) => npc.distributionGroup)
    );

    assert(visualFirstPoolGroups.has('observe'), 'Observe NPCs should remain a separate distribution group.');
    assert(visualFirstPoolGroups.has('logic'), 'Logic NPCs should remain a separate distribution group.');
    assert(visualFirstPoolGroups.has('gentle'), 'Gentle NPCs should remain a separate distribution group.');
    assert(visualFirstPoolGroups.size >= 3, 'NPC distribution should not collapse to the first taskPoolId.');
});

test('SessionState assigns unique task ids while catalog has enough tasks', () => {
    const session = createInitialSessionState(LevelData.level1, { random: createSeededRandom(7) });
    const taskIds = session.npcs.map((npc) => npc.activeTask.id);
    const uniqueTaskIds = new Set(taskIds);

    assert(uniqueTaskIds.size === taskIds.length, 'NPCs should not receive duplicate tasks in one session.');
    assert(session.usedTaskIds.size === taskIds.length, 'Session should remember every assigned task id.');
});

test('TaskCatalog exposes JSON categories with stable task ids', () => {
    const categoryIds = TaskCatalog.categories.map((category) => category.id);
    const patternTasks = TaskCatalog.getTasks('patterns.beginner');
    const countingTasks = TaskCatalog.getTasks('counting.beginner');
    const visualLogicTasks = TaskCatalog.getTasks('visual-logic.beginner');

    assert(categoryIds.includes('patterns.beginner'), 'Catalog should include pattern category.');
    assert(categoryIds.includes('counting.beginner'), 'Catalog should include counting category.');
    assert(categoryIds.includes('arithmetic.beginner'), 'Catalog should include arithmetic category.');
    assert(patternTasks.length >= 6, 'Pattern category should contain a useful starter task bank.');
    assert(patternTasks.some((task) => task.type === 'magic-square'), 'Pattern category should include magic square tasks.');
    assert(countingTasks.length >= 15, 'Counting category should contain a useful starter task bank.');
    assert(countingTasks.some((task) => task.type === 'compare-sets'), 'Counting category should include more/less comparison tasks.');
    assert(visualLogicTasks.every((task) => task.poolId === 'visual-logic.beginner'), 'Catalog should attach source pool id.');
});

test('WorldGenerator spreads obstacles, apples and NPCs across the meadow', () => {
    const config = {
        worldWidth: 1600,
        worldHeight: 1600,
        obstacleCount: 16,
        appleCount: 12
    };
    const npcs = Array.from({ length: 8 }, (_, index) => ({
        ...TEST_NPCS[index % TEST_NPCS.length],
        id: `npc_spread_${index}`
    }));
    const world = generateWorld({
        config,
        player: { x: 800, y: 800 },
        npcs,
        random: createSeededRandom(42)
    });

    assert(countOccupiedQuadrants(world.obstacles, config) >= 3, 'Obstacles should not cluster in one small area.');
    assert(countOccupiedQuadrants(world.collectibles, config) >= 3, 'Collectibles should be spread across the meadow.');
    assert(countOccupiedQuadrants(world.npcs, config) >= 3, 'NPCs should be spread across the meadow.');
});

function renderResults() {
    const failed = testResults.filter((result) => !result.ok);
    summary.textContent = failed.length === 0
        ? `Усі ${testResults.length} тестів пройшли`
        : `${failed.length} з ${testResults.length} тестів не пройшли`;
    summary.className = `summary ${failed.length === 0 ? 'pass' : 'fail'}`;

    testResults.forEach((result) => {
        const item = document.createElement('li');
        item.className = result.ok ? 'pass' : 'fail';
        item.textContent = result.ok ? `PASS: ${result.name}` : `FAIL: ${result.name} — ${result.error}`;
        results.appendChild(item);
    });
}

// ── Нові тести: структура odd-one-out і дублікати task.id ───────

test('OddOneOut: кожен варіант має 4 різних label і correctChoiceId серед items (JSON)', () => {
    const tasks = TaskCatalog.getTasks('visual-logic.beginner').filter((t) => t.type === 'odd-one-out');
    assert(tasks.length >= 6, 'visual-logic.beginner має містити щонайменше 6 odd-one-out задач.');

    tasks.forEach((entry) => {
        const items = entry.variant?.items ?? [];
        assert(items.length === 4, `${entry.id}: odd-one-out має мати рівно 4 items.`);
        const labels = items.map((i) => i.label);
        const uniqueLabels = new Set(labels);
        assert(uniqueLabels.size === labels.length, `${entry.id}: всі 4 label мають бути різними.`);
        assert(items.some((i) => i.id === entry.variant.correctChoiceId),
            `${entry.id}: correctChoiceId має бути серед items.`);
    });
});

test('OddOneOut: кожен fallback-варіант має 4 різних label і correctChoiceId серед items (JS)', async () => {
    const { oddOneOutVariants } = await import('../js/tasks/task-data/odd-one-out-variants.js');
    assert(oddOneOutVariants.length >= 10, 'JS fallback має містити щонайменше 10 odd-one-out варіантів.');

    oddOneOutVariants.forEach((variant) => {
        const labels = variant.items.map((i) => i.label);
        const uniqueLabels = new Set(labels);
        assert(variant.items.length === 4, `${variant.id}: odd-one-out має мати рівно 4 items.`);
        assert(uniqueLabels.size === labels.length, `${variant.id}: всі 4 label мають бути різними.`);
        assert(variant.items.some((i) => i.id === variant.correctChoiceId),
            `${variant.id}: correctChoiceId має бути серед items.`);
    });
});

test('Logic-pairs у logic.beginner.json мають новий формат (promptItem + 4 choices)', () => {
    const tasks = TaskCatalog.getTasks('logic.beginner').filter((t) => t.type === 'logic-pairs');
    assert(tasks.length >= 6, 'logic.beginner має містити щонайменше 6 logic-pairs задач.');

    tasks.forEach((entry) => {
        const v = entry.variant;
        assert(typeof v.promptItem === 'string' && v.promptItem.length > 0,
            `${entry.id}: logic-pairs має мати promptItem.`);
        assert(Array.isArray(v.choices) && v.choices.length === 4,
            `${entry.id}: logic-pairs має мати рівно 4 choices.`);
        assert(v.choices.every((c) => c.id && c.label),
            `${entry.id}: кожен choice має мати id і label.`);
        assert(v.choices.some((c) => c.id === v.correctChoiceId),
            `${entry.id}: correctChoiceId має бути серед choices.`);
    });
});

test('MagicSquare: JS fallback має валідну структуру (grid 9 клітинок, одна null, choices, correctChoiceId)', async () => {
    const { magicSquareVariants } = await import('../js/tasks/task-data/magic-square-variants.js');
    assert(magicSquareVariants.length >= 5, 'JS fallback має містити щонайменше 5 magic-square варіантів.');

    magicSquareVariants.forEach((variant) => {
        assert(Array.isArray(variant.grid) && variant.grid.length === 9,
            `${variant.id}: grid має містити рівно 9 клітинок.`);
        const nullCount = variant.grid.filter((c) => c === null).length;
        assert(nullCount === 1, `${variant.id}: grid має містити рівно одну null-клітинку.`);
        assert(Array.isArray(variant.choices) && variant.choices.length === 3,
            `${variant.id}: choices має містити рівно 3 варіанти.`);
        assert(variant.choices.every((c) => c.id && c.label),
            `${variant.id}: кожен choice має мати id і label.`);
        assert(variant.choices.some((c) => c.id === variant.correctChoiceId),
            `${variant.id}: correctChoiceId має бути серед choices.`);
        const nonNullLabels = variant.grid.filter(Boolean);
        const symbols = new Set([...nonNullLabels, ...variant.choices.map((c) => c.label)]);
        assert(symbols.size === 3, `${variant.id}: у grid і choices мають використовуватись рівно 3 унікальні символи.`);
    });
});

test('MagicSquare: createTask працює без entry (JS fallback)', () => {
    const random = createSeededRandom(42);
    const task = TaskRegistry.createTaskFromEntry({ type: 'magic-square' }, random);
    assert(task.type === 'magic-square', 'Тип має бути magic-square.');
    assert(task.grid.length === 9, 'Grid має мати 9 клітинок.');
    assert(task.grid.includes(null), 'Grid має містити null-клітинку.');
    assert(task.choices.length === 3, 'Має бути 3 варіанти відповіді.');
    assert(task.choices.some((c) => c.id === task.correctChoiceId), 'Правильна відповідь має бути серед choices.');
});

test('logic.beginner і observation.beginner підключені до NPC пулів', () => {
    const npcs = LevelData.level1.npcs;
    const allPools = new Set(npcs.flatMap((npc) => npc.taskPoolIds ?? [npc.taskPoolId]));
    assert(allPools.has('logic.beginner'),
        'logic.beginner має бути у taskPoolIds щонайменше одного NPC (LOGIC_POOLS).');
    assert(allPools.has('observation.beginner'),
        'observation.beginner має бути у taskPoolIds щонайменше одного NPC (OBSERVE_POOLS).');
});

test('observation.beginner має лише category-diverse odd-one-out (4 унікальних label)', () => {
    const tasks = TaskCatalog.getTasks('observation.beginner');
    assert(tasks.length >= 4, 'observation.beginner має містити щонайменше 4 задачі.');
    tasks.filter((t) => t.type === 'odd-one-out').forEach((entry) => {
        const items = entry.variant?.items ?? [];
        assert(items.length === 4, `${entry.id}: має бути 4 items.`);
        const labels = items.map((i) => i.label);
        assert(new Set(labels).size === 4, `${entry.id}: всі 4 label мають бути різними.`);
        assert(items.some((i) => i.id === entry.variant.correctChoiceId),
            `${entry.id}: correctChoiceId має бути серед items.`);
    });
});

test('Немає дублікатів task.id між усіма JSON-категоріями', () => {
    const allIds = [];
    TaskCatalog.categories.forEach((category) => {
        const tasks = TaskCatalog.getTasks(category.id);
        tasks.forEach((task) => allIds.push({ id: task.id, pool: category.id }));
    });

    const seen = new Map();
    const duplicates = [];
    allIds.forEach(({ id, pool }) => {
        if (seen.has(id)) {
            duplicates.push(`"${id}" у ${pool} і ${seen.get(id)}`);
        } else {
            seen.set(id, pool);
        }
    });

    assert(duplicates.length === 0, `Знайдено дублікати task.id: ${duplicates.join('; ')}`);
});

// ── Нові тести: CameraSystem і AppleSystem ───────────────────────

test('CameraSystem: getWorldPointFromClient конвертує координати з урахуванням камери', async () => {
    const { getWorldPointFromClient } = await import('../js/game/camera-system.js');
    const camera = { x: 100, y: 200 };
    const viewportRect = { left: 10, top: 20 };
    const result = getWorldPointFromClient(310, 420, camera, viewportRect);
    assert(result.x === 400, `Очікувалось x=400, отримано x=${result.x}`);
    assert(result.y === 600, `Очікувалось y=600, отримано y=${result.y}`);
});

test('CameraSystem: syncCameraToPlayer центрує камеру на гравцеві і знімає z цільової та поточної', async () => {
    const { syncCameraToPlayer } = await import('../js/game/camera-system.js');
    const state = { x: 800, y: 600, camera: { x: 0, y: 0 }, targetCamera: { x: 0, y: 0 } };
    const config = { worldWidth: 2000, worldHeight: 2000 };
    const viewport = { width: 400, height: 300 };
    syncCameraToPlayer(state, config, viewport);
    assert(state.camera.x === state.targetCamera.x, 'camera.x має дорівнювати targetCamera.x після snap.');
    assert(state.camera.y === state.targetCamera.y, 'camera.y має дорівнювати targetCamera.y після snap.');
    assert(state.camera.x === 600, `Очікувалось camera.x=600, отримано ${state.camera.x}`);
    assert(state.camera.y === 450, `Очікувалось camera.y=450, отримано ${state.camera.y}`);
});

test('CameraSystem: syncCameraToPlayer не виходить за межі світу', async () => {
    const { syncCameraToPlayer } = await import('../js/game/camera-system.js');
    const state = { x: 10, y: 10, camera: { x: 0, y: 0 }, targetCamera: { x: 0, y: 0 } };
    const config = { worldWidth: 1600, worldHeight: 1600 };
    const viewport = { width: 800, height: 600 };
    syncCameraToPlayer(state, config, viewport);
    assert(state.camera.x >= 0, 'camera.x не може бути від\'ємним.');
    assert(state.camera.y >= 0, 'camera.y не може бути від\'ємним.');
});

test('CameraSystem: updateCamera зміщує targetCamera коли гравець наближається до краю', async () => {
    const { updateCamera } = await import('../js/game/camera-system.js');
    const state = {
        x: 50,
        y: 300,
        camera: { x: 0, y: 0 },
        targetCamera: { x: 0, y: 0 }
    };
    const config = {
        worldWidth: 2000, worldHeight: 2000,
        cameraThreshold: 100, topHudSafeArea: 60, cameraLerp: 1
    };
    const viewport = { width: 800, height: 600 };
    updateCamera(state, config, viewport);
    assert(state.targetCamera.x < 0 || state.camera.x === state.targetCamera.x,
        'updateCamera має скоригувати позицію камери коли гравець біля лівого краю.');
});

test('CollectibleSystem: findNearestCollectible повертає найближче яблуко', async () => {
    const { findNearestCollectible } = await import('../js/game/collectible-system.js');
    const apples = [
        { id: 1, x: 500, y: 500, w: 28 },
        { id: 2, x: 100, y: 100, w: 28 },
        { id: 3, x: 200, y: 200, w: 28 }
    ];
    const nearest = findNearestCollectible(apples, 110, 110);
    assert(nearest && nearest.id === 2, `Має повернутись яблуко id=2, отримано id=${nearest?.id}`);
});

test('CollectibleSystem: findNearestCollectible повертає null для порожнього масиву', async () => {
    const { findNearestCollectible } = await import('../js/game/collectible-system.js');
    const result = findNearestCollectible([], 100, 100);
    assert(result === null, 'Для порожнього масиву має повертатись null.');
});

// ── Тести: виправлення після тестування з дітьми ────────────────

test('Борсук (badger) має емодзі Unicode ≤ 12.1', () => {
    const icon = t('entities.badgerIcon');
    // 🦡 U+1F9A1 Unicode 11.0 (ok); 🦫 U+1F9AB Unicode 13.0 (занадто новий)
    const codePoint = icon.codePointAt(0);
    assert(codePoint !== 0x1F9AB, 'badgerIcon не повинен бути 🦫 (U+1F9AB, Unicode 13.0 — не підтримується старими ОС).');
    assert(icon.length > 0, 'badgerIcon має бути непорожнім.');
});

test('playerRadius достатній щоб не виходити за межі світу (≥ 24)', () => {
    assert(CONFIG.playerRadius >= 24,
        `playerRadius=${CONFIG.playerRadius} — тіло равлика виступає на ~4px за межу колізії, потрібно мінімум 24.`);
});

test('Розмір світу кожного рівня задається даними рівня, а не лише CSS', () => {
    // #game-area у CSS має fallback 4200px; фактичний розмір виставляє GameScene.applyWorldSize()
    assert(CONFIG.worldWidth === 4200 && CONFIG.worldHeight === 4200,
        'Базовий CONFIG має збігатися з fallback-розміром #game-area у style.css (4200px).');

    LevelData.sequence.forEach((level) => {
        const config = createLevelConfig(level);
        assert(config.worldWidth >= 4200 && config.worldHeight >= 4200,
            `${level.id}: світ не має бути меншим за перший рівень.`);
        assert(config.worldWidth === level.world.worldWidth,
            `${level.id}: createLevelConfig має брати розмір саме з даних рівня.`);
    });
});

test('WorldGenerator: предмети не накладаються одне на одне', () => {
    const config = {
        worldWidth: 1600,
        worldHeight: 1600,
        obstacleCount: 8,
        appleCount: 20,
        pearCount: 10
    };
    const world = generateWorld({
        config,
        player: { x: 800, y: 800 },
        npcs: [],
        random: createSeededRandom(99)
    });

    const apples = world.collectibles;
    for (let i = 0; i < apples.length; i += 1) {
        for (let j = i + 1; j < apples.length; j += 1) {
            const a = apples[i];
            const b = apples[j];
            const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
            assert(!overlap, `Яблука ${a.id} і ${b.id} перетинаються: (${a.x},${a.y}) та (${b.x},${b.y}).`);
        }
    }
});

test('order-numbers instructions не містять "по черзі"', () => {
    const asc = t('taskUi.orderAscInstructions');
    const desc = t('taskUi.orderDescInstructions');
    assert(!asc.includes('по черзі'), `orderAscInstructions не повинна містити "по черзі": "${asc}"`);
    assert(!desc.includes('по черзі'), `orderDescInstructions не повинна містити "по черзі": "${desc}"`);
    assert(asc.includes('меншого'), `orderAscInstructions має вказувати напрямок (меншого→більшого): "${asc}"`);
    assert(desc.includes('більшого'), `orderDescInstructions має вказувати напрямок (більшого→меншого): "${desc}"`);
});

// ── Тести: три рівні, груші, дані складності ─────────────────────

test('LevelData має рівно три рівні з унікальними id та зростаючою складністю', () => {
    const levels = LevelData.sequence;

    assert(levels.length === 3, `Очікується 3 рівні, знайдено ${levels.length}.`);
    assert(new Set(levels.map((level) => level.id)).size === 3, 'id рівнів мають бути унікальними.');

    levels.forEach((level, position) => {
        assert(level.index === position + 1, `${level.id}: index має відповідати позиції в послідовності.`);
        assert(t(level.nameKey) !== level.nameKey, `${level.id}: назва "${level.nameKey}" має бути перекладена.`);
        assert(level.npcs.length >= 24, `${level.id}: рівень має містити щонайменше 24 звірів.`);
        assert(
            new Set(level.npcs.map((npc) => npc.id)).size === level.npcs.length,
            `${level.id}: id звірів мають бути унікальними в межах рівня.`
        );
    });

    assert(LevelData.getByIndex(1) === levels[0], 'getByIndex(1) має повертати перший рівень.');
    assert(LevelData.getByIndex(4) === null, 'getByIndex за межами послідовності має повертати null.');
    assert(LevelData.hasNext(1) === true && LevelData.hasNext(3) === false, 'hasNext має бачити кінець послідовності.');
});

test('Кожен рівень посилається лише на банки завдань, що існують', () => {
    LevelData.sequence.forEach((level) => {
        level.npcs.forEach((npc) => {
            const poolIds = npc.taskPoolIds ?? [npc.taskPoolId];
            assert(poolIds.length >= 1, `${npc.id}: має бути щонайменше один банк завдань.`);
            assert(Boolean(npc.distributionGroup), `${npc.id}: має бути distributionGroup.`);
            poolIds.forEach((poolId) => {
                assert(TaskCatalog.getCategory(poolId), `${npc.id}: банк "${poolId}" не існує.`);
            });
            assert(t(npc.nameKey) !== npc.nameKey, `${npc.id}: імʼя "${npc.nameKey}" має бути перекладене.`);
            const iconKey = `entities.${npc.type}Icon`;
            assert(t(iconKey) !== iconKey, `${npc.id}: тип "${npc.type}" має мати іконку.`);
        });
    });
});

test('Кожен NPC має щонайменше один банк, доступний з нуля зірочок', () => {
    // Інакше на старті рівня спрацює fallback і дитина одразу отримає складне завдання.
    LevelData.sequence.forEach((level) => {
        level.npcs.forEach((npc) => {
            const poolIds = npc.taskPoolIds ?? [npc.taskPoolId];
            const openAtStart = poolIds.filter((poolId) => TaskCatalog.getUnlockAtStars(poolId) === 0);
            assert(
                openAtStart.length >= 1,
                `${level.id}/${npc.id}: усі банки закриті на старті — потрібен хоча б один з unlockAtStars = 0.`
            );
        });
    });
});

test('Кожному NPC рівня вистачає завдань, щоб вони не повторювались', () => {
    LevelData.sequence.forEach((level) => {
        const poolIds = new Set(level.npcs.flatMap((npc) => npc.taskPoolIds ?? [npc.taskPoolId]));
        const available = TaskCatalog.getTaskIds([...poolIds]).length;
        assert(
            available >= level.npcs.length,
            `${level.id}: ${available} завдань на ${level.npcs.length} звірів — завдання повторюватимуться.`
        );
    });
});

test('Рівні 2 і 3 використовують складніші банки, ніж рівень 1', () => {
    const poolsOf = (level) => new Set(level.npcs.flatMap((npc) => npc.taskPoolIds ?? [npc.taskPoolId]));
    const level1Pools = poolsOf(LevelData.level1);
    const level2Pools = poolsOf(LevelData.level2);
    const level3Pools = poolsOf(LevelData.level3);

    assert(
        [...level1Pools].every((poolId) => poolId.endsWith('.beginner')),
        'Рівень 1 має лишатись на beginner-банках.'
    );
    assert(
        [...level2Pools].every((poolId) => poolId.endsWith('.intermediate')),
        'Рівень 2 має використовувати intermediate-банки.'
    );
    assert(
        [...level3Pools].every((poolId) => poolId.endsWith('.advanced')),
        'Рівень 3 має використовувати advanced-банки.'
    );
    assert(
        [...level2Pools].every((poolId) => !level1Pools.has(poolId)),
        'Банки рівня 2 не мають дублювати банки рівня 1.'
    );
});

test('Груші є на рівнях 2 і 3, але не на рівні 1', () => {
    const level1 = createLevelConfig(LevelData.level1);
    const level2 = createLevelConfig(LevelData.level2);
    const level3 = createLevelConfig(LevelData.level3);

    assert(level1.pearCount === 0, 'На першому рівні груш бути не має — правила лишаються знайомими.');
    assert(level2.pearCount > 0, 'На другому рівні мають зʼявитися груші.');
    assert(level3.pearCount > level2.pearCount, 'На третьому рівні груш має бути більше, ніж на другому.');
    assert(t('entities.pear') !== 'entities.pear', 'Груша має мати переклад для aria-label.');
});

test('WorldGenerator розрізняє яблука і груші та не накладає їх одне на одне', () => {
    const config = {
        worldWidth: 2000,
        worldHeight: 2000,
        obstacleCount: 6,
        appleCount: 12,
        pearCount: 8
    };
    const world = generateWorld({
        config,
        player: { x: 1000, y: 1000 },
        npcs: [],
        random: createSeededRandom(2024)
    });

    const apples = world.collectibles.filter((item) => item.kind === 'apple');
    const pears = world.collectibles.filter((item) => item.kind === 'pear');

    assert(apples.length === 12, `Очікується 12 яблук, отримано ${apples.length}.`);
    assert(pears.length === 8, `Очікується 8 груш, отримано ${pears.length}.`);
    assert(
        new Set(world.collectibles.map((item) => item.id)).size === world.collectibles.length,
        'id предметів мають бути унікальними для всіх видів разом.'
    );

    for (let i = 0; i < world.collectibles.length; i += 1) {
        for (let j = i + 1; j < world.collectibles.length; j += 1) {
            const a = world.collectibles[i];
            const b = world.collectibles[j];
            const overlap = a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
            assert(!overlap, `Предмети ${a.id} і ${b.id} перетинаються.`);
        }
    }
});

test('CollectibleSystem рахує предмети за видом і збирає обидва види', async () => {
    const { countByKind, collectNearbyCollectibles, collectibleElementId } =
        await import('../js/game/collectible-system.js');

    assert(
        countByKind([{ kind: 'apple' }, { kind: 'pear' }, { kind: 'pear' }]).pear === 2,
        'countByKind має рахувати груші окремо.'
    );
    assert(countByKind([]).apple === 0, 'Порожній масив має давати нулі, а не undefined.');

    const items = [
        { id: 0, kind: 'apple', x: 100, y: 100, w: 32, h: 32 },
        { id: 1, kind: 'pear', x: 100, y: 100, w: 32, h: 32 },
        { id: 2, kind: 'pear', x: 900, y: 900, w: 32, h: 32 }
    ];
    const collected = [];
    const bus = { emit: (name, data) => collected.push(data.type) };

    collectNearbyCollectibles({
        items,
        playerX: 116,
        playerY: 116,
        playerRadius: 26,
        eventBus: bus,
        announcer: { announce: () => {} }
    });

    assert(collected.includes('apple') && collected.includes('pear'),
        'Обидва види мають збиратись однаково.');
    assert(items.length === 1 && items[0].id === 2, 'Далекий предмет має лишитись у світі.');
    assert(collectibleElementId({ id: 7 }) === 'collectible-7', 'DOM-id має бути стабільним.');
});

test('ScoreSystem рахує груші окремо і завершує рівень лише коли зібрано все', () => {
    EventBus.reset();
    const dom = {
        scoreDisplay: document.createElement('div'),
        applesCount: document.createElement('span'),
        pearsCount: document.createElement('span'),
        starsCount: document.createElement('span'),
        hudSession: document.createElement('p'),
        hudObjective: document.createElement('p'),
        hudContext: document.createElement('p'),
        hudNpcBadge: document.createElement('span')
    };

    HUDController.init({ dom });
    let completedEvents = 0;
    EventBus.on('level:completed', () => { completedEvents += 1; });
    ScoreSystem.init({ eventBus: EventBus, dom, totalApples: 1, totalPears: 2, totalStars: 1 });

    EventBus.emit('item:collected', { type: 'apple', value: 1 });
    EventBus.emit('puzzle:completed', { stars: 1 });
    EventBus.emit('item:collected', { type: 'pear', value: 1 });

    assert(ScoreSystem.apples === 1, 'Яблука мають рахуватись.');
    assert(ScoreSystem.pears === 1, 'Груші мають рахуватись окремо від яблук.');
    assert(completedEvents === 0, 'Рівень не можна завершити, поки не зібрано всі груші.');
    assert(dom.pearsCount.textContent === '1/2', 'Лічильник груш у HUD має оновлюватись.');

    EventBus.emit('item:collected', { type: 'pear', value: 1 });
    assert(ScoreSystem.pears === 2, 'Другу грушу теж має бути зараховано.');

    EventBus.reset();
    ScoreSystem.resetSubscriptions();
});

test('TaskPicker відкриває банки за unlockAtStars із самих даних', () => {
    const pools = ['counting.intermediate', 'arithmetic.intermediate'];
    const session = { usedTaskIds: new Set() };

    assert(TaskCatalog.getUnlockAtStars('counting.intermediate') === 0,
        'counting.intermediate має бути доступний одразу.');
    assert(TaskCatalog.getUnlockAtStars('arithmetic.intermediate') > 0,
        'arithmetic.intermediate має відкриватись не з нуля зірочок.');
    assert(TaskCatalog.getUnlockAtStars('невідомий.банк') === 0,
        'Невідомий банк не має ламати вибір завдання.');

    const easyIds = new Set(TaskCatalog.getTaskIds('counting.intermediate'));
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const task = TaskPicker.pickAdaptiveTask(pools, 0, createSeededRandom(attempt + 1), session);
        assert(easyIds.has(task.id),
            `З 0 зірочок має видаватись лише counting.intermediate, отримано "${task.id}".`);
    }
});

test('TaskPicker не зависає, якщо всі банки NPC ще закриті', () => {
    // Запобіжник: замість «жодного завдання» дитина має отримати хоч якесь.
    const task = TaskPicker.pickAdaptiveTask(['arithmetic.advanced'], 0, createSeededRandom(5), null);
    assert(Boolean(task) && task.type.startsWith('simple-'), 'Fallback має повернути валідне завдання.');
});

test('Складніші банки справді складніші за beginner', () => {
    const maxSum = (poolId) => Math.max(...TaskCatalog.getTasks(poolId)
        .filter((entry) => entry.type === 'simple-addition')
        .map((entry) => entry.variant.left + entry.variant.right));
    const maxCount = (poolId) => Math.max(...TaskCatalog.getTasks(poolId)
        .filter((entry) => entry.type === 'count-and-match')
        .map((entry) => entry.variant.count));

    assert(maxSum('arithmetic.intermediate') > maxSum('arithmetic.beginner'),
        'Додавання на рівні 2 має виходити за межі beginner.');
    assert(maxSum('arithmetic.advanced') > maxSum('arithmetic.intermediate'),
        'Додавання на рівні 3 має бути складнішим за рівень 2.');
    assert(maxCount('counting.intermediate') > maxCount('counting.beginner'),
        'Лічба на рівні 2 має йти далі, ніж на рівні 1.');
    assert(maxCount('counting.advanced') > maxCount('counting.intermediate'),
        'Лічба на рівні 3 має йти далі, ніж на рівні 2.');
});

test('MagicSquare 4×4 будується з даних і лишається латинським квадратом', () => {
    TaskCatalog.getTasks('visual-logic.advanced')
        .filter((entry) => entry.type === 'magic-square')
        .forEach((entry) => {
            const task = TaskRegistry.createTaskFromEntry(entry, createSeededRandom(3));
            const size = task.size;

            assert(size === 4, `${entry.id}: на третьому рівні квадрат має бути 4×4.`);
            assert(task.grid.length === size * size, `${entry.id}: сітка має містити size² клітинок.`);
            assert(task.grid.filter((cell) => cell === null).length === 1,
                `${entry.id}: має бути рівно одна порожня клітинка.`);

            const filled = task.grid.slice();
            const answer = task.choices.find((choice) => choice.id === task.correctChoiceId);
            assert(Boolean(answer), `${entry.id}: правильна відповідь має бути серед варіантів.`);
            filled[filled.indexOf(null)] = answer.label;

            for (let line = 0; line < size; line += 1) {
                const row = filled.slice(line * size, line * size + size);
                const column = filled.filter((_, index) => index % size === line);
                assert(new Set(row).size === size, `${entry.id}: рядок ${line} повторює символ.`);
                assert(new Set(column).size === size, `${entry.id}: стовпець ${line} повторює символ.`);
            }
        });
});

test('Усі id завдань унікальні в межах усього каталогу', () => {
    // usedTaskIds дедуплікує за id, тож збіг у різних банках ховав би завдання.
    const seen = new Map();
    TaskCatalog.categories.forEach((category) => {
        category.tasks.forEach((entry) => {
            assert(!seen.has(entry.id),
                `Завдання "${entry.id}" є і в "${seen.get(entry.id)}", і в "${category.id}".`);
            seen.set(entry.id, category.id);
        });
    });
});

test('Іконки звірів не використовують емодзі, новіші за Unicode 12', () => {
    // Шкільні Windows часто не мають гліфів з Unicode 13+ — буде порожній квадрат.
    const tooNew = [0x1F9AB, 0x1FAA8, 0x1FAD1, 0x1FAB0, 0x1FAB1, 0x1FABA, 0x1FAB9];
    const types = new Set(LevelData.sequence.flatMap((level) => level.npcs.map((npc) => npc.type)));

    types.forEach((type) => {
        const icon = t(`entities.${type}Icon`);
        assert(icon.length > 0, `${type}: іконка не має бути порожньою.`);
        assert(!tooNew.includes(icon.codePointAt(0)),
            `${type}: емодзі "${icon}" занадто нове для старих ОС.`);
    });
});

renderResults();
