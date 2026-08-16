import { Environment } from '../js/modules/environment.js';
import { createAstRuntime } from '../js/modules/interpreterAstRuntime.js';
import { evaluateAstCondition } from '../js/modules/interpreterConditions.js';
import {
    MAX_COMMAND_QUEUE_LENGTH,
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
} from '../js/modules/constants.js';
import { RavlykError } from '../js/modules/ravlykParser.js';
import { validateProgramAst } from '../js/modules/semanticValidator.js';

export function parseValidatedTokens(interpreter, tokens, tokenMeta = null) {
    const ast = interpreter.parseTokensToAst(tokens, 0, {}, tokenMeta);
    return validateProgramAst(ast);
}

export function collectTokenPrimitives(interpreter, tokens, options = {}) {
    const ast = parseValidatedTokens(interpreter, tokens, options.tokenMeta || null);
    return collectAstRuntimePrimitives(interpreter, ast, options);
}

// Numeric expressions are evaluated against the live AST environment. Random
// arguments intentionally stay symbolic here; deterministic RNG behavior belongs
// to randomResolver.test.js and executeCommands integration tests.
export function collectAstRuntimePrimitives(interpreter, programAst, options = {}) {
    const evalExpression = options.evalAstNumberExpression
        || ((expr, env) => interpreter.evalAstNumberExpression(expr, env));
    const runtime = createAstRuntime({
        programAst,
        EnvironmentCtor: Environment,
        RavlykErrorCtor: RavlykError,
        maxRecursionDepth: options.maxRecursionDepth ?? MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: options.maxRepeatsInLoop ?? MAX_REPEATS_IN_LOOP,
        maxCommandQueueLength: options.maxCommandQueueLength ?? MAX_COMMAND_QUEUE_LENGTH,
        maxAstSteps: options.maxAstSteps ?? MAX_COMMAND_QUEUE_LENGTH,
        maxAstStepsErrorKey: options.maxAstStepsErrorKey || 'COMMAND_QUEUE_OVERFLOW',
        evalAstNumberExpression: evalExpression,
        evaluateCondition: options.evaluateCondition || ((condition, env) => evaluateAstCondition(condition, {
            evalAstNumberExpression: evalExpression,
            env,
            isAtCanvasEdge: () => interpreter.isAtCanvasEdge(),
            pressedKeys: interpreter.pressedKeys,
        })),
        attachAstErrorLocation: (error, node) => interpreter.attachAstErrorLocation(error, node),
    });

    const primitives = [];
    for (let item = runtime.step(); item !== null; item = runtime.step()) {
        // Exercise the same per-primitive validation/conversion boundary used by
        // the production animation path, without building a program-wide queue.
        interpreter.handlePrimitiveAstStatement(item.stmt, item.env, 'queue', []);
        primitives.push(resolvePrimitive(item.stmt, item.env, evalExpression));
    }
    return primitives;
}

function resolvePrimitive(stmt, env, evalExpression) {
    const primitive = { type: stmt.type };

    if (stmt.type === 'MoveStmt') {
        primitive.direction = stmt.direction;
        if (stmt.distance?.kind === 'random') {
            primitive.random = true;
        } else {
            primitive.value = evalExpression(stmt.distance, env);
        }
    } else if (stmt.type === 'TurnStmt') {
        primitive.direction = stmt.direction;
        primitive.value = evalExpression(stmt.angle, env);
    } else if (stmt.type === 'GotoStmt') {
        if (stmt.target?.kind === 'random') {
            primitive.random = true;
        } else {
            primitive.x = evalExpression(stmt.x, env);
            primitive.y = evalExpression(stmt.y, env);
        }
    } else if (stmt.type === 'WaitStmt') {
        primitive.value = evalExpression(stmt.duration, env);
    } else if (stmt.type === 'ColorStmt' || stmt.type === 'BackgroundStmt') {
        primitive.colorArg = { ...stmt.colorArg };
    } else if (stmt.type === 'ThicknessStmt') {
        primitive.value = stmt.thickness;
    } else if (stmt.type === 'PenStmt' || stmt.type === 'EmbroideryStmt') {
        primitive.mode = stmt.mode;
    } else if (stmt.type === 'VisibilityStmt') {
        primitive.visible = stmt.visible;
    }

    return primitive;
}
