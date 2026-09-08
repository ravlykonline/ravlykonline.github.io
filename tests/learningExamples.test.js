import assert from 'node:assert/strict';
import fs from 'node:fs';
import { RavlykParser, RavlykError } from '../js/modules/ravlykParser.js';
import { createAstRuntime } from '../js/modules/interpreterAstRuntime.js';
import { createGameAstRunner } from '../js/modules/interpreterGameAstRunner.js';
import { Environment } from '../js/modules/environment.js';
import { attachAstErrorLocation, evalAstNumberExpression } from '../js/modules/interpreterAstEval.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import {
    MAX_COMMAND_QUEUE_LENGTH,
    MAX_GAME_TICK_OPERATIONS,
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
    RAVLYK_INITIAL_ANGLE,
} from '../js/modules/constants.js';
import { runTest } from './testUtils.js';

const SOURCE_FILES = ['lessons.html', 'manual.html'];

const EXPECTATIONS = [
    { id: 'lesson1-forward', file: 'lessons.html', kind: 'runnable', primitiveCount: 1 },
    { id: 'lesson1-invalid-word-number', file: 'lessons.html', kind: 'invalid', errorKey: 'UNDEFINED_VARIABLE' },
    { id: 'lesson1-corrected-number', file: 'lessons.html', kind: 'runnable', primitiveCount: 1 },
    { id: 'lesson2-turn', file: 'lessons.html', kind: 'runnable', primitiveCount: 3 },
    // The lesson 2 exercise is meant to be broken: the last turn of 45° leaves the
    // square open, which is exactly what the child has to notice.
    { id: 'lesson2-buggy-square', file: 'lessons.html', kind: 'runnable', primitiveCount: 7, closesPath: false, totalTurn: 225 },
    { id: 'lesson3-color', file: 'lessons.html', kind: 'runnable', primitiveCount: 3 },
    { id: 'lesson4-square', file: 'lessons.html', kind: 'runnable', primitiveCount: 8, closesPath: true },
    // Three 90° turns cannot close a triangle; the answer text says to use 120°.
    { id: 'lesson4-buggy-triangle', file: 'lessons.html', kind: 'runnable', primitiveCount: 6, closesPath: false, totalTurn: 270 },
    { id: 'lesson5-circle', file: 'lessons.html', kind: 'runnable', primitiveCount: 73, closesPath: true },
    // The lesson asks which drawing self-intersects: the heptagon must not, the star must.
    { id: 'lesson5-heptagon', file: 'lessons.html', kind: 'runnable', primitiveCount: 14, closesPath: true, totalTurn: 360, intersects: false },
    { id: 'lesson5-seven-star', file: 'lessons.html', kind: 'runnable', primitiveCount: 14, closesPath: true, totalTurn: 720, intersects: true },
    { id: 'lesson6-dashed', file: 'lessons.html', kind: 'runnable', primitiveCount: 5 },
    // Without підняти/опустити the goto draws a connecting line: same shapes, two fewer primitives.
    { id: 'lesson6-buggy-connected-squares', file: 'lessons.html', kind: 'runnable', primitiveCount: 17 },
    { id: 'lesson6-corrected-pen-up', file: 'lessons.html', kind: 'runnable', primitiveCount: 19, primitiveCounts: { PenStmt: 2, GotoStmt: 1 } },
    { id: 'lesson7-variable', file: 'lessons.html', kind: 'runnable', primitiveCount: 1, variables: { сторона: 100 } },
    { id: 'lesson7-parameter-function', file: 'lessons.html', kind: 'runnable', primitiveCount: 16 },
    { id: 'lesson8-basic-if', file: 'lessons.html', kind: 'runnable', primitiveCount: 1, variables: { число: 7 } },
    { id: 'lesson8-modulo', file: 'lessons.html', kind: 'runnable', primitiveCount: 18, variables: { n: 6 }, closesPath: true },
    // The bug is the repeated `якщо`: on every even step both colours are applied
    // back to back, so червоний always wins and синій is never visible.
    {
        id: 'lesson8-buggy-duplicate-if',
        file: 'lessons.html',
        kind: 'runnable',
        primitiveCount: 24,
        variables: { n: 8 },
        closesPath: true,
        colorSequence: ['синій', 'червоний', 'синій', 'червоний', 'синій', 'червоний', 'синій', 'червоний'],
    },
    { id: 'lesson9-game', file: 'lessons.html', kind: 'runnable', gameTicks: 1, pressedKeys: ['arrowup'], primitiveCount: 1 },
    { id: 'lesson9-invalid-game-contract', file: 'lessons.html', kind: 'invalid', errorKey: 'GAME_MODE_TOP_LEVEL_ONLY' },
    { id: 'lesson9-corrected-game', file: 'lessons.html', kind: 'runnable', gameTicks: 1, pressedKeys: ['arrowup'], primitiveCount: 1, variables: { крок: 5 } },
    { id: 'manual-repeat-square', file: 'manual.html', kind: 'runnable', primitiveCount: 8, closesPath: true },
    { id: 'manual-math-functions', file: 'manual.html', kind: 'runnable', primitiveCount: 3, variables: { крок: 20 } },
    { id: 'manual-game-color-after20', file: 'manual.html', kind: 'runnable', gameTicks: 5, pressedKeys: ['arrowup'], primitiveCount: 5, variables: { кроки: 5 } },
    { id: 'manual-while', file: 'manual.html', kind: 'runnable', primitiveCount: 5, variables: { x: 5 } },
];

function decodeHtmlCode(raw) {
    return raw
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
        .replace(/&#([0-9]+);/g, (_, decimal) => String.fromCodePoint(Number.parseInt(decimal, 10)))
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/\r\n/g, '\n');
}

function extractMarkedExamples(file) {
    const html = fs.readFileSync(file, 'utf8');
    const examples = [];
    const marker = /<pre\b[^>]*\bdata-example-id="([^"]+)"[^>]*>/g;
    let match;

    while ((match = marker.exec(html)) !== null) {
        const openingTag = match[0];
        const kindMatch = openingTag.match(/\bdata-example-kind="(runnable|invalid|fragment)"/);
        assert.ok(kindMatch, `${file}: ${match[1]} must declare a supported data-example-kind`);
        const closeIndex = html.indexOf('</pre>', marker.lastIndex);
        assert.notEqual(closeIndex, -1, `${file}: ${match[1]} must close its pre element`);
        const rawCode = html.slice(marker.lastIndex, closeIndex);
        assert.doesNotMatch(rawCode, /<\/?[a-z][^>]*>/i, `${file}: ${match[1]} must contain plain code, not nested HTML`);
        examples.push({ id: match[1], kind: kindMatch[1], code: decodeHtmlCode(rawCode), file });
        marker.lastIndex = closeIndex + '</pre>'.length;
    }

    return examples;
}

const evalExpr = (expr, env) => evalAstNumberExpression(expr, env, { attachAstErrorLocation });

function makeRuntimeOptions(pressedKeys = new Set(), isAtCanvasEdge = () => false) {
    return {
        EnvironmentCtor: Environment,
        RavlykErrorCtor: RavlykError,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        maxCommandQueueLength: MAX_COMMAND_QUEUE_LENGTH,
        evalAstNumberExpression: evalExpr,
        evaluateCondition: (condition, env) => evaluateAstCondition(condition, {
            evalAstNumberExpression: evalExpr,
            env,
            isAtCanvasEdge,
            pressedKeys,
        }),
        attachAstErrorLocation,
    };
}

function resolvePrimitive(stmt, env) {
    if (stmt.type === 'MoveStmt') {
        return { type: stmt.type, direction: stmt.direction, value: evalExpr(stmt.distance, env) };
    }
    if (stmt.type === 'TurnStmt') {
        return { type: stmt.type, direction: stmt.direction, value: evalExpr(stmt.angle, env) };
    }
    if (stmt.type === 'ColorStmt' && stmt.colorArg?.kind === 'named') {
        return { type: stmt.type, color: stmt.colorArg.value };
    }
    return { type: stmt.type };
}

function countPrimitiveTypes(primitives) {
    const counts = {};
    for (const primitive of primitives) {
        counts[primitive.type] = (counts[primitive.type] || 0) + 1;
    }
    return counts;
}

function executeRegular(ast) {
    const runtime = createAstRuntime({ programAst: ast, ...makeRuntimeOptions() });
    const primitives = [];
    let item = runtime.step();
    while (item !== null) {
        assert.notEqual(item.stmt.type, 'GameStmt', 'game examples must use the bounded game runner');
        primitives.push(resolvePrimitive(item.stmt, item.env));
        item = runtime.step();
    }
    return { primitives, env: runtime.env };
}

function executeGame(ast, expectation) {
    const primitives = [];
    const pressedKeys = new Set(expectation.pressedKeys || []);
    let sharedEnv = null;
    const options = makeRuntimeOptions(pressedKeys);
    const runner = createGameAstRunner({
        programAst: ast,
        ...options,
        maxGameTickOperations: MAX_GAME_TICK_OPERATIONS,
        handlePrimitiveAstStatement: (stmt, env) => {
            sharedEnv = env;
            primitives.push(resolvePrimitive(stmt, env));
        },
    });
    for (let tick = 0; tick < expectation.gameTicks; tick++) runner.runGameTick();
    return { primitives, env: sharedEnv };
}

function simulateTrajectory(primitives) {
    let x = 0;
    let y = 0;
    let angle = RAVLYK_INITIAL_ANGLE;
    let totalTurn = 0;
    const segments = [];

    for (const primitive of primitives) {
        if (primitive.type === 'TurnStmt') {
            const signedTurn = primitive.direction === 'right' ? primitive.value : -primitive.value;
            angle += signedTurn;
            totalTurn += signedTurn;
        } else if (primitive.type === 'MoveStmt') {
            const signedDistance = primitive.direction === 'backward' ? -primitive.value : primitive.value;
            const radians = angle * Math.PI / 180;
            const nextX = x + Math.cos(radians) * signedDistance;
            const nextY = y + Math.sin(radians) * signedDistance;
            segments.push([{ x, y }, { x: nextX, y: nextY }]);
            x = nextX;
            y = nextY;
        }
    }
    return { x, y, totalTurn, segments };
}

function hasNonAdjacentIntersection(segments) {
    const orientation = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    for (let first = 0; first < segments.length; first++) {
        for (let second = first + 2; second < segments.length; second++) {
            if (first === 0 && second === segments.length - 1) continue;
            const [a, b] = segments[first];
            const [c, d] = segments[second];
            if (orientation(a, b, c) * orientation(a, b, d) < 0
                && orientation(c, d, a) * orientation(c, d, b) < 0) return true;
        }
    }
    return false;
}

const allExamples = SOURCE_FILES.flatMap(extractMarkedExamples);
const exampleById = new Map(allExamples.map((example) => [example.id, example]));

runTest('learning examples have unique stable ids and complete expectation metadata', () => {
    assert.equal(exampleById.size, allExamples.length, 'data-example-id values must be unique across learning pages');
    assert.deepEqual(
        [...exampleById.keys()].sort(),
        EXPECTATIONS.map((expectation) => expectation.id).sort(),
        'every marked example must have explicit test expectations',
    );
});

for (const expectation of EXPECTATIONS) {
    runTest(`learning example: ${expectation.id}`, () => {
        const example = exampleById.get(expectation.id);
        assert.ok(example, `${expectation.id} must exist in ${expectation.file}`);
        assert.equal(example.file, expectation.file);
        assert.equal(example.kind, expectation.kind);

        if (expectation.kind === 'fragment') return;

        let result;
        try {
            const ast = new RavlykParser().parseCodeToAst(example.code);
            result = expectation.gameTicks ? executeGame(ast, expectation) : executeRegular(ast);
        } catch (error) {
            if (expectation.kind !== 'invalid') throw error;
            assert.equal(error.messageKey, expectation.errorKey);
            return;
        }

        assert.notEqual(expectation.kind, 'invalid', `${expectation.id} should fail with ${expectation.errorKey}`);
        assert.equal(result.primitives.length, expectation.primitiveCount);
        for (const [name, value] of Object.entries(expectation.variables || {})) {
            assert.ok(result.env, `${expectation.id} must expose its shared environment`);
            assert.equal(result.env.get(name), value);
        }

        for (const [type, count] of Object.entries(expectation.primitiveCounts || {})) {
            assert.equal(countPrimitiveTypes(result.primitives)[type], count, `${expectation.id} must emit ${count} ${type}`);
        }

        if (expectation.colorSequence) {
            const colors = result.primitives
                .filter((primitive) => primitive.type === 'ColorStmt')
                .map((primitive) => primitive.color);
            assert.deepEqual(colors, expectation.colorSequence);
        }

        if (expectation.closesPath != null || expectation.totalTurn != null || expectation.intersects != null) {
            const trajectory = simulateTrajectory(result.primitives);
            if (expectation.closesPath != null) {
                assert.equal(
                    Math.hypot(trajectory.x, trajectory.y) <= 1e-6,
                    expectation.closesPath,
                    `${expectation.id} must ${expectation.closesPath ? 'close' : 'stay open'} within tolerance`,
                );
            }
            if (expectation.totalTurn != null) {
                assert.ok(Math.abs(trajectory.totalTurn - expectation.totalTurn) <= 1e-9);
                // Deliberately broken examples do not return to the starting angle.
                if (expectation.closesPath !== false) {
                    assert.ok(Math.abs(trajectory.totalTurn % 360) <= 1e-9, `${expectation.id} must finish at its normalized starting angle`);
                }
            }
            if (expectation.intersects != null) {
                assert.equal(hasNonAdjacentIntersection(trajectory.segments), expectation.intersects);
            }
        }
    });
}
