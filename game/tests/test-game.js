import { TaskPicker } from '../js/game/task-picker.js';
import { EventBus } from '../js/core/event-bus.js';
import { circleIntersectsRect, hasWorldCollision } from '../js/game/collision-system.js';
import { LevelData } from '../js/game/level-data.js';
import { createInitialSessionState } from '../js/game/session-state.js';
import { getDistanceFromRectCenter, rectsOverlap, canPlaceRect } from '../js/game/spawn-rules.js';
import { positionNpcs } from '../js/game/npc-spawner.js';
import { generateWorld } from '../js/game/world-generator.js';
import { approach, normalizeAngleDifference, updateAngle } from '../js/core/motion.js';
import { isNpcWithinRange, shouldCollectApple, pickNearestByDistance } from '../js/game/rules.js';
import { TaskRegistry } from '../js/tasks/task-registry.js';
import { taskPools } from '../js/tasks/task-data/task-pools.js';
import { evaluateSingleChoice } from '../js/tasks/task-evaluators/single-choice.js';
import { validateTask } from '../js/tasks/task-validator.js';
import { ScoreSystem } from '../js/systems/score-system.js';
import { HUDController } from '../js/ui/hud-controller.js';
import { ThemeModeController } from '../js/ui/theme-mode.js';
import { t } from '../js/i18n/index.js';
import { Input } from '../js/core/input.js';

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
    appleCount: 2
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
    assert(session.apples.length === 0, 'Нова сесія стартує без згенерованих яблук до world generation.');
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
    assert(world.apples.length === TEST_WORLD_CONFIG.appleCount, 'Має створювати потрібну кількість яблук.');
    assert(
        world.obstacles.every((obstacle) => getDistanceFromRectCenter(obstacle, player) >= 220),
        'Перешкоди не мають з’являтися біля старту Равлика.'
    );
    assert(
        world.apples.every((apple) => !world.obstacles.some((obstacle) => rectsOverlap(apple, obstacle))),
        'Яблука не мають з’являтися всередині перешкод.'
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
        world.apples.every((apple) => !world.npcs.some((npc) => rectsOverlap(apple, npc))),
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

test('shouldCollectApple враховує радіус гравця', () => {
    assert(shouldCollectApple(20, 20) === true, 'Близьке яблуко має збиратись.');
    assert(shouldCollectApple(40, 20) === false, 'Далеке яблуко не має збиратись.');
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
    const task = TaskRegistry.createTask('logic.beginner', () => 0);
    assert(task.type === 'sequence-next', 'Має створюватися задача sequence-next.');
    assert(task.choices.length >= 3, 'У sequence-next мають бути варіанти відповіді.');
});

test('TaskRegistry створює задачу на впорядкування чисел', () => {
    const task = TaskRegistry.createTask('observation.beginner', () => 0.51);
    assert(task.type === 'order-numbers', 'Має створюватися задача order-numbers.');
    assert(task.correctOrder.length === task.numbers.length, 'Порядок відповіді має відповідати кількості чисел.');
});

test('TaskRegistry створює задачу на порівняння множин', () => {
    const task = TaskRegistry.createTask('observation.beginner', () => 0.2);
    assert(task.type === 'compare-sets', 'Має створюватися задача compare-sets.');
    assert(task.leftCount !== task.rightCount, 'У compare-sets групи мають відрізнятися.');
});

test('TaskRegistry створює задачу на лічбу', () => {
    const task = TaskRegistry.createTask('observation.beginner', () => 0.34);
    assert(task.type === 'count-and-match', 'Має створюватися задача count-and-match.');
    assert(task.correctChoiceId === `${task.count}`, 'Правильна відповідь має збігатися з кількістю предметів.');
});

test('TaskRegistry створює задачу на просте додавання', () => {
    const task = TaskRegistry.createTask('logic.beginner', () => 0.34);
    assert(task.type === 'simple-addition', 'Має створюватися задача simple-addition.');
    assert(task.equation.includes('+'), 'У simple-addition має бути приклад на додавання.');
});

test('TaskRegistry створює задачу на візерунок з фігур', () => {
    const task = TaskRegistry.createTask('observation.beginner', () => 0.9);
    assert(task.type === 'shape-pattern', 'Має створюватися задача shape-pattern.');
    assert(task.series.length >= 4, 'У shape-pattern має бути ряд фігур.');
});

test('TaskRegistry створює задачу на віднімання', () => {
    const task = TaskRegistry.createTask('logic.beginner', () => 0.82);
    assert(task.type === 'simple-subtraction', 'Має створюватися задача simple-subtraction.');
    assert(task.equation.includes('-'), 'У simple-subtraction має бути приклад на віднімання.');
});

test('TaskRegistry створює логічну пару', () => {
    const task = TaskRegistry.createTask('logic.beginner', () => 0.95);
    assert(task.type === 'logic-pairs', 'Має створюватися задача logic-pairs.');
    assert(task.pairLabel.includes('→'), 'У logic-pairs має бути опорна пара.');
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

    assert(npcs.length >= 20 && npcs.length <= 25, 'Level should contain 20-25 NPCs.');
    assert(ids.size === npcs.length, 'NPC ids should be unique.');

    npcs.forEach((npc) => {
        const iconKey = `entities.${npc.type}Icon`;
        assert(taskPools[npc.taskPoolId], `Task pool "${npc.taskPoolId}" should exist.`);
        assert(t(npc.nameKey) !== npc.nameKey, `Name key "${npc.nameKey}" should be translated.`);
        assert(t(iconKey) !== iconKey, `NPC type "${npc.type}" should have an icon.`);
    });
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
    assert(countOccupiedQuadrants(world.apples, config) >= 3, 'Apples should be spread across the meadow.');
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

renderResults();
