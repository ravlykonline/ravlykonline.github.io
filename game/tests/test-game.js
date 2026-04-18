import { TaskPicker } from '../js/game/task-picker.js';
import { approach, normalizeAngleDifference, updateAngle } from '../js/core/motion.js';
import { isNpcWithinRange, shouldCollectApple, pickNearestByDistance } from '../js/game/rules.js';
import { TaskRegistry } from '../js/tasks/task-registry.js';
import { HUDController } from '../js/ui/hud-controller.js';
import { ThemeModeController } from '../js/ui/theme-mode.js';

const results = document.getElementById('results');
const summary = document.getElementById('summary');
const testResults = [];

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
        hudNpcBadge: document.createElement('span')
    };

    HUDController.init({ dom });
    HUDController.setSessionSummary({ apples: 3, stars: 2 });
    HUDController.setObjective('Нова ціль для перевірки');
    HUDController.setContext('Поруч з’явився друг із завданням');
    HUDController.setNearbyNpc('Мишка');

    assert(dom.hudSession.textContent.includes('3'), 'HUD має показувати яблука в сесійному статусі.');
    assert(dom.hudSession.textContent.includes('2'), 'HUD має показувати зірочки в сесійному статусі.');
    assert(dom.hudObjective.textContent === 'Нова ціль для перевірки', 'HUD має оновлювати ціль окремо.');
    assert(dom.hudContext.textContent === 'Поруч з’явився друг із завданням', 'HUD має оновлювати контекст окремо.');
    assert(dom.hudNpcBadge.textContent.includes('Мишка'), 'HUD має показувати бейдж сусіднього NPC.');
    assert(dom.hudNpcBadge.classList.contains('hidden') === false, 'Бейдж NPC має ставати видимим.');

    HUDController.setNearbyNpc(null);
    assert(dom.hudNpcBadge.classList.contains('hidden') === true, 'Бейдж NPC має ховатися, коли поруч нікого немає.');
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
