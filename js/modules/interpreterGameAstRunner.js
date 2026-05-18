import { createAstRuntime } from './interpreterAstRuntime.js';

export function createGameAstRunner({
    programAst,
    EnvironmentCtor,
    RavlykErrorCtor,
    maxRecursionDepth,
    maxRepeatsInLoop,
    evalAstNumberExpression,
    handlePrimitiveAstStatement,
    evaluateCondition,
    attachAstErrorLocation,
}) {
    const runtimeOptions = {
        EnvironmentCtor,
        RavlykErrorCtor,
        maxRecursionDepth,
        maxRepeatsInLoop,
        evalAstNumberExpression,
        evaluateCondition,
        attachAstErrorLocation,
    };

    // Init phase: run top-level statements, collect function defs and game body.
    const initRuntime = createAstRuntime({ programAst, ...runtimeOptions });
    const gameBodies = [];

    let primitive = initRuntime.step();
    while (primitive !== null) {
        if (primitive.stmt.type === 'GameStmt') {
            gameBodies.push(primitive.stmt.body || []);
        } else {
            // Non-game primitives at top level are allowed (e.g. drawing before грати)
            handlePrimitiveAstStatement(primitive.stmt, primitive.env, 'immediate');
        }
        primitive = initRuntime.step();
    }

    if (gameBodies.length === 0) {
        throw new RavlykErrorCtor('GAME_NOT_SUPPORTED_HERE');
    }

    const sharedEnv = initRuntime.env;
    const sharedFunctionDefs = initRuntime.functionDefs;

    const runGameTick = () => {
        for (const body of gameBodies) {
            const tickRuntime = createAstRuntime({
                programAst: { type: 'Program', body },
                initialEnv: sharedEnv,
                initialFunctionDefs: sharedFunctionDefs,
                ...runtimeOptions,
            });

            let step = tickRuntime.step();
            while (step !== null) {
                handlePrimitiveAstStatement(step.stmt, step.env, 'immediate');
                step = tickRuntime.step();
            }
        }
    };

    return { runGameTick };
}
