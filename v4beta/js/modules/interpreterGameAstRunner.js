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
    const env = new EnvironmentCtor(null);
    const functionDefs = new Map();
    const gameBodies = [];

    const runStmt = (stmt, envCtx, callDepth = 0) => {
        if (!stmt || !stmt.type) return;
        try {
            if (callDepth > maxRecursionDepth) throw new RavlykErrorCtor('TOO_MANY_NESTED_REPEATS');

            if (stmt.type === 'AssignmentStmt') {
                const value = evalAstNumberExpression(stmt.expr, envCtx);
                if (!Number.isFinite(value)) {
                    throw new RavlykErrorCtor('VARIABLE_VALUE_INVALID', stmt.name, String(value));
                }
                envCtx.set(stmt.name, value);
                return;
            }

            if (stmt.type === 'FunctionDefStmt') {
                functionDefs.set(stmt.name, stmt);
                return;
            }

            if (stmt.type === 'FunctionCallStmt') {
                const def = functionDefs.get(stmt.name);
                if (!def) throw new RavlykErrorCtor('UNKNOWN_COMMAND', stmt.name);
                const localEnv = new EnvironmentCtor(envCtx);
                for (let idx = 0; idx < def.params.length; idx++) {
                    const argValue = evalAstNumberExpression(stmt.args[idx], envCtx);
                    if (!Number.isFinite(argValue)) {
                        throw new RavlykErrorCtor('FUNCTION_ARGUMENT_INVALID', stmt.name, String(argValue));
                    }
                    localEnv.define(def.params[idx], argValue);
                }
                for (const nested of def.body || []) runStmt(nested, localEnv, callDepth + 1);
                return;
            }

            if (handlePrimitiveAstStatement(stmt, envCtx, 'immediate')) {
                return;
            }

            if (stmt.type === 'RepeatStmt') {
                const countValue = evalAstNumberExpression(stmt.count, envCtx);
                if (!Number.isInteger(countValue) || countValue < 0) {
                    throw new RavlykErrorCtor('INVALID_REPEAT_COUNT', String(countValue));
                }
                if (countValue > maxRepeatsInLoop) {
                    throw new RavlykErrorCtor('TOO_MANY_REPEATS_IN_LOOP');
                }
                for (let i = 0; i < countValue; i++) {
                    for (const nested of stmt.body || []) runStmt(nested, envCtx, callDepth);
                }
                return;
            }

            if (stmt.type === 'IfStmt') {
                const selected = evaluateCondition(stmt.condition, envCtx) ? (stmt.thenBody || []) : (stmt.elseBody || []);
                for (const nested of selected) runStmt(nested, envCtx, callDepth);
                return;
            }

            if (stmt.type === 'GameStmt') {
                gameBodies.push(stmt.body || []);
            }
        } catch (error) {
            attachAstErrorLocation(error, stmt);
            throw error;
        }
    };

    for (const stmt of programAst.body || []) {
        runStmt(stmt, env, 0);
    }

    if (gameBodies.length === 0) {
        throw new RavlykErrorCtor('GAME_NOT_SUPPORTED_HERE');
    }

    const runGameTick = () => {
        for (const body of gameBodies) {
            for (const stmt of body) {
                runStmt(stmt, env, 0);
            }
        }
    };

    return {
        runGameTick,
    };
}
