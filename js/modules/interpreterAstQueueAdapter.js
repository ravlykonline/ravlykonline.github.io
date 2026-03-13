function cloneAstExpression(expr) {
    if (!expr || !expr.type) return expr;
    if (expr.type === 'NumberLiteral' || expr.type === 'Identifier') {
        return { ...expr };
    }
    if (expr.type === 'UnaryExpr') {
        return {
            ...expr,
            expr: cloneAstExpression(expr.expr),
        };
    }
    if (expr.type === 'BinaryExpr') {
        return {
            ...expr,
            left: cloneAstExpression(expr.left),
            right: cloneAstExpression(expr.right),
        };
    }
    return { ...expr };
}

function convertConditionToRuntime(condition) {
    if (!condition || !condition.type) return null;
    if (condition.type === 'EdgeCondition') return { type: 'EDGE' };
    if (condition.type === 'KeyCondition') return { type: 'KEY', key: condition.key };
    if (condition.type === 'CompareCondition') {
        return {
            type: 'COMPARE_AST',
            op: condition.op,
            left: cloneAstExpression(condition.left),
            right: cloneAstExpression(condition.right),
        };
    }
    return null;
}

export function astProgramToLegacyQueue({
    programAst,
    emitAssignments = false,
    EnvironmentCtor,
    maxRecursionDepth,
    maxRepeatsInLoop,
    evalAstNumberExpression,
    handlePrimitiveAstStatement,
    attachAstErrorLocation,
    createError,
}) {
    if (!programAst || programAst.type !== 'Program' || !Array.isArray(programAst.body)) {
        return [];
    }

    const output = [];
    const functionDefs = new Map();
    const rootEnv = new EnvironmentCtor(null);

    const runStmt = (stmt, env, out, callDepth) => {
        if (!stmt || !stmt.type) return;
        try {
            if (stmt.type === 'AssignmentStmt') {
                const value = evalAstNumberExpression(stmt.expr, env);
                if (!Number.isFinite(value)) {
                    throw createError('VARIABLE_VALUE_INVALID', stmt.name, String(value));
                }
                env.set(stmt.name, value);
                if (emitAssignments) {
                    out.push({
                        type: 'ASSIGN_AST',
                        name: stmt.name,
                        expr: cloneAstExpression(stmt.expr),
                        original: '=',
                    });
                }
                return;
            }

            if (stmt.type === 'FunctionDefStmt') {
                functionDefs.set(stmt.name, stmt);
                return;
            }

            if (stmt.type === 'FunctionCallStmt') {
                const def = functionDefs.get(stmt.name);
                if (!def) {
                    throw createError('UNKNOWN_COMMAND', stmt.name);
                }
                if (callDepth > maxRecursionDepth) {
                    throw createError('TOO_MANY_NESTED_REPEATS');
                }
                const localEnv = new EnvironmentCtor(env);
                for (let idx = 0; idx < def.params.length; idx++) {
                    const paramName = def.params[idx];
                    const argExpr = stmt.args[idx];
                    const argValue = evalAstNumberExpression(argExpr, env);
                    if (!Number.isFinite(argValue)) {
                        throw createError('FUNCTION_ARGUMENT_INVALID', stmt.name, String(argValue));
                    }
                    localEnv.define(paramName, argValue);
                }
                for (const nested of def.body || []) {
                    runStmt(nested, localEnv, out, callDepth + 1);
                }
                return;
            }

            if (handlePrimitiveAstStatement(stmt, env, 'queue', out)) {
                return;
            }

            if (stmt.type === 'RepeatStmt') {
                const countValue = evalAstNumberExpression(stmt.count, env);
                if (!Number.isInteger(countValue) || countValue < 0) {
                    throw createError('INVALID_REPEAT_COUNT', String(countValue));
                }
                if (countValue > maxRepeatsInLoop) {
                    throw createError('TOO_MANY_REPEATS_IN_LOOP');
                }
                for (let idx = 0; idx < countValue; idx++) {
                    for (const nested of stmt.body || []) {
                        runStmt(nested, env, out, callDepth);
                    }
                }
                return;
            }

            if (stmt.type === 'IfStmt') {
                const thenCommands = [];
                const elseCommands = [];
                const thenEnv = env.clone();
                const elseEnv = env.clone();
                for (const nested of stmt.thenBody || []) runStmt(nested, thenEnv, thenCommands, callDepth);
                for (const nested of stmt.elseBody || []) runStmt(nested, elseEnv, elseCommands, callDepth);
                out.push({
                    type: 'IF',
                    condition: convertConditionToRuntime(stmt.condition),
                    thenCommands,
                    elseCommands,
                    original: 'якщо',
                });
                return;
            }

            if (stmt.type === 'GameStmt') {
                throw createError('GAME_NOT_SUPPORTED_HERE');
            }
        } catch (error) {
            attachAstErrorLocation(error, stmt);
            throw error;
        }
    };

    for (const stmt of programAst.body) {
        runStmt(stmt, rootEnv, output, 0);
    }

    return output;
}
