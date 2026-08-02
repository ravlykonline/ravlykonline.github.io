import {
    COLOR_MAP,
    DEFAULT_CANVAS_BACKGROUND,
    DEFAULT_PEN_SIZE,
    ERROR_MESSAGES,
    GRID_ALIGN_OFFSET_X,
    GRID_ALIGN_OFFSET_Y,
    MAX_RECURSION_DEPTH,
    MAX_REPEATS_IN_LOOP,
    MAX_COMMAND_QUEUE_LENGTH,
    MAX_GAME_TICK_OPERATIONS,
    RAVLYK_INITIAL_ANGLE,
} from './constants.js';
import { RavlykError } from './ravlykParser.js';
import { Environment } from './environment.js';
import { evaluateAstCondition, evaluateRuntimeIfCondition } from './interpreterConditions.js';
import { startGameLoopRuntime } from './interpreterGameLoop.js';
import { createGameAstRunner } from './interpreterGameAstRunner.js';
import { executeInterpreterCommand } from './interpreterCommandExecutor.js';
import { astProgramToLegacyQueue } from './interpreterAstQueueAdapter.js';
import { hasGameStatement, validateGameProgramContract } from './interpreterGameContract.js';
import { handlePrimitiveAstStatement } from './interpreterPrimitiveStatements.js';
import {
    animatePen as animatePenHelper,
    animateMove as animateMoveHelper,
    animateTurn as animateTurnHelper,
    animateWait as animateWaitHelper,
} from './interpreterAnimation.js';
import {
    performMove,
    performTurn,
    setColor as setColorHelper,
    setBackgroundColor as setBackgroundColorHelper,
    clearScreen as clearScreenHelper,
    performGoto as performGotoHelper,
} from './interpreterDrawingOps.js';
import { drawLinenBackground } from './interpreterEmbroidery.js';
import { applyBackgroundLayer } from './backgroundLayer.js';
import { cloneInterpreterCommand } from './interpreterCommandClone.js';
import { runAstAnimationRuntime } from './interpreterAstAnimationRuntime.js';

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
        setBackgroundColor: (colorName) => runtime.setBackgroundColor(colorName),
        setThickness: (thickness) => {
            runtime.state.penSize = thickness;
            runtime.applyContextSettings();
        },
        pickRandomColorName: () => runtime.randomResolver.pickRandomColorName(),
        pickRandomBackgroundColorName: () => runtime.randomResolver.pickRandomBackgroundColorName(),
        pickSafeRandomDistance: (direction) => runtime.randomResolver.pickSafeRandomDistance({
            canvasWidth: runtime.canvas.width,
            canvasHeight: runtime.canvas.height,
            x: runtime.state.x,
            y: runtime.state.y,
            angle: runtime.state.angle,
            direction,
        }),
        pickSafeRandomPoint: () => {
            const point = runtime.randomResolver.pickSafeRandomPoint({
                canvasWidth: runtime.canvas.width,
                canvasHeight: runtime.canvas.height,
            });
            return {
                x: point.logicalX,
                y: point.logicalY,
            };
        },
        performGoto: (x, y) => runtime.performGoto(x, y),
        performHome: () => runtime.performHome(),
        clearToDefaultSheet: () => runtime.clearToDefaultSheet(),
        setEmbroideryMode: (on) => setEmbroideryModeRuntime(runtime, on),
    });
}

export function astToLegacyQueueRuntime(runtime, programAst, options = {}) {
    return astProgramToLegacyQueue({
        programAst,
        emitAssignments: !!options.emitAssignments,
        EnvironmentCtor: Environment,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        maxCommandQueueLength: MAX_COMMAND_QUEUE_LENGTH,
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
        maxGameTickOperations: MAX_GAME_TICK_OPERATIONS,
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

export function prepareProgramRuntime(runtime, commandsString) {
    if (runtime.isExecuting) {
        throw new RavlykError("EXECUTION_IN_PROGRESS");
    }

    runtime.parser.resetUserState();
    const programAst = runtime.parser.parseCodeToAst(commandsString);
    runtime.validateGameProgramContract(programAst);
    return programAst;
}

export async function executeProgramRuntime(runtime, programAst) {
    if (runtime.isExecuting) {
        throw new RavlykError("EXECUTION_IN_PROGRESS");
    }

    runtime.isExecuting = true;
    runtime.shouldStop = false;
    runtime.isPaused = false;
    runtime.currentCommandIndex = 0;
    runtime.boundaryWarningShown = false;

    try {
        if (hasGameStatement(programAst)) {
            return await runtime.executeGameProgram(programAst);
        }
        return await runtime.runAstAnimation(programAst);
    } finally {
        runtime.isExecuting = false;
        runtime.commandIndicatorUpdater(null, -1);
    }
}

export async function executeCommandsRuntime(runtime, commandsString) {
    const programAst = prepareProgramRuntime(runtime, commandsString);
    return executeProgramRuntime(runtime, programAst);
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

export function runAstAnimationWithRuntime(runtime, programAst) {
    return runAstAnimationRuntime({
        programAst,
        EnvironmentCtor: Environment,
        RavlykErrorCtor: RavlykError,
        maxRecursionDepth: MAX_RECURSION_DEPTH,
        maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
        maxCommandQueueLength: MAX_COMMAND_QUEUE_LENGTH,
        evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
        evaluateCondition: (condition, envCtx) => evaluateAstCondition(condition, {
            evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
            env: envCtx,
            isAtCanvasEdge: () => runtime.isAtCanvasEdge(),
            pressedKeys: runtime.pressedKeys,
        }),
        attachAstErrorLocation: (error, stmt) => runtime.attachAstErrorLocation(error, stmt),
        convertStmtToCommand: (stmt, env) => {
            const buf = [];
            runtime.handlePrimitiveAstStatement(stmt, env, 'queue', buf);
            const cmd = buf[0];
            if (!cmd) return null;
            // Attach the live env so executeAnimatedCommand can resolve
            // expression nodes (distanceExpr, angleExpr, xExpr, yExpr) against
            // variable values that were set by preceding statements.
            cmd._capturedEnv = env;
            return cmd;
        },
        executeAnimatedCommand: (cmd, deltaTime, realDeltaTime) => {
            return executeInterpreterCommand({
                currentCommandObject: cmd,
                currentFrame: { commands: [], index: 0 },
                executionStack: [],
                deltaTime,
                // createAstRuntime handles AssignmentStmt internally; ASSIGN_AST
                // commands will never reach here.  REPEAT / IF are also handled
                // internally, so executionEnv is only used for expression resolution.
                executionEnv: cmd._capturedEnv,
                evalAstNumberExpression: (expr, envRef) => runtime.evalAstNumberExpression(expr, envRef),
                createVariableValueInvalidError: (name, value) => new RavlykError('VARIABLE_VALUE_INVALID', name, value),
                semanticDeltaTime: realDeltaTime,
                animatePen: (c, targetScale, dt) => runtime.animatePen(c, targetScale, dt),
                animateMove: (c, distance, dt) => runtime.animateMove(c, distance, dt),
                animateTurn: (c, angle, dt) => runtime.animateTurn(c, angle, dt),
                animateWait: (c, dt) => runtime.animateWait(c, dt),
                setColor: (color) => runtime.setColor(color),
                setBackgroundColor: (color) => runtime.setBackgroundColor(color),
                setThickness: (thickness) => {
                    runtime.state.penSize = thickness;
                    runtime.applyContextSettings();
                },
                performGoto: (x, y) => runtime.performGoto(x, y),
                performHome: () => performHomeRuntime(runtime),
                clearToDefaultSheet: () => runtime.clearToDefaultSheet(),
                setEmbroideryMode: (on) => setEmbroideryModeRuntime(runtime, on),
                cloneCommand: (c) => cloneInterpreterCommand(c),
                // IfStmt and RepeatStmt are handled by createAstRuntime internally
                // and will never surface here as primitive commands.
                evaluateIfCondition: () => false,
                resetStuckState: () => {
                    runtime.state.isStuck = false;
                    runtime.boundaryWarningShown = false;
                },
                state: runtime.state,
            });
        },
        config: runtime.config,
        commandIndicatorUpdater: runtime.commandIndicatorUpdater,
        createStopError: () => new RavlykError('EXECUTION_STOPPED_BY_USER'),
        getShouldStop: () => runtime.shouldStop,
        getIsPaused: () => runtime.isPaused,
        setAnimationFrameId: (frameId) => { runtime.animationFrameId = frameId; },
        getAnimationFrameId: () => runtime.animationFrameId,
        cancelAnimationFrameFn: cancelAnimationFrame,
        requestAnimationFrameFn: requestAnimationFrame,
        nowFn: () => performance.now(),
        onExecutionCompleted: () => {
            runtime.isExecuting = false;
            runtime.commandIndicatorUpdater(null, -1);
        },
        onExecutionError: () => {
            runtime.isExecuting = false;
            runtime.commandIndicatorUpdater(null, -1);
        },
        updateRavlykVisualState: () => runtime.updateRavlykVisualState(),
        onFrameCapture: runtime.gifCapture ? (ms) => runtime.gifCapture.captureFrame(ms) : null,
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

export function animateWaitRuntime(runtime, commandObject, deltaTime) {
    return animateWaitHelper({
        commandObject,
        deltaTime,
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

export function setBackgroundColorRuntime(runtime, colorName) {
    setBackgroundColorHelper({
        colorName,
        state: runtime.state,
        canvas: runtime.canvas,
        backgroundCanvas: runtime.backgroundCanvas,
        backgroundCtx: runtime.backgroundCtx,
        colorMap: COLOR_MAP,
        applyContextSettings: () => runtime.applyContextSettings(),
        createUnknownColorError: (rawColorName) => new RavlykError("UNKNOWN_COLOR", rawColorName),
    });
    if (runtime.state.isEmbroidery && runtime.backgroundCtx && runtime.backgroundCanvas) {
        drawLinenBackground(
            runtime.backgroundCtx,
            runtime.backgroundCanvas.width,
            runtime.backgroundCanvas.height,
            runtime.state.backgroundColor
        );
    }
}

export function clearScreenRuntime(runtime) {
    applyBackgroundLayer({
        canvas: runtime.canvas,
        backgroundCanvas: runtime.backgroundCanvas,
        backgroundCtx: runtime.backgroundCtx,
        backgroundColor: runtime.state.backgroundColor,
    });
    clearScreenHelper({
        ctx: runtime.ctx,
        canvas: runtime.canvas,
        backgroundColor: runtime.state.backgroundColor,
    });
    runtime.applyContextSettings();
}

export function setEmbroideryModeRuntime(runtime, on) {
    runtime.state.isEmbroidery = on;
    if (on) {
        if (runtime.backgroundCtx && runtime.backgroundCanvas) {
            drawLinenBackground(
                runtime.backgroundCtx,
                runtime.backgroundCanvas.width,
                runtime.backgroundCanvas.height,
                runtime.state.backgroundColor
            );
        }
    } else {
        applyBackgroundLayer({
            canvas: runtime.canvas,
            backgroundCanvas: runtime.backgroundCanvas,
            backgroundCtx: runtime.backgroundCtx,
            backgroundColor: runtime.state.backgroundColor,
        });
    }
}

export function clearToDefaultSheetRuntime(runtime) {
    runtime.state.backgroundColor = DEFAULT_CANVAS_BACKGROUND;
    runtime.state.penSize = DEFAULT_PEN_SIZE;
    runtime.state.isEmbroidery = false;
    runtime.state.isVisible = true;
    applyBackgroundLayer({
        canvas: runtime.canvas,
        backgroundCanvas: runtime.backgroundCanvas,
        backgroundCtx: runtime.backgroundCtx,
        backgroundColor: runtime.state.backgroundColor,
    });
    clearScreenHelper({
        ctx: runtime.ctx,
        canvas: runtime.canvas,
        backgroundColor: runtime.state.backgroundColor,
    });
    runtime.applyContextSettings();
}

export function performHomeRuntime(runtime) {
    runtime.state.x = (runtime.canvas.width / 2) + GRID_ALIGN_OFFSET_X;
    runtime.state.y = (runtime.canvas.height / 2) + GRID_ALIGN_OFFSET_Y;
    runtime.state.angle = RAVLYK_INITIAL_ANGLE;
    runtime.state.isStuck = false;
    runtime.boundaryWarningShown = false;
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
