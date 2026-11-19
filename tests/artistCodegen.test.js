import assert from 'node:assert/strict';
import { RavlykParser } from '../js/modules/ravlykParser.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';
import { createAstRuntime } from '../js/modules/interpreterAstRuntime.js';
import { Environment } from '../js/modules/environment.js';
import { RavlykError } from '../js/modules/ravlykParser.js';
import { attachAstErrorLocation, evalAstNumberExpression } from '../js/modules/interpreterAstEval.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import {
    COLOR_REGISTRY,
    MAX_COMMAND_QUEUE_LENGTH,
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
} from '../js/modules/constants.js';
import { lessons } from '../artist/js/data/lessons.js';
import { COLORS, colorHex } from '../artist/js/data/colors.js';
import { blk, withIds } from '../artist/js/core/blockTree.js';
import { buildProgramCode, programToText } from '../artist/js/core/codegen.js';
import { runProgram } from '../artist/js/runtime/runner.js';
import { runTest } from './testUtils.js';

const TOLERANCE = 0.5;
const evalExpr = (expr, env) => evalAstNumberExpression(expr, env, { attachAstErrorLocation });

function runRavlykCode(code) {
    const ast = validateProgramAst(new RavlykParser().parseCodeToAst(code));
    const runtime = createAstRuntime({
        programAst: ast,
        EnvironmentCtor: Environment,
        RavlykErrorCtor: RavlykError,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        maxCommandQueueLength: MAX_COMMAND_QUEUE_LENGTH,
        maxAstSteps: MAX_COMMAND_QUEUE_LENGTH,
        evalAstNumberExpression: evalExpr,
        evaluateCondition: (condition, env) => evaluateAstCondition(condition, {
            evalAstNumberExpression: evalExpr,
            env,
            isAtCanvasEdge: () => false,
            pressedKeys: new Set(),
        }),
        attachAstErrorLocation,
    });

    const primitives = [];
    for (let item = runtime.step(); item !== null; item = runtime.step()) {
        const { stmt, env } = item;
        if (stmt.type === 'MoveStmt') {
            primitives.push({ type: stmt.type, direction: stmt.direction, value: evalExpr(stmt.distance, env) });
        } else if (stmt.type === 'TurnStmt') {
            primitives.push({ type: stmt.type, direction: stmt.direction, value: evalExpr(stmt.angle, env) });
        } else if (stmt.type === 'GotoStmt') {
            primitives.push({ type: stmt.type, x: evalExpr(stmt.x, env), y: evalExpr(stmt.y, env) });
        } else if (stmt.type === 'ColorStmt') {
            primitives.push({ type: stmt.type, color: stmt.colorArg.value });
        } else if (stmt.type === 'PenStmt') {
            primitives.push({ type: stmt.type, mode: stmt.mode });
        } else {
            primitives.push({ type: stmt.type });
        }
    }
    return primitives;
}

/**
 * Виконує примітиви РАВЛИК і повертає відрізки в КООРДИНАТАХ ГРИ (y вниз).
 * `перейти в x y` має y вгору, тому y інвертується; рух і повороти — відносні.
 */
function toGameSegments(primitives) {
    let x = 0;
    let y = 0;
    let heading = 0; // 0 = вгору, 90 = праворуч (як у грі й у РАВЛИК за замовчуванням)
    let penDown = true;
    let color = '#1A1A1A'; // чорний за замовчуванням у РАВЛИК
    const segments = [];

    for (const primitive of primitives) {
        if (primitive.type === 'TurnStmt') {
            heading += primitive.direction === 'right' ? primitive.value : -primitive.value;
        } else if (primitive.type === 'MoveStmt') {
            const distance = primitive.direction === 'backward' ? -primitive.value : primitive.value;
            const radians = (heading - 90) * Math.PI / 180;
            const nx = x + Math.cos(radians) * distance;
            const ny = y + Math.sin(radians) * distance;
            if (penDown) segments.push({ from: [x, y], to: [nx, ny], color });
            x = nx;
            y = ny;
        } else if (primitive.type === 'GotoStmt') {
            const nx = primitive.x;
            const ny = -primitive.y;
            if (penDown) segments.push({ from: [x, y], to: [nx, ny], color });
            x = nx;
            y = ny;
        } else if (primitive.type === 'PenStmt') {
            penDown = primitive.mode === 'down';
        } else if (primitive.type === 'ColorStmt') {
            color = colorHex(primitive.color);
        }
    }
    return segments;
}

function assertSameSegments(actual, expected, label) {
    assert.equal(actual.length, expected.length, `${label}: кількість відрізків`);
    expected.forEach((segment, index) => {
        const other = actual[index];
        for (let k = 0; k < 2; k += 1) {
            assert.ok(Math.abs(other.from[k] - segment.from[k]) <= TOLERANCE, `${label}: відрізок ${index} from[${k}] ${other.from[k]} ≠ ${segment.from[k]}`);
            assert.ok(Math.abs(other.to[k] - segment.to[k]) <= TOLERANCE, `${label}: відрізок ${index} to[${k}] ${other.to[k]} ≠ ${segment.to[k]}`);
        }
        assert.equal(other.color.toUpperCase(), segment.color.toUpperCase(), `${label}: колір відрізка ${index}`);
    });
}

function assertCodeMatchesEngine(lesson, tree, label) {
    const workspace = withIds(tree);
    const code = programToText(buildProgramCode(lesson, workspace));
    assert.doesNotMatch(code, /коли запущено/, `${label}: коли запущено`);
    assert.doesNotMatch(code, /разів \{/, `${label}: разів {`);
    assert.doesNotMatch(code, /рухатися\(/, `${label}: рухатися(`);

    const ravlykSegments = toGameSegments(runRavlykCode(code));
    const gameSegments = runProgram(workspace, lesson).segments;
    assertSameSegments(ravlykSegments, gameSegments, `${label}\n${code}`);
}

runTest('artist colors match core colors of the РАВЛИК COLOR_REGISTRY', () => {
    for (const { name, hex } of COLORS) {
        const entry = COLOR_REGISTRY.find((item) => item.name === name);
        assert.ok(entry, `${name} має бути в COLOR_REGISTRY`);
        assert.equal(entry.core, true, `${name} має бути core-кольором`);
        assert.equal(entry.hex.toUpperCase(), hex.toUpperCase(), `${name}: hex`);
    }
});

for (const lesson of lessons) {
    if (!lesson.solution) continue;
    runTest(`artist codegen: ${lesson.id} solution runs in real РАВЛИК and draws the same segments`, () => {
        assertCodeMatchesEngine(lesson, lesson.solution, lesson.id);
    });
}

const origin = { start: { x: 0, y: 0, heading: 0 }, pen: { color: 'чорний', width: 1 } };

const SAMPLE_PROGRAMS = [
    {
        name: 'every block type',
        lesson: { start: { x: -100, y: 50, heading: 90 }, pen: { color: 'зелений', width: 4 } },
        tree: [
            blk('step'), blk('turn_right90'), blk('turn_left90'), blk('forward', 30), blk('back', 10),
            blk('right', 45), blk('left', 15), blk('pen_up'), blk('forward', 20), blk('pen_down'),
            blk('color', 'фіолетовий'), blk('forward', 40),
        ],
    },
    {
        name: 'nested repeat (flower)',
        lesson: origin,
        tree: [blk('repeat', 6, [blk('repeat', 4, [blk('forward', 60), blk('right', 90)]), blk('right', 60)])],
    },
    {
        name: 'circle with 36 repeats',
        lesson: { start: { x: 0, y: 50, heading: 0 }, pen: { color: 'синій', width: 2 } },
        tree: [blk('repeat', 36, [blk('forward', 10), blk('right', 10)])],
    },
    {
        name: 'heading 270 and upper-half start (y inversion)',
        lesson: { start: { x: 50, y: -50, heading: 270 }, pen: { color: 'червоний', width: 4 } },
        tree: [blk('forward', 100), blk('left', 90), blk('back', 30), blk('color', 'жовтий'), blk('forward', 20)],
    },
    {
        name: 'colors in a loop',
        lesson: { start: { x: -50, y: 50, heading: 0 }, pen: { color: 'чорний', width: 4 } },
        tree: [blk('repeat', 3, [blk('color', 'рожевий'), blk('forward', 50), blk('color', 'коричневий'), blk('right', 90)])],
    },
];

for (const sample of SAMPLE_PROGRAMS) {
    runTest(`artist codegen: ${sample.name}`, () => {
        assertCodeMatchesEngine(sample.lesson, sample.tree, sample.name);
    });
}

runTest('artist codegen: y is inverted in «перейти в»', () => {
    const code = programToText(buildProgramCode({ start: { x: -100, y: 100, heading: 0 } }, []));
    assert.match(code, /перейти в -100 -100/);
    const [goto] = runRavlykCode(code).filter((p) => p.type === 'GotoStmt');
    assert.deepEqual([goto.x, goto.y], [-100, -100]);
    // точка гри (-100, 100) — нижній лівий бік поля → у РАВЛИК y вгору дорівнює -100
});
