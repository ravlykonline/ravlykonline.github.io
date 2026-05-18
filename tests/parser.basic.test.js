import assert from 'node:assert/strict';
import { COLOR_MAP, CORE_COLOR_NAMES, MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP, UKRAINIAN_COLOR_NAMES } from '../js/modules/constants.js';
import { createInterpreter } from './parserTestUtils.js';
import { runTest } from './testUtils.js';

runTest('tokenize strips comments and keeps punctuation tokens', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('forward 10 # comment\nx = 5\nrepeat 2 ( left 90 )');
    assert.deepEqual(tokens, ['forward', '10', 'x', '=', '5', 'repeat', '2', '(', 'left', '90', ')']);
});

runTest('tokenize keeps quoted strings and multi-char comparators', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('якщо клавіша "вгору" ( вперед 10 ) x >= 2 y != 3 z <= 4');
    assert.deepEqual(tokens, [
        'якщо', 'клавіша', '"вгору"', '(', 'вперед', '10', ')',
        'x', '>=', '2', 'y', '!=', '3', 'z', '<=', '4',
    ]);
});

runTest('legacy parser.parseTokens path is disabled', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parser.parseTokens(['forward', '10']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'LEGACY_PARSE_PATH_REMOVED'
    );
});

runTest('parse move and turn commands', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['forward', '10', 'right', '90', 'backward', '5', 'left', '45']);
    assert.equal(queue.length, 4);
    assert.deepEqual(queue.map((cmd) => cmd.type), ['MOVE', 'TURN', 'MOVE_BACK', 'TURN_LEFT']);
    assert.deepEqual(queue.map((cmd) => cmd.value), [10, 90, 5, 45]);
});

runTest('parse color and pen commands', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['color', 'red', 'penup', 'pendown', 'clear']);
    assert.deepEqual(queue.map((cmd) => cmd.type), ['COLOR', 'PEN_UP', 'PEN_DOWN', 'CLEAR']);
    assert.equal(queue[0].value, 'red');
});

runTest('parse thickness command', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['товщина', '5', 'thickness', '7']);
    assert.deepEqual(queue, [
        { type: 'THICKNESS', value: 5, original: 'товщина' },
        { type: 'THICKNESS', value: 7, original: 'товщина' },
    ]);
});

runTest('parse background command in Ukrainian and English forms', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['фон', 'синій', 'background', 'gold']);
    assert.deepEqual(queue.map((cmd) => cmd.type), ['BACKGROUND', 'BACKGROUND']);
    assert.deepEqual(queue.map((cmd) => cmd.value), ['синій', 'gold']);
});

runTest('parse random color/background commands into concrete queue values using injected rng', () => {
    const interpreter = createInterpreter({ rng: () => 0 });
    const queue = interpreter.parseTokens(['колір', 'випадково', 'фон', 'random']);
    const canonicalNames = new Set(
        Object.keys(COLOR_MAP).filter((name) => COLOR_MAP[name] !== 'RAINBOW')
    );

    assert.deepEqual(queue.map((cmd) => cmd.type), ['COLOR', 'BACKGROUND']);
    assert.equal(canonicalNames.has(queue[0].value), true);
    assert.equal(canonicalNames.has(queue[1].value), true);
    assert.notEqual(COLOR_MAP[queue[0].value], 'RAINBOW');
    assert.notEqual(COLOR_MAP[queue[1].value], 'RAINBOW');
    assert.equal(queue[0].value, queue[1].value);
});

runTest('parse random move command into concrete queue value using injected rng', () => {
    const interpreter = createInterpreter({ rng: () => 0.5 });
    const queue = interpreter.parseTokens(['вперед', 'випадково']);

    assert.deepEqual(queue.map((cmd) => cmd.type), ['MOVE']);
    assert.equal(Number.isFinite(queue[0].value), true);
    assert.equal(queue[0].value >= 20, true);
});

runTest('parse random goto command into concrete queue values using injected rng', () => {
    const interpreter = createInterpreter({ rng: () => 0.5 });
    const queue = interpreter.parseTokens(['перейти', 'в', 'випадково']);

    assert.deepEqual(queue.map((cmd) => cmd.type), ['GOTO']);
    assert.equal(Number.isFinite(queue[0].x), true);
    assert.equal(Number.isFinite(queue[0].y), true);
    assert.equal(Math.abs(queue[0].x) <= 300, true);
    assert.equal(Math.abs(queue[0].y) <= 200, true);
});

runTest('setColor throws on unknown color name', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.setColor('ультрамарин'),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'UNKNOWN_COLOR'
    );
});

runTest('expanded palette keeps old aliases and accepts new color names', () => {
    const interpreter = createInterpreter();
    interpreter.setColor('помаранчевий');
    assert.equal(String(interpreter.state.color).toLowerCase(), '#ff8c00');

    interpreter.setColor('кораловий');
    assert.equal(String(interpreter.state.color).toLowerCase(), '#ff6b5b');

    interpreter.setColor('gold');
    assert.equal(String(interpreter.state.color).toLowerCase(), '#d4af37');

    interpreter.setColor('голубий');
    assert.equal(String(interpreter.state.color).toLowerCase(), '#87ceeb');
});

runTest('color constants expose canonical names and alias lookups', () => {
    assert.equal(COLOR_MAP['жовтогарячий'], '#FF8C00');
    assert.equal(COLOR_MAP['помаранчевий'], '#FF8C00');
    assert.equal(COLOR_MAP['оранжевий'], '#FF8C00');
    assert.equal(COLOR_MAP['голубий'], '#87CEEB');
    assert.equal(COLOR_MAP['rainbow'], 'RAINBOW');
    assert.equal(UKRAINIAN_COLOR_NAMES['#D4AF37'], 'золотий');
    assert.equal(CORE_COLOR_NAMES.includes('синій'), true);
    assert.equal(CORE_COLOR_NAMES.includes('веселка'), true);
});

runTest('parse goto in Ukrainian and English forms', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['перейти', 'в', '120', '-50', 'goto', '10', '20']);
    assert.equal(queue.length, 2);
    assert.deepEqual(queue.map((cmd) => cmd.type), ['GOTO', 'GOTO']);
    assert.deepEqual(queue.map((cmd) => [cmd.x, cmd.y]), [[120, -50], [10, 20]]);
});

runTest('goto supports variables', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['create', 'ax', '=', '40', 'create', 'ay', '=', '-30', 'перейти', 'в', 'ax', 'ay']);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'GOTO');
    assert.equal(queue[0].x, 40);
    assert.equal(queue[0].y, -30);
});

runTest('repeat count above MAX_REPEATS_IN_LOOP throws friendly error', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['repeat', String(MAX_REPEATS_IN_LOOP + 50), '(', 'forward', '1', ')']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'TOO_MANY_REPEATS_IN_LOOP'
    );
});

runTest('variables are resolved in command arguments', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['create', 'step', '=', '25', 'forward', 'step']);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 25);
});

runTest('supports arithmetic expressions in assignments and command arguments', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'step', '=', '10',
        'step', '=', 'step', '+', '5',
        'forward', 'step', '+', '10',
        'right', '180', '/', '2',
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 25);
    assert.equal(queue[1].type, 'TURN');
    assert.equal(queue[1].value, 90);
});

runTest('supports long expressions with precedence and parentheses', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'step', '=', '(', '2', '+', '3', ')', '*', '4',
        'forward', 'step', '+', '6', '/', '2',
        'left', '(', '10', '+', '5', ')', '*', '2',
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 23);
    assert.equal(queue[1].type, 'TURN_LEFT');
    assert.equal(queue[1].value, 30);
});

runTest('supports arithmetic expressions in goto and repeat count', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'x', '=', '10',
        'create', 'y', '=', '20',
        'goto', 'x', '+', '5', ',', 'y', '-', '2',
        'repeat', '2', '+', '1', '(', 'forward', '1', ')',
    ]);
    assert.equal(queue.length, 4);
    assert.equal(queue[0].type, 'GOTO');
    assert.equal(queue[0].x, 15);
    assert.equal(queue[0].y, 18);
    assert.deepEqual(queue.slice(1).map((cmd) => cmd.type), ['MOVE', 'MOVE', 'MOVE']);
    assert.deepEqual(queue.slice(1).map((cmd) => cmd.value), [1, 1, 1]);
});

runTest('supports modulo operator in expressions', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'n', '=', '5',
        'forward', 'n', '%', '2',
        'right', '10', '%', '3',
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 1);
    assert.equal(queue[1].type, 'TURN');
    assert.equal(queue[1].value, 1);
});

runTest('parses if/else with compare condition', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'if', '2', '+', '2', '=', '4',
        '(', 'forward', '10', ')',
        'else',
        '(', 'backward', '10', ')',
    ]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'IF');
    assert.equal(queue[0].condition.type, 'COMPARE_AST');
    assert.equal(queue[0].condition.op, '=');
    assert.equal(queue[0].thenCommands.length, 1);
    assert.equal(queue[0].thenCommands[0].type, 'MOVE');
    assert.equal(queue[0].elseCommands.length, 1);
    assert.equal(queue[0].elseCommands[0].type, 'MOVE_BACK');
});

runTest('parses edge and key conditions', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'if', 'edge', '(', 'right', '180', ')',
        'if', 'key', '"up"', '(', 'forward', '10', ')',
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'IF');
    assert.deepEqual(queue[0].condition, { type: 'EDGE' });
    assert.equal(queue[1].type, 'IF');
    assert.equal(queue[1].condition.type, 'KEY');
    assert.equal(queue[1].condition.key, 'up');
});

runTest('repeat with assignment expands with updated variable values per iteration', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'step', '=', '5',
        'repeat', '3', '(', 'forward', 'step', 'step', '=', 'step', '+', '2', ')',
    ]);
    assert.equal(queue.length, 3);
    assert.deepEqual(queue.map((cmd) => cmd.type), ['MOVE', 'MOVE', 'MOVE']);
    assert.deepEqual(queue.map((cmd) => cmd.value), [5, 7, 9]);
});

runTest('supports unary minus in expressions', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'x', '=', '-', '10',
        'forward', '-', 'x',
        'goto', 'x', '+', '2', ',', '-', '(', '-', '3', ')',
    ]);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 10);
    assert.equal(queue[1].type, 'GOTO');
    assert.equal(queue[1].x, -8);
    assert.equal(queue[1].y, 3);
});

runTest('function declaration and call are expanded', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'line', '(', 'n', ')', '(', 'forward', 'n', ')',
        'line', '(', '12', ')',
    ]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 12);
});

runTest('function call accepts expression argument', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'line', '(', 'n', ')', '(', 'forward', 'n', ')',
        'line', '(', '10', '+', '2', ')',
    ]);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 12);
});

runTest('function nesting deeper than MAX_RECURSION_DEPTH throws friendly error', () => {
    const interpreter = createInterpreter();
    const chainDepth = MAX_RECURSION_DEPTH + 2;
    const parts = [];

    for (let i = 0; i < chainDepth; i++) {
        const fnName = `f${i}`;
        const nextName = `f${i + 1}`;
        if (i === chainDepth - 1) {
            parts.push(`create ${fnName}(n) ( forward n )`);
        } else {
            parts.push(`create ${fnName}(n) ( ${nextName}(n) )`);
        }
    }
    parts.push('f0(1)');

    assert.throws(
        () => {
            const ast = interpreter.parser.parseCodeToAst(parts.join(' '));
            interpreter.astToLegacyQueue(ast);
        },
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'TOO_MANY_NESTED_REPEATS'
    );
});
