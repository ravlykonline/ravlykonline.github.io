import assert from 'node:assert/strict';
import { createInterpreter } from './parserTestUtils.js';
import { collectTokenPrimitives } from './astRuntimeTestUtils.js';
import { Environment } from '../js/modules/environment.js';
import { MAX_EXPRESSION_DEPTH } from '../js/modules/constants.js';
import { runTest } from './testUtils.js';

runTest('throws on undefined variable', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', 'unknown_value']),
        (error) => error && error.name === 'RavlykError' && error.message.includes('unknown_value')
    );
});

runTest('parser error exposes line and column metadata', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('forward 10\nright bad_angle');
    assert.throws(
        () => collectTokenPrimitives(interpreter, tokens),
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
        () => collectTokenPrimitives(interpreter, tokens),
        (error) => error
            && error.name === 'RavlykError'
            && error.line === 3
            && error.column === 3
            && error.token === 'fly'
    );
});

runTest('tokenizer throws friendly error for unclosed string with location', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.tokenize('forward 10\nkey "ArrowUp'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'UNCLOSED_STRING'
            && error.line === 2
            && error.column === 5
            && error.token === '"'
    );
});

runTest('throws on division by zero in expression', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', '10', '/', '0']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws friendly error for корінь of negative number', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', 'корінь', '(', '-1', ')']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'SQRT_NEGATIVE'
    );
});

runTest('throws friendly error for math function without parentheses', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', 'корінь', '100']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'MATH_FUNCTION_EXPECT_OPEN_PAREN'
    );
});

runTest('throws friendly error for math function with wrong argument count', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', 'модуль', '(', '1', ',', '2', ')']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'MATH_FUNCTION_ARGUMENT_COUNT'
    );
});

runTest('throws friendly error for випадково range with wrong argument count', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', 'випадково', '(', '1', ')']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'RANDOM_RANGE_ARGUMENT_COUNT'
    );
});

runTest('throws friendly error for випадково range with reversed bounds', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parser.parseCodeToAst('forward випадково(10, 1)');
    assert.throws(
        () => interpreter.evalAstNumberExpression(ast.body[0].distance, new Environment(null)),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'RANDOM_RANGE_INVALID'
    );
});

runTest('throws on unclosed parentheses in expression', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['forward', '(', '10', '+', '2']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws friendly error when expression parentheses exceed MAX_EXPRESSION_DEPTH', () => {
    const interpreter = createInterpreter();
    const depth = MAX_EXPRESSION_DEPTH + 1;
    const code = 'вперед ' + '('.repeat(depth) + '1' + ')'.repeat(depth);
    assert.throws(
        () => interpreter.parser.parseCodeToAst(code),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'EXPRESSION_NESTING_TOO_DEEP'
            && !error.message.includes('Maximum call stack')
    );
});

runTest('throws friendly error when unary chain exceeds MAX_EXPRESSION_DEPTH', () => {
    const interpreter = createInterpreter();
    const code = 'вперед ' + '-'.repeat(MAX_EXPRESSION_DEPTH + 1) + '1';
    assert.throws(
        () => interpreter.parser.parseCodeToAst(code),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'EXPRESSION_NESTING_TOO_DEEP'
    );
});

runTest('throws friendly error when builtin calls exceed MAX_EXPRESSION_DEPTH', () => {
    const interpreter = createInterpreter();
    const depth = MAX_EXPRESSION_DEPTH + 1;
    const code = 'вперед ' + 'модуль('.repeat(depth) + '1' + ')'.repeat(depth);
    assert.throws(
        () => interpreter.parser.parseCodeToAst(code),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'EXPRESSION_NESTING_TOO_DEEP'
    );
});

runTest('allows expression nesting exactly at MAX_EXPRESSION_DEPTH', () => {
    const interpreter = createInterpreter();
    const code = 'вперед ' + '('.repeat(MAX_EXPRESSION_DEPTH) + '1' + ')'.repeat(MAX_EXPRESSION_DEPTH);
    assert.doesNotThrow(() => interpreter.parser.parseCodeToAst(code));
});

runTest('throws on unknown command', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['fly', '10']),
        (error) => error && error.name === 'RavlykError' && error.message.includes('fly')
    );
});

runTest('throws on invalid repeat syntax', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['repeat', '2', 'forward', '10']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('hyphenated variable name gets a friendly identifier error', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parser.parseCodeToAst('створити крок-1 = 5'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'VARIABLE_NAME_INVALID'
            && error.message.includes('крок-1')
            && !error.message.includes('створити функцію')
    );
});

runTest('hyphenated function and parameter names get friendly identifier errors', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parser.parseCodeToAst('створити мій-квадрат() ( вперед 1 )'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'FUNCTION_NAME_INVALID'
            && error.message.includes('мій-квадрат')
    );
    assert.throws(
        () => interpreter.parser.parseCodeToAst('створити лінія(довжина-кроку) ( вперед 1 )'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'FUNCTION_PARAM_INVALID'
            && error.message.includes('довжина-кроку')
    );
});

runTest('throws on invalid goto syntax', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['перейти', 'в', '100']),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'NO_POSITION_Y'
            && error.message.includes('Y-координати')
    );
});

runTest('incomplete перейти distractor reports the missing coordinate without parser jargon', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parser.parseCodeToAst('перейти -20'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'NO_POSITION_Y'
            && error.message.includes('Y-координати')
            && !error.message.includes('expression')
    );
});

runTest('перейти without coordinates reports the missing X coordinate', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.parser.parseCodeToAst('перейти'),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'NO_POSITION_X'
            && error.message.includes('X-координати')
    );
});

runTest('throws on invalid random move syntax with trailing token', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['вперед', 'випадково', '10']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on invalid random goto syntax with trailing coordinate', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['перейти', 'в', 'випадково', '20']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on duplicated random goto syntax', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['перейти', 'в', 'випадково', 'випадково']),
        (error) => error && error.name === 'RavlykError'
    );
});

runTest('throws on thickness without value', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'NO_THICKNESS_VALUE'
    );
});

runTest('throws on invalid thickness forms', () => {
    const interpreter = createInterpreter();

    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина', '2.5']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'INVALID_THICKNESS_VALUE'
    );
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина', 'синя']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'INVALID_THICKNESS_VALUE'
    );
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина', '0']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'THICKNESS_OUT_OF_RANGE'
    );
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина', '-', '3']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'THICKNESS_OUT_OF_RANGE'
    );
    assert.throws(
        () => collectTokenPrimitives(interpreter, ['товщина', '100']),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'THICKNESS_OUT_OF_RANGE'
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

runTest('throws NESTING_TOO_DEEP when blocks nested more than MAX_PARSE_DEPTH', () => {
    const interpreter = createInterpreter();
    // Build 25 levels of nested повторити blocks (limit is 20)
    const deep = 'повторити 1 ( '.repeat(25) + 'вперед 10' + ' )'.repeat(25);
    assert.throws(
        () => collectTokenPrimitives(interpreter, interpreter.tokenize(deep)),
        (error) => error && error.name === 'RavlykError' && error.message.includes('вкладених дужок')
    );
});

runTest('allows blocks nested exactly at MAX_PARSE_DEPTH', () => {
    const interpreter = createInterpreter();
    // 20 levels should be fine
    const ok = 'повторити 1 ( '.repeat(20) + 'вперед 10' + ' )'.repeat(20);
    assert.doesNotThrow(() => collectTokenPrimitives(interpreter, interpreter.tokenize(ok)));
});
