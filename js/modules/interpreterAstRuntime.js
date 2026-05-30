// Frame-based AST runtime. Handles all control flow internally.
// Primitive (drawing) statements are returned to the caller via step().
// A single env object is shared across all frames — no cloning.
// This means variable assignments always propagate correctly across IF/else bodies.

export function createAstRuntime({
    programAst,
    EnvironmentCtor,
    RavlykErrorCtor,
    maxRecursionDepth,
    maxRepeatsInLoop,
    maxCommandQueueLength,
    maxAstSteps = null,         // total statement budget (counts every stmt, not just primitives)
    maxAstStepsErrorKey = null, // error key to throw when maxAstSteps exceeded
    evalAstNumberExpression,
    evaluateCondition,
    attachAstErrorLocation,
    initialEnv = null,
    initialFunctionDefs = null,
}) {
    const rootEnv = initialEnv || new EnvironmentCtor(null);
    const functionDefs = initialFunctionDefs ? new Map(initialFunctionDefs) : new Map();
    const frameStack = [{ stmts: programAst.body || [], index: 0, env: rootEnv, type: 'program' }];
    let callDepth = 0;
    let stepCount = 0;
    let astStepCount = 0;

    function isDone() {
        return frameStack.length === 0;
    }

    function consumeAstBudget() {
        if (maxAstSteps == null) return;

        astStepCount++;
        if (astStepCount > maxAstSteps) {
            throw new RavlykErrorCtor(maxAstStepsErrorKey || 'COMMAND_QUEUE_OVERFLOW');
        }
    }

    function breakNearestLoop() {
        for (let i = frameStack.length - 1; i >= 0; i--) {
            const frameType = frameStack[i].type;
            if (frameType === 'repeat' || frameType === 'while') {
                frameStack.length = i;
                return;
            }
            if (frameType === 'function' || frameType === 'program') {
                break;
            }
        }
        throw new RavlykErrorCtor('BREAK_OUTSIDE_LOOP');
    }

    // Returns the next primitive statement to execute as { stmt, env },
    // or null when the program is finished.
    // All control-flow statements (assign, funcdef, funccall, repeat, if) are
    // processed internally without returning to the caller.
    function step() {
        while (frameStack.length > 0) {
            const topFrame = frameStack[frameStack.length - 1];

            if (topFrame.index >= topFrame.stmts.length) {
                if (topFrame.type === 'while') {
                    try {
                        consumeAstBudget();
                        if (evaluateCondition(topFrame.condition, topFrame.env)) {
                            topFrame.index = 0;
                            continue;
                        }
                    } catch (error) {
                        attachAstErrorLocation(error, topFrame.conditionStmt);
                        throw error;
                    }
                }
                if (topFrame.type === 'repeat' && topFrame.remaining > 0) {
                    topFrame.remaining--;
                    topFrame.index = 0;
                    continue;
                }
                frameStack.pop();
                if (topFrame.type === 'function') callDepth--;
                continue;
            }

            const stmt = topFrame.stmts[topFrame.index];
            topFrame.index++;

            try {
                // Count every statement (assignments, control-flow, primitives)
                // so maxAstSteps covers total AST work, not just primitive output.
                consumeAstBudget();

                if (stmt.type === 'AssignmentStmt') {
                    const value = evalAstNumberExpression(stmt.expr, topFrame.env);
                    if (!Number.isFinite(value)) {
                        throw new RavlykErrorCtor('VARIABLE_VALUE_INVALID', stmt.name, String(value));
                    }
                    topFrame.env.set(stmt.name, value);
                    continue;
                }

                if (stmt.type === 'FunctionDefStmt') {
                    functionDefs.set(stmt.name, stmt);
                    continue;
                }

                if (stmt.type === 'FunctionCallStmt') {
                    const def = functionDefs.get(stmt.name);
                    if (!def) throw new RavlykErrorCtor('UNKNOWN_COMMAND', stmt.name);
                    if (callDepth >= maxRecursionDepth) throw new RavlykErrorCtor('TOO_MANY_NESTED_REPEATS');
                    const localEnv = new EnvironmentCtor(topFrame.env);
                    for (let i = 0; i < def.params.length; i++) {
                        const argValue = evalAstNumberExpression(stmt.args[i] || null, topFrame.env);
                        if (!Number.isFinite(argValue)) {
                            throw new RavlykErrorCtor('FUNCTION_ARGUMENT_INVALID', stmt.name, String(argValue));
                        }
                        localEnv.define(def.params[i], argValue);
                    }
                    callDepth++;
                    frameStack.push({ stmts: def.body || [], index: 0, env: localEnv, type: 'function' });
                    continue;
                }

                if (stmt.type === 'RepeatStmt') {
                    const count = evalAstNumberExpression(stmt.count, topFrame.env);
                    if (!Number.isInteger(count) || count < 0) {
                        throw new RavlykErrorCtor('INVALID_REPEAT_COUNT', String(count));
                    }
                    if (count > maxRepeatsInLoop) {
                        throw new RavlykErrorCtor('TOO_MANY_REPEATS_IN_LOOP');
                    }
                    if (count > 0 && stmt.body && stmt.body.length > 0) {
                        frameStack.push({ stmts: stmt.body, index: 0, env: topFrame.env, type: 'repeat', remaining: count - 1 });
                    }
                    continue;
                }

                if (stmt.type === 'WhileStmt') {
                    if (evaluateCondition(stmt.condition, topFrame.env)) {
                        frameStack.push({
                            stmts: stmt.body || [],
                            index: 0,
                            env: topFrame.env,
                            type: 'while',
                            condition: stmt.condition,
                            conditionStmt: stmt,
                        });
                    }
                    continue;
                }

                if (stmt.type === 'BreakStmt') {
                    breakNearestLoop();
                    continue;
                }

                if (stmt.type === 'IfStmt') {
                    const branch = evaluateCondition(stmt.condition, topFrame.env)
                        ? (stmt.thenBody || [])
                        : (stmt.elseBody || []);
                    if (branch.length > 0) {
                        // Share the same env — variable changes in branch propagate outward.
                        frameStack.push({ stmts: branch, index: 0, env: topFrame.env, type: 'if' });
                    }
                    continue;
                }

                // Primitive (drawing) statement or GameStmt — return to caller.
                if (maxCommandQueueLength != null) {
                    stepCount++;
                    if (stepCount > maxCommandQueueLength) {
                        throw new RavlykErrorCtor('COMMAND_QUEUE_OVERFLOW');
                    }
                }

                return { stmt, env: topFrame.env };

            } catch (error) {
                attachAstErrorLocation(error, stmt);
                throw error;
            }
        }

        return null;
    }

    return { step, isDone, env: rootEnv, functionDefs };
}
