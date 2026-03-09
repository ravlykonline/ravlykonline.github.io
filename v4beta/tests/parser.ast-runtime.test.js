import assert from 'node:assert/strict';
import { COLOR_MAP, MAX_REPEATS_IN_LOOP } from '../js/modules/constants.js';
import { createInterpreter } from './parserTestUtils.js';
import { runTest, runAsyncTest } from './testUtils.js';

runTest('builds Program AST for basic commands', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['forward', '10', 'right', '90']);
    assert.equal(ast.type, 'Program');
    assert.equal(ast.body.length, 2);
    assert.equal(ast.body[0].type, 'MoveStmt');
    assert.equal(ast.body[0].direction, 'forward');
    assert.equal(ast.body[0].distance.type, 'NumberLiteral');
    assert.equal(ast.body[0].distance.value, 10);
    assert.equal(ast.body[1].type, 'TurnStmt');
    assert.equal(ast.body[1].direction, 'right');
    assert.equal(ast.body[1].angle.value, 90);
});

runTest('builds explicit color/background argument objects in AST', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['колір', 'синій', 'фон', 'бежевий']);

    assert.equal(ast.body[0].type, 'ColorStmt');
    assert.deepEqual(ast.body[0].colorArg, { kind: 'named', value: 'синій' });
    assert.equal(ast.body[1].type, 'BackgroundStmt');
    assert.deepEqual(ast.body[1].colorArg, { kind: 'named', value: 'бежевий' });
});

runTest('builds thickness statement in AST', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['товщина', '7']);

    assert.equal(ast.body[0].type, 'ThicknessStmt');
    assert.equal(ast.body[0].thickness, 7);
});

runTest('builds random color/background arguments in AST', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['колір', 'випадково', 'фон', 'random']);

    assert.equal(ast.body[0].type, 'ColorStmt');
    assert.deepEqual(ast.body[0].colorArg, { kind: 'random' });
    assert.equal(ast.body[1].type, 'BackgroundStmt');
    assert.deepEqual(ast.body[1].colorArg, { kind: 'random' });
});

runTest('builds random move and goto arguments in AST', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['вперед', 'випадково', 'назад', 'random', 'перейти', 'в', 'випадково']);

    assert.equal(ast.body[0].type, 'MoveStmt');
    assert.deepEqual(ast.body[0].distance, { kind: 'random' });
    assert.equal(ast.body[0].direction, 'forward');

    assert.equal(ast.body[1].type, 'MoveStmt');
    assert.deepEqual(ast.body[1].distance, { kind: 'random' });
    assert.equal(ast.body[1].direction, 'backward');

    assert.equal(ast.body[2].type, 'GotoStmt');
    assert.deepEqual(ast.body[2].target, { kind: 'random' });
});

await runAsyncTest('executeCommands rejects rainbow background as unsupported background color', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await assert.rejects(
            interpreter.executeCommands('фон веселка'),
            (error) => error && error.name === 'RavlykError' && error.messageKey === 'UNKNOWN_COLOR'
        );
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands applies random pen color using injected rng', async () => {
    const interpreter = createInterpreter({ rng: () => 0 });
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('колір випадково');
        assert.equal(String(interpreter.state.color).toLowerCase(), String(COLOR_MAP['білий']).toLowerCase());
        assert.equal(interpreter.state.isRainbow, false);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands applies random background color using injected rng', async () => {
    const interpreter = createInterpreter({ rng: () => 0 });
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('фон випадково');
        assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), String(COLOR_MAP['білий']).toLowerCase());
        assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), String(COLOR_MAP['білий']).toLowerCase());
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands applies random move distance using injected rng', async () => {
    const interpreter = createInterpreter({ rng: () => 0.5 });
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        const startX = interpreter.state.x;
        const startY = interpreter.state.y;
        await interpreter.executeCommands('вперед випадково');
        assert.equal(interpreter.state.x, startX);
        assert.notEqual(interpreter.state.y, startY);
        assert.equal(interpreter.wasBoundaryWarningShown(), false);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands applies random goto target using injected rng', async () => {
    const interpreter = createInterpreter({ rng: () => 0.25 });
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        const startX = interpreter.state.x;
        const startY = interpreter.state.y;
        await interpreter.executeCommands('перейти в випадково');
        assert.notEqual(interpreter.state.x, startX);
        assert.notEqual(interpreter.state.y, startY);
        assert.equal(interpreter.wasBoundaryWarningShown(), false);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands applies thickness and resets it on clear', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('товщина 7');
        assert.equal(interpreter.state.penSize, 7);
        assert.equal(interpreter.ctx.lineWidth, 7);

        await interpreter.executeCommands('очистити');
        assert.equal(interpreter.state.penSize, 1);
        assert.equal(interpreter.ctx.lineWidth, 1);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('executeCommands uses thickness when clamping to canvas bounds', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('товщина 50\nперейти в 10000 10000');
        assert.equal(interpreter.state.x, interpreter.canvas.width - 25);
        assert.equal(interpreter.state.y, 25);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

runTest('reset restores default background color after custom background', () => {
    const interpreter = createInterpreter();
    interpreter.setBackgroundColor('бежевий');
    interpreter.state.penSize = 9;
    interpreter.applyContextSettings();
    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), String(COLOR_MAP['бежевий']).toLowerCase());
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), String(COLOR_MAP['бежевий']).toLowerCase());
    assert.equal(interpreter.state.penSize, 9);

    interpreter.reset();
    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), '#ffffff');
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), '#ffffff');
    assert.equal(interpreter.state.penSize, 1);
    assert.equal(interpreter.ctx.lineWidth, 1);
});

runTest('custom background survives technical resize redraw until clear or reset', () => {
    const interpreter = createInterpreter();
    interpreter.setBackgroundColor('синій');

    interpreter.handleCanvasResize({
        deltaX: 20,
        deltaY: -10,
        oldWidth: 800,
        oldHeight: 600,
        newWidth: 840,
        newHeight: 620,
    });

    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), String(COLOR_MAP['синій']).toLowerCase());
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), String(COLOR_MAP['синій']).toLowerCase());
});

runTest('sequential background commands keep only the final background color in state', () => {
    const interpreter = createInterpreter();
    interpreter.setBackgroundColor('червоний');
    interpreter.setBackgroundColor('зелений');
    interpreter.setBackgroundColor('білий');

    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), String(COLOR_MAP['білий']).toLowerCase());
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), String(COLOR_MAP['білий']).toLowerCase());
});

runTest('clearToDefaultSheet resets custom background to white immediately', () => {
    const interpreter = createInterpreter();
    interpreter.setBackgroundColor('фіолетовий');

    interpreter.clearToDefaultSheet();

    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), '#ffffff');
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), '#ffffff');
});

runTest('builds Program AST for repeat and if', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'repeat', '2', '(', 'forward', '5', ')',
        'if', '1', '=', '1', '(', 'left', '30', ')',
    ]);
    assert.equal(ast.type, 'Program');
    assert.equal(ast.body.length, 2);
    assert.equal(ast.body[0].type, 'RepeatStmt');
    assert.equal(ast.body[0].count.value, 2);
    assert.equal(ast.body[0].body.length, 1);
    assert.equal(ast.body[0].body[0].type, 'MoveStmt');
    assert.equal(ast.body[1].type, 'IfStmt');
    assert.equal(ast.body[1].condition.type, 'CompareCondition');
    assert.equal(ast.body[1].thenBody[0].type, 'TurnStmt');
});

runTest('astToLegacyQueue keeps compare-if as runtime IF command', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'if', '1', '=', '2',
        '(', 'forward', '10', ')',
        'else', '(', 'backward', '10', ')',
    ]);
    const queue = interpreter.astToLegacyQueue(ast);
    assert.equal(queue.length, 1);
    assert.equal(queue[0].type, 'IF');
    assert.equal(queue[0].condition.type, 'COMPARE_AST');
    assert.equal(queue[0].condition.op, '=');
    assert.equal(queue[0].thenCommands.length, 1);
    assert.equal(queue[0].elseCommands.length, 1);
});

runTest('astToLegacyQueue keeps identifier expressions in IF condition for runtime evaluation', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'create', 'n', '=', '0',
        'if', 'n', '=', '0',
        '(', 'forward', '1', ')',
    ]);
    const queue = interpreter.astToLegacyQueue(ast, { emitAssignments: true });
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'ASSIGN_AST');
    assert.equal(queue[1].type, 'IF');
    assert.equal(queue[1].condition.type, 'COMPARE_AST');
    assert.equal(queue[1].condition.left.type, 'Identifier');
    assert.equal(queue[1].condition.left.name, 'n');
});

runTest('builds AST for assignment and function definition/call', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'create', 'step', '=', '5',
        'create', 'line', '(', 'n', ')', '(', 'forward', 'n', ')',
        'line', '(', 'step', '+', '2', ')',
    ]);
    assert.equal(ast.type, 'Program');
    assert.equal(ast.body.length, 3);
    assert.equal(ast.body[0].type, 'AssignmentStmt');
    assert.equal(ast.body[1].type, 'FunctionDefStmt');
    assert.deepEqual(ast.body[1].params, ['n']);
    assert.equal(ast.body[2].type, 'FunctionCallStmt');
    assert.equal(ast.body[2].args.length, 1);
});

runTest('astToLegacyQueue resolves variables and function calls', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'create', 'step', '=', '5',
        'create', 'line', '(', 'n', ')', '(', 'forward', 'n', ')',
        'line', '(', 'step', '+', '2', ')',
        'step', '=', 'step', '+', '3',
        'forward', 'step',
    ]);
    const queue = interpreter.astToLegacyQueue(ast);
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'MOVE');
    assert.equal(queue[0].value, 7);
    assert.equal(queue[1].type, 'MOVE');
    assert.equal(queue[1].value, 8);
});

runTest('parseCodeToAst keeps span metadata', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parser.parseCodeToAst('forward 10\nright 90');
    assert.equal(ast.type, 'Program');
    assert.ok(ast.span);
    assert.equal(ast.body[0].type, 'MoveStmt');
    assert.ok(ast.body[0].span);
    assert.equal(ast.body[0].span.start.line, 1);
    assert.equal(ast.body[1].span.start.line, 2);
});

runTest('parses game statement into AST', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['game', '(', 'forward', '1', ')']);
    assert.equal(ast.type, 'Program');
    assert.equal(ast.body.length, 1);
    assert.equal(ast.body[0].type, 'GameStmt');
    assert.equal(ast.body[0].body.length, 1);
    assert.equal(ast.body[0].body[0].type, 'MoveStmt');
});

runTest('game statement is rejected at execution adapter stage for now', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['game', '(', 'forward', '1', ')']);
    assert.throws(
        () => interpreter.astToLegacyQueue(ast),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'GAME_NOT_SUPPORTED_HERE'
    );
});

await runAsyncTest('game loop starts and stops via stopExecution', async () => {
    const interpreter = createInterpreter();
    const runPromise = interpreter.executeCommands('game ( forward 1 )');
    setTimeout(() => interpreter.stopExecution(), 120);
    await assert.rejects(
        runPromise,
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
});

runTest('ast runtime error keeps line and column from span', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parser.parseCodeToAst('create x = 1\nforward missing');
    assert.throws(
        () => interpreter.astToLegacyQueue(ast),
        (error) => error
            && error.name === 'RavlykError'
            && error.messageKey === 'UNDEFINED_VARIABLE'
            && error.line === 2
            && typeof error.column === 'number'
    );
});

runTest('ast repeat above MAX_REPEATS_IN_LOOP throws friendly error', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parser.parseCodeToAst(`repeat ${MAX_REPEATS_IN_LOOP + 1} ( forward 1 )`);
    assert.throws(
        () => interpreter.astToLegacyQueue(ast),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'TOO_MANY_REPEATS_IN_LOOP'
    );
});

await runAsyncTest('stopExecution clears game loop timer immediately', async () => {
    const interpreter = createInterpreter();
    const runPromise = interpreter.executeCommands('game ( forward 1 )');
    await new Promise((resolve) => setTimeout(resolve, 20));
    interpreter.stopExecution();
    assert.equal(interpreter.gameLoopTimerId, null);
    await assert.rejects(
        runPromise,
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
});

await runAsyncTest('game loop keeps environment state between ticks', async () => {
    const interpreter = createInterpreter();
    const initialY = interpreter.state.y;
    const runPromise = interpreter.executeCommands('create step = 1 game ( forward step step = step + 1 )');

    const waitForAccumulatedMovement = async (minimumDelta, timeoutMs = 400) => {
        const startedAt = Date.now();
        while ((Date.now() - startedAt) < timeoutMs) {
            const deltaNow = initialY - interpreter.state.y;
            if (deltaNow >= minimumDelta) {
                return deltaNow;
            }
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
        return initialY - interpreter.state.y;
    };

    const deltaBeforeStop = await waitForAccumulatedMovement(3);
    interpreter.stopExecution();
    await assert.rejects(
        runPromise,
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
    assert.ok(deltaBeforeStop >= 3, `expected accumulated movement >= 3, got ${deltaBeforeStop}`);
});

await runAsyncTest('game contract rejects top-level drawing command when game block exists', async () => {
    const interpreter = createInterpreter();
    await assert.rejects(
        interpreter.executeCommands('forward 5 game ( forward 1 )'),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'GAME_MODE_TOP_LEVEL_ONLY'
    );
});

runTest('lesson baseline snippets still parse and build executable queue', () => {
    const interpreter = createInterpreter();
    const samples = [
        'repeat 4 ( forward 100 right 90 )',
        'repeat 36 ( forward 10 right 10 )',
        'create square(side) ( repeat 4 ( forward side right 90 ) ) square(80)',
    ];
    for (const code of samples) {
        const ast = interpreter.parser.parseCodeToAst(code);
        const queue = interpreter.astToLegacyQueue(ast);
        assert.ok(Array.isArray(queue));
        assert.ok(queue.length > 0);
    }
});

await runAsyncTest('if inside repeat executes sequentially without getting stuck on IF command', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands(
            'створити n = 0 повторити 8 ( n = n + 1 якщо n % 2 = 0 ( колір синій ) інакше ( колір червоний ) вперед 20 праворуч 45 )'
        );
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }

    assert.equal(interpreter.isExecuting, false);
    assert.equal(interpreter.currentCommandIndex >= 0, true);
    assert.equal(String(interpreter.state.color).toLowerCase(), String(COLOR_MAP['синій']).toLowerCase());
});

await runAsyncTest('executeCommands evaluates compare-if against runtime assignment state', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands(
            'створити n = 0 n = n + 2 якщо n = 2 ( колір синій ) інакше ( колір червоний )'
        );
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }

    assert.equal(String(interpreter.state.color).toLowerCase(), String(COLOR_MAP['синій']).toLowerCase());
});

await runAsyncTest('executeCommands restores default white sheet after clear command', async () => {
    const interpreter = createInterpreter();
    interpreter.setAnimationEnabled(false);

    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('фон золотий вперед 10 очистити');
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }

    assert.equal(String(interpreter.state.backgroundColor).toLowerCase(), '#ffffff');
    assert.equal(String(interpreter.backgroundCanvas.style.backgroundColor).toLowerCase(), '#ffffff');
});
