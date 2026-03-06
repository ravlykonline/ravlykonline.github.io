import {
    COLOR_MAP,
    ERROR_MESSAGES,
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
} from './constants.js';
import { RavlykError } from './ravlykParser.js';
import { Environment } from './environment.js';
import { evaluateAstCondition, evaluateRuntimeIfCondition } from './interpreterConditions.js';
import { startGameLoopRuntime } from './interpreterGameLoop.js';
import { createGameAstRunner } from './interpreterGameAstRunner.js';
import { runCommandQueueRuntime } from './interpreterQueueRuntime.js';
import { executeInterpreterCommand } from './interpreterCommandExecutor.js';
import { astProgramToLegacyQueue } from './interpreterAstQueueAdapter.js';
import { hasGameStatement, validateGameProgramContract } from './interpreterGameContract.js';
import { handlePrimitiveAstStatement } from './interpreterPrimitiveStatements.js';
import {
    animatePen as animatePenHelper,
    animateMove as animateMoveHelper,
    animateTurn as animateTurnHelper,
} from './interpreterAnimation.js';
import {
    performMove,
    performTurn,
    setColor as setColorHelper,
    clearScreen as clearScreenHelper,
    performGoto as performGotoHelper,
} from './interpreterDrawingOps.js';
import { cloneInterpreterCommand } from './interpreterCommandClone.js';

export function handlePrimitiveAstStatementRuntime(runtime, stmt, env, mode, outputQueue = null) {
    return handlePrimitiveAstStatement({
        stmt,
        env,
        mode,
        outputQueue,
        state: runtime.state,
        evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
        createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        performMove: (distance) => performMove({
            distance,
            state: runtime.state,
            ctx: runtime.ctx,
            clampToCanvasBounds: (x, y) => runtime.clampToCanvasBounds(x, y),
            applyContextSettings: () => runtime.applyContextSettings(),
        }),
        performTurn: (angle) => performTurn({ angle, state: runtime.state }),
        setColor: (colorName) => runtime.setColor(colorName),
        performGoto: (x, y) => runtime.performGoto(x, y),
        clearScreen: () => runtime.clearScreen(),
    });
}

export function astToLegacyQueueRuntime(runtime, programAst, options = {}) {
    return astProgramToLegacyQueue({
        programAst,
        emitAssignments: !!options.emitAssignments,
        EnvironmentCtor: Environment,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
        handlePrimitiveAstStatement: (stmt, envRef, mode, out) => runtime.handlePrimitiveAstStatement(stmt, envRef, mode, out),
        attachAstErrorLocation: (error, node) => runtime.attachAstErrorLocation(error, node),
        createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
    });
}

export function validateGameProgramContractRuntime(programAst) {
    return validateGameProgramContract(programAst, {
        createError: (messageKey) => new RavlykError(messageKey),
        hasGameStatementFn: hasGameStatement,
    });
}

export function executeGameProgramRuntime(runtime, programAst) {
    const gameAstRunner = createGameAstRunner({
        programAst,
        EnvironmentCtor: Environment,
        RavlykErrorCtor: RavlykError,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
        handlePrimitiveAstStatement: (stmt, envCtx, mode) => runtime.handlePrimitiveAstStatement(stmt, envCtx, mode),
        evaluateCondition: (condition, envCtx) => evaluateAstCondition(condition, {
            evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
            env: envCtx,
            isAtCanvasEdge: () => runtime.isAtCanvasEdge(),
            pressedKeys: runtime.pressedKeys,
        }),
        attachAstErrorLocation: (error, stmt) => runtime.attachAstErrorLocation(error, stmt),
    });

    runtime.commandIndicatorUpdater("грати (...)", 0);
    runtime.updateRavlykVisualState(true);

    return startGameLoopRuntime(runtime, {
        gameTickMs: runtime.config.gameTickMs,
        shouldStop: () => runtime.shouldStop,
        isPaused: () => runtime.isPaused,
        onStopRequested: () => {
            runtime.commandIndicatorUpdater(null, -1);
            runtime.stopGameLoop(new RavlykError("EXECUTION_STOPPED_BY_USER"));
        },
        onTick: () => {
            gameAstRunner.runGameTick();
            runtime.updateRavlykVisualState(true);
        },
        onError: (error) => {
            runtime.commandIndicatorUpdater(null, -1);
            runtime.stopGameLoop(error);
        },
    });
}

export async function executeCommandsRuntime(runtime, commandsString) {
    if (runtime.isExecuting) {
        throw new RavlykError("EXECUTION_IN_PROGRESS");
    }

    runtime.isExecuting = true;
    runtime.shouldStop = false;
    runtime.isPaused = false;
    runtime.currentCommandIndex = 0;
    runtime.boundaryWarningShown = false;
    runtime.parser.resetUserState();

    try {
        const programAst = runtime.parser.parseCodeToAst(commandsString);
        runtime.validateGameProgramContract(programAst);
        if (hasGameStatement(programAst)) {
            return await runtime.executeGameProgram(programAst);
        }
        runtime.commandQueue = runtime.astToLegacyQueue(programAst, {
            emitAssignments: true,
        });
        runtime.executionEnv = new Environment(null);
        return await runtime.runCommandQueue();
    } catch (error) {
        runtime.isExecuting = false;
        runtime.commandIndicatorUpdater(null, -1);
        throw error;
    } finally {
        runtime.isExecuting = false;
        runtime.commandIndicatorUpdater(null, -1);
    }
}

export function evaluateIfConditionRuntime(runtime, condition) {
    const evalEnv = runtime.executionEnv || new Environment(null);
    return evaluateRuntimeIfCondition(condition, {
        evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
        executionEnv: evalEnv,
        isAtCanvasEdge: () => runtime.isAtCanvasEdge(),
        pressedKeys: runtime.pressedKeys,
    });
}

export function runCommandQueueWithRuntime(runtime) {
    return runCommandQueueRuntime({
        commandQueue: runtime.commandQueue,
        config: runtime.config,
        commandIndicatorUpdater: runtime.commandIndicatorUpdater,
        ensureExecutionEnv: () => {
            if (!runtime.executionEnv) runtime.executionEnv = new Environment(null);
        },
        createStopError: () => new RavlykError("EXECUTION_STOPPED_BY_USER"),
        getShouldStop: () => runtime.shouldStop,
        getIsPaused: () => runtime.isPaused,
        setCurrentCommandIndex: (index) => {
            runtime.currentCommandIndex = index;
        },
        setAnimationFrameId: (frameId) => {
            runtime.animationFrameId = frameId;
        },
        getAnimationFrameId: () => runtime.animationFrameId,
        cancelAnimationFrameFn: cancelAnimationFrame,
        requestAnimationFrameFn: requestAnimationFrame,
        nowFn: () => performance.now(),
        onExecutionCompleted: () => {
            runtime.isExecuting = false;
            runtime.commandIndicatorUpdater(null, -1);
            runtime.executionEnv = null;
        },
        onExecutionError: () => {
            runtime.isExecuting = false;
            runtime.commandIndicatorUpdater(null, -1);
            runtime.executionEnv = null;
        },
        executeCurrentCommand: ({ currentCommandObject, currentFrame, executionStack, deltaTime }) => {
            return executeInterpreterCommand({
                currentCommandObject,
                currentFrame,
                executionStack,
                deltaTime,
                executionEnv: runtime.executionEnv,
                evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
                createVariableValueInvalidError: (name, value) => new RavlykError("VARIABLE_VALUE_INVALID", name, value),
                animatePen: (cmd, targetScale, dt) => runtime.animatePen(cmd, targetScale, dt),
                animateMove: (cmd, distance, dt) => runtime.animateMove(cmd, distance, dt),
                animateTurn: (cmd, angle, dt) => runtime.animateTurn(cmd, angle, dt),
                setColor: (color) => runtime.setColor(color),
                performGoto: (x, y) => runtime.performGoto(x, y),
                clearScreen: () => runtime.clearScreen(),
                cloneCommand: (cmd) => cloneInterpreterCommand(cmd),
                evaluateIfCondition: (condition) => runtime.evaluateIfCondition(condition),
                resetStuckState: () => {
                    runtime.state.isStuck = false;
                    runtime.boundaryWarningShown = false;
                },
                state: runtime.state,
            });
        },
        updateRavlykVisualState: () => runtime.updateRavlykVisualState(),
    });
}

export function animatePenRuntime(runtime, commandObject, targetScale, deltaTime) {
    return animatePenHelper({
        commandObject,
        targetScale,
        deltaTime,
        animationEnabled: runtime.config.animationEnabled,
        state: runtime.state,
    });
}

export function animateMoveRuntime(runtime, commandObject, totalDistance, deltaTime) {
    return animateMoveHelper({
        commandObject,
        totalDistance,
        deltaTime,
        animationEnabled: runtime.config.animationEnabled,
        moveSpeed: runtime.config.moveSpeed,
        state: runtime.state,
        performMove: (distance) => performMove({
            distance,
            state: runtime.state,
            ctx: runtime.ctx,
            clampToCanvasBounds: (x, y) => runtime.clampToCanvasBounds(x, y),
            applyContextSettings: () => runtime.applyContextSettings(),
        }),
        infoNotifier: runtime.infoNotifier,
        boundaryWarningShown: runtime.boundaryWarningShown,
        setBoundaryWarningShown: (value) => {
            runtime.boundaryWarningShown = value;
        },
        outOfBoundsMessage: ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS,
    });
}

export function animateTurnRuntime(runtime, commandObject, totalAngle, deltaTime) {
    return animateTurnHelper({
        commandObject,
        totalAngle,
        deltaTime,
        animationEnabled: runtime.config.animationEnabled,
        turnSpeed: runtime.config.turnSpeed,
        performTurn: (angle) => performTurn({ angle, state: runtime.state }),
    });
}

export function setColorRuntime(runtime, colorName) {
    setColorHelper({
        colorName,
        state: runtime.state,
        colorMap: COLOR_MAP,
        applyContextSettings: () => runtime.applyContextSettings(),
        createUnknownColorError: (rawColorName) => new RavlykError("UNKNOWN_COLOR", rawColorName),
    });
}

export function clearScreenRuntime(runtime) {
    clearScreenHelper({
        ctx: runtime.ctx,
        canvas: runtime.canvas,
    });
}

export function performGotoRuntime(runtime, logicalX, logicalY) {
    performGotoHelper({
        logicalX,
        logicalY,
        state: runtime.state,
        ctx: runtime.ctx,
        canvas: runtime.canvas,
        clampToCanvasBounds: (x, y) => runtime.clampToCanvasBounds(x, y),
        infoNotifier: runtime.infoNotifier,
        boundaryWarningShown: runtime.boundaryWarningShown,
        setBoundaryWarningShown: (value) => {
            runtime.boundaryWarningShown = value;
        },
        outOfBoundsMessage: ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS,
    });
}
