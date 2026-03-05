import assert from 'node:assert/strict';
import { RavlykInterpreter } from '../js/modules/ravlykInterpreter.js';
import { MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP } from '../js/modules/constants.js';

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

async function runAsyncTest(name, fn) {
    try {
        await fn();
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

runTest('tokenize keeps quoted strings and multi-char comparators', () => {
    const interpreter = createInterpreter();
    const tokens = interpreter.tokenize('якщо клавіша "вгору" ( вперед 10 ) x >= 2 y != 3 z <= 4');
    assert.deepEqual(tokens, [
        'якщо', 'клавіша', '"вгору"', '(', 'вперед', '10', ')',
        'x', '>=', '2', 'y', '!=', '3', 'z', '<=', '4'
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

runTest('setColor throws on unknown color name', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.setColor('ультрамарин'),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'UNKNOWN_COLOR'
    );
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
    const queue = interpreter.astToLegacyQueue(ast, {
        emitAssignments: true,
    });
    assert.equal(queue.length, 2);
    assert.equal(queue[0].type, 'ASSIGN_AST');
    assert.equal(queue[1].type, 'IF');
    assert.equal(queue[1].condition.type, 'COMPARE_AST');
    assert.equal(queue[1].condition.left.type, 'Identifier');
    assert.equal(queue[1].condition.left.name, 'n');
});

runTest('prepareNonGameProgramExecution builds execution queue and env', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'create', 'n', '=', '1',
        'forward', 'n',
    ]);
    interpreter.prepareNonGameProgramExecution(ast);
    assert.ok(Array.isArray(interpreter.commandQueue));
    assert.equal(interpreter.commandQueue.length, 2);
    assert.equal(interpreter.commandQueue[0].type, 'ASSIGN_AST');
    assert.equal(interpreter.commandQueue[1].type, 'MOVE');
    assert.ok(interpreter.executionEnv);
    assert.equal(typeof interpreter.executionEnv.get, 'function');
});

await runAsyncTest('executeProgramAst routes game programs to executeGameProgram', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'game', '(',
            'forward', '1',
        ')',
    ]);
    let gameCalled = false;
    let prepareCalled = false;
    let queueCalled = false;
    interpreter.executeGameProgram = async () => {
        gameCalled = true;
        return 'GAME_PATH';
    };
    interpreter.prepareNonGameProgramExecution = () => {
        prepareCalled = true;
    };
    interpreter.runCommandQueue = async () => {
        queueCalled = true;
        return 'QUEUE_PATH';
    };

    const result = await interpreter.executeProgramAst(ast);
    assert.equal(result, 'GAME_PATH');
    assert.equal(gameCalled, true);
    assert.equal(prepareCalled, false);
    assert.equal(queueCalled, false);
});

await runAsyncTest('executeProgramAst routes non-game programs to queue path', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '2',
    ]);
    let gameCalled = false;
    let prepareCalled = false;
    let queueCalled = false;
    interpreter.executeGameProgram = async () => {
        gameCalled = true;
        return 'GAME_PATH';
    };
    interpreter.prepareNonGameProgramExecution = () => {
        prepareCalled = true;
    };
    interpreter.runCommandQueue = async () => {
        queueCalled = true;
        return 'QUEUE_PATH';
    };

    const result = await interpreter.executeProgramAst(ast);
    assert.equal(result, 'QUEUE_PATH');
    assert.equal(gameCalled, false);
    assert.equal(prepareCalled, true);
    assert.equal(queueCalled, true);
});

await runAsyncTest('executeProgramAst delegates non-game flow to executeNonGameProgramAst', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '3',
    ]);
    let nonGameCalled = false;
    let gameCalled = false;
    interpreter.executeGameProgram = async () => {
        gameCalled = true;
        return 'GAME_PATH';
    };
    interpreter.executeNonGameProgramAst = async () => {
        nonGameCalled = true;
        return 'NON_GAME_PATH';
    };

    const result = await interpreter.executeProgramAst(ast);
    assert.equal(result, 'NON_GAME_PATH');
    assert.equal(nonGameCalled, true);
    assert.equal(gameCalled, false);
});

await runAsyncTest('executeNonGameProgramAst dispatches queue mode via executeNonGameProgramAstViaQueue', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '3',
    ]);
    interpreter.getNonGameExecutionMode = () => 'queue';
    let viaQueueCalled = false;
    interpreter.executeNonGameProgramAstViaQueue = async () => {
        viaQueueCalled = true;
        return 'QUEUE_MODE_PATH';
    };

    const result = await interpreter.executeNonGameProgramAst(ast);
    assert.equal(result, 'QUEUE_MODE_PATH');
    assert.equal(viaQueueCalled, true);
});

await runAsyncTest('executeNonGameProgramAst throws on unsupported execution mode', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '3',
    ]);
    interpreter.getNonGameExecutionMode = () => 'ast';
    await assert.rejects(
        interpreter.executeNonGameProgramAst(ast),
        (error) => error instanceof Error && String(error.message).includes('UNSUPPORTED_NON_GAME_EXECUTION_MODE:ast')
    );
});

runTest('non-game execution mode can be read and set for supported mode', () => {
    const interpreter = createInterpreter();
    assert.equal(interpreter.getNonGameExecutionMode(), 'queue');
    interpreter.setNonGameExecutionMode('queue');
    assert.equal(interpreter.getNonGameExecutionMode(), 'queue');
    interpreter.setNonGameExecutionMode('ast_experimental');
    assert.equal(interpreter.getNonGameExecutionMode(), 'ast_experimental');
});

runTest('setNonGameExecutionMode rejects unsupported mode', () => {
    const interpreter = createInterpreter();
    assert.throws(
        () => interpreter.setNonGameExecutionMode('ast'),
        (error) => error instanceof Error && String(error.message).includes('UNSUPPORTED_NON_GAME_EXECUTION_MODE:ast')
    );
});

await runAsyncTest('executeNonGameProgramAst dispatches ast_experimental mode', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '3',
    ]);
    interpreter.setNonGameExecutionMode('ast_experimental');
    let astExperimentalCalled = false;
    interpreter.executeNonGameProgramAstViaAstExperimental = async () => {
        astExperimentalCalled = true;
        return 'AST_EXPERIMENTAL_PATH';
    };

    const result = await interpreter.executeNonGameProgramAst(ast);
    assert.equal(result, 'AST_EXPERIMENTAL_PATH');
    assert.equal(astExperimentalCalled, true);
});

await runAsyncTest('ast_experimental falls back to queue path when RAF is unavailable', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '4',
    ]);
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(true);
    let queueCalled = false;
    interpreter.executeNonGameProgramAstViaQueue = async () => {
        queueCalled = true;
        return 'QUEUE_FALLBACK';
    };
    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = undefined;
    globalThis.cancelAnimationFrame = undefined;

    try {
        const result = await interpreter.executeNonGameProgramAstViaAstExperimental(ast);
        assert.equal(result, 'QUEUE_FALLBACK');
        assert.equal(queueCalled, true);
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }
});

await runAsyncTest('ast_experimental executes direct AST path when animation is disabled', async () => {
    const interpreter = createInterpreter();
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(false);

    await interpreter.executeCommands('create n = 2 if n = 2 ( color blue ) else ( color red ) forward 3');

    assert.equal(String(interpreter.state.color).toLowerCase(), '#0000ff');
    assert.equal(interpreter.state.x, 400);
    assert.equal(interpreter.state.y, 297);
});

await runAsyncTest('ast_experimental executes direct AST path when animation is enabled', async () => {
    const interpreter = createInterpreter();
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(true);
    let queueCalled = false;
    interpreter.executeNonGameProgramAstViaQueue = async () => {
        queueCalled = true;
        return 'QUEUE_FALLBACK';
    };
    const oldRAF = globalThis.requestAnimationFrame;
    const oldCAF = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 0);
    globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

    try {
        await interpreter.executeCommands('forward 2');
    } finally {
        globalThis.requestAnimationFrame = oldRAF;
        globalThis.cancelAnimationFrame = oldCAF;
    }

    assert.equal(queueCalled, false);
    assert.equal(interpreter.state.x, 400);
    assert.ok(Math.abs(interpreter.state.y - 298) < 1e-6);
});

await runAsyncTest('ast_experimental direct path updates command indicator with progress', async () => {
    const interpreter = createInterpreter();
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(false);
    const indicatorCalls = [];
    interpreter.commandIndicatorUpdater = (command, index, total) => {
        indicatorCalls.push({ command, index, total });
    };

    await interpreter.executeCommands('color blue forward 2');

    const withTotal = indicatorCalls.filter((entry) => Number.isInteger(entry.total));
    assert.ok(withTotal.length >= 2);
    assert.equal(withTotal[0].index, 0);
    assert.equal(withTotal[0].total, 2);
    assert.equal(withTotal[1].index, 1);
    assert.equal(withTotal[1].total, 2);
});

await runAsyncTest('ast_experimental direct path respects stop flag before execution', async () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst([
        'forward', '3',
    ]);
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(false);
    interpreter.shouldStop = true;

    await assert.rejects(
        interpreter.executeNonGameProgramAstViaAstExperimental(ast),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
});

await runAsyncTest('ast_experimental direct path supports pause and resume', async () => {
    const interpreter = createInterpreter();
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(false);
    let pauseScheduled = false;
    interpreter.commandIndicatorUpdater = (_command, index, total) => {
        if (!pauseScheduled && index === 0 && total === 2) {
            pauseScheduled = true;
            interpreter.isPaused = true;
            setTimeout(() => interpreter.resumeExecution(), 30);
        }
    };

    const runPromise = interpreter.executeCommands('forward 1 forward 1');
    await runPromise;

    assert.equal(interpreter.state.x, 400);
    assert.equal(interpreter.state.y, 298);
});

await runAsyncTest('ast_experimental direct path can be stopped while paused', async () => {
    const interpreter = createInterpreter();
    interpreter.setNonGameExecutionMode('ast_experimental');
    interpreter.setAnimationEnabled(false);
    let pauseScheduled = false;
    interpreter.commandIndicatorUpdater = (_command, index, total) => {
        if (!pauseScheduled && index === 0 && total === 2) {
            pauseScheduled = true;
            interpreter.isPaused = true;
            setTimeout(() => interpreter.stopExecution(), 30);
        }
    };

    const runPromise = interpreter.executeCommands('forward 1 forward 1');
    await assert.rejects(
        runPromise,
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
});

runTest('shouldExecuteGameProgram detects game statements in AST', () => {
    const interpreter = createInterpreter();
    const gameAst = interpreter.parseTokensToAst([
        'game', '(',
            'forward', '1',
        ')',
    ]);
    const nonGameAst = interpreter.parseTokensToAst([
        'forward', '1',
    ]);
    assert.equal(interpreter.shouldExecuteGameProgram(gameAst), true);
    assert.equal(interpreter.shouldExecuteGameProgram(nonGameAst), false);
});

await runAsyncTest('executeCommands resets execution state after parse error', async () => {
    const interpreter = createInterpreter();
    await assert.rejects(
        interpreter.executeCommands('abracadabra'),
        (error) => error && error.name === 'RavlykError'
    );
    assert.equal(interpreter.isExecuting, false);
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
    const ast = interpreter.parseTokensToAst(['грати', '(', 'forward', '1', ')']);
    assert.equal(ast.type, 'Program');
    assert.equal(ast.body.length, 1);
    assert.equal(ast.body[0].type, 'GameStmt');
    assert.equal(ast.body[0].body.length, 1);
    assert.equal(ast.body[0].body[0].type, 'MoveStmt');
});

runTest('game statement is rejected at execution adapter stage for now', () => {
    const interpreter = createInterpreter();
    const ast = interpreter.parseTokensToAst(['грати', '(', 'forward', '1', ')']);
    assert.throws(
        () => interpreter.astToLegacyQueue(ast),
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'GAME_NOT_SUPPORTED_HERE'
    );
});

await runAsyncTest('game loop starts and stops via stopExecution', async () => {
    const interpreter = createInterpreter();
    const runPromise = interpreter.executeCommands('грати ( вперед 1 )');
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

    const code = parts.join(' ');
    assert.throws(
        () => {
            const ast = interpreter.parser.parseCodeToAst(code);
            interpreter.astToLegacyQueue(ast);
        },
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'TOO_MANY_NESTED_REPEATS'
    );
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
    await new Promise((resolve) => setTimeout(resolve, 125));
    interpreter.stopExecution();
    await assert.rejects(
        runPromise,
        (error) => error && error.name === 'RavlykError' && error.messageKey === 'EXECUTION_STOPPED_BY_USER'
    );
    const delta = initialY - interpreter.state.y;
    assert.ok(delta >= 3, `expected accumulated movement >= 3, got ${delta}`);
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
        const interpreter = new RavlykInterpreter(ctx, canvas, () => {}, () => {}, () => {});

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
    // n ends at 8 => last branch should set color to blue.
    assert.equal(String(interpreter.state.color).toLowerCase(), '#0000ff');
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

    assert.equal(String(interpreter.state.color).toLowerCase(), '#0000ff');
});

console.log('Parser tests completed.');
