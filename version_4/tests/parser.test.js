import assert from 'node:assert/strict';
import { RavlykInterpreter } from '../js/modules/ravlykInterpreter.js';
import { MAX_REPEATS_IN_LOOP } from '../js/modules/constants.js';

function createInterpreter() {
    const ctx = {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 1,
        strokeStyle: '#000000',
    };
    const canvas = { width: 800, height: 600 };
    return new RavlykInterpreter(ctx, canvas, () => {}, () => {}, () => {});
}

function runTest(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAIL: ${name}`);
        throw error;
    }
}

runTest('tokenize strips comments and keeps punctuation tokens', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('forward 10 # comment\nx = 5\nrepeat 2 ( left 90 )');
    assert.deepEqual(tokens, ['forward', '10', 'x', '=', '5', 'repeat', '2', '(', 'left', '90', ')']);
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

runTest('repeat count is clamped to MAX_REPEATS_IN_LOOP', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens(['repeat', String(MAX_REPEATS_IN_LOOP + 50), '(', 'forward', '1', ')']);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'REPEAT');
    assert.equal(queue[0].count, MAX_REPEATS_IN_LOOP);
    assert.equal(queue[0].commands.length, 1);
    assert.equal(queue[0].commands[0].type, 'MOVE');
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
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'GOTO');
    assert.equal(queue[0].x, 15);
    assert.equal(queue[0].y, 18);
    assert.equal(queue[1].type, 'REPEAT');
    assert.equal(queue[1].count, 3);
});

runTest('supports unary minus in expressions', () => {
    const interpreter = createInterpreter();
    const queue = interpreter.parseTokens([
        'create', 'x', '=', '-', '10',
        'forward', '-', 'x',
        'goto', '(', 'x', '+', '2', ')', '-', '(', '-', '3', ')',
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

runTest('throws on undefined variable', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['forward', 'unknown_value']),
        (error) => error && error.name === 'RavlykError' && error.message.includes('unknown_value')
    );
});

runTest('parser error exposes line and column metadata', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('forward 10\nright bad_angle');
    assert.throws(
        () => interpreter.parseTokens(tokens),
        (error) => error
            && error.name === 'RavlykError'
            && error.line === 2
            && error.column === 1
            && error.token === 'right'
    );
});

runTest('parser keeps source line metadata in repeat body', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('repeat 2 (\n  forward 10\n  fly 3\n)');
    assert.throws(
        () => interpreter.parseTokens(tokens),
        (error) => error
            && error.name === 'RavlykError'
            && error.line === 3
            && error.column === 3
            && error.token === 'fly'
    );
});

runTest('throws on division by zero in expression', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['forward', '10', '/', '0']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on unclosed parentheses in expression', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['forward', '(', '10', '+', '2']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on unknown command', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['fly', '10']),
        (error) => error && error.name === 'RavlykError' && error.message.includes('fly')
    );
});

runTest('throws on invalid repeat syntax', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['repeat', '2', 'forward', '10']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on invalid goto syntax', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parseTokens(['перейти', 'в', '100']),
        (error) => error && error.name === 'RavlykError'
    );
});

console.log('Parser tests completed.');
