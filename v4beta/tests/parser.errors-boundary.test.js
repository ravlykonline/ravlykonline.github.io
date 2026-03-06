import assert from 'node:assert/strict';
import { createInterpreter } from './parserTestUtils.js';
import { runTest } from './testUtils.js';

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
            && typeof error.column === 'number'
            && error.column >= 1
            && error.token === 'bad_angle'
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

runTest('game mode blocks page-scroll keys but normal mode does not', () => {
    const interpreter = createInterpreter();

    let preventedInNormalMode = false;
    interpreter.onKeyDown({
        key: 'ArrowDown',
        cancelable: true,
        preventDefault() {
            preventedInNormalMode = true;
        },
    });
    assert.equal(preventedInNormalMode, false);

    interpreter.gameLoopTimerId = 123;
    let preventedInGameMode = false;
    interpreter.onKeyDown({
        key: 'ArrowDown',
        cancelable: true,
        preventDefault() {
            preventedInGameMode = true;
        },
    });
    assert.equal(preventedInGameMode, true);
});

runTest('edge detection uses visual margin, not only center point', () => {
    const interpreter = createInterpreter();
    const margin = interpreter.getBoundaryMargin();
    interpreter.state.x = 400;
    interpreter.state.y = interpreter.canvas.height - margin + 1;
    assert.equal(interpreter.isAtCanvasEdge(), true);
});

runTest('edge detection does not trigger early before margin', () => {
    const interpreter = createInterpreter();
    const margin = interpreter.getBoundaryMargin();

    interpreter.state.x = interpreter.canvas.width - margin - 1;
    interpreter.state.y = interpreter.canvas.height / 2;
    assert.equal(interpreter.isAtCanvasEdge(), false);

    interpreter.state.x = interpreter.canvas.width - margin;
    assert.equal(interpreter.isAtCanvasEdge(), true);

    interpreter.state.x = interpreter.canvas.width / 2;
    interpreter.state.y = margin + 1;
    assert.equal(interpreter.isAtCanvasEdge(), false);

    interpreter.state.y = margin;
    assert.equal(interpreter.isAtCanvasEdge(), true);
});

runTest('performGoto clamps to visual margin bounds', () => {
    const interpreter = createInterpreter();
    const margin = interpreter.getBoundaryMargin();

    interpreter.performGoto(10000, 10000);
    assert.equal(interpreter.state.x, interpreter.canvas.width - margin);
    assert.equal(interpreter.state.y, margin);

    interpreter.performGoto(-10000, -10000);
    assert.equal(interpreter.state.x, margin);
    assert.equal(interpreter.state.y, interpreter.canvas.height - margin);
});

runTest('destroy removes keyboard listeners and clears runtime flags', () => {
    const originalWindow = globalThis.window;
    const listeners = new Map();
    globalThis.window = {
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
        removeEventListener(type, handler) {
            if (listeners.get(type) === handler) {
                listeners.delete(type);
            }
        },
    };

    try {
        const interpreter = createInterpreter();

        assert.ok(listeners.has('keydown'));
        assert.ok(listeners.has('keyup'));

        interpreter.isExecuting = true;
        interpreter.gameLoopTimerId = 123;
        interpreter.destroy();

        assert.equal(interpreter.isDestroyed, true);
        assert.equal(interpreter.isExecuting, false);
        assert.equal(interpreter.gameLoopTimerId, null);
        assert.equal(listeners.has('keydown'), false);
        assert.equal(listeners.has('keyup'), false);
    } finally {
        globalThis.window = originalWindow;
    }
});

