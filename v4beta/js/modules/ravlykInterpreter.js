// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    ERROR_MESSAGES, MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';
import { RavlykParser, RavlykError } from './ravlykParser.js';
import { Environment } from './environment.js';
import {
    getBoundaryMarginForState,
    clampToCanvasBoundsByMargin,
    isAtCanvasEdgeByMargin,
} from './interpreterBoundary.js';
import {
    normalizeConditionKey as normalizeConditionKeyHelper,
    evaluateAstCondition,
    evaluateRuntimeIfCondition,
} from './interpreterConditions.js';
import {
    stopGameLoopRuntime,
    startGameLoopRuntime,
} from './interpreterGameLoop.js';
import { createGameAstRunner } from './interpreterGameAstRunner.js';
import { runCommandQueueRuntime } from './interpreterQueueRuntime.js';
import { executeInterpreterCommand } from './interpreterCommandExecutor.js';
import { astProgramToLegacyQueue } from './interpreterAstQueueAdapter.js';
import {
    hasGameStatement as hasGameStatementHelper,
    validateGameProgramContract as validateGameProgramContractHelper,
} from './interpreterGameContract.js';
import {
    evalAstNumberExpression as evalAstNumberExpressionHelper,
    attachAstErrorLocation as attachAstErrorLocationHelper,
} from './interpreterAstEval.js';
import { handlePrimitiveAstStatement as handlePrimitiveAstStatementHelper } from './interpreterPrimitiveStatements.js';
import {
    animatePen as animatePenHelper,
    animateMove as animateMoveHelper,
    animateTurn as animateTurnHelper,
} from './interpreterAnimation.js';
import {
    performMove as performMoveHelper,
    performTurn as performTurnHelper,
    setColor as setColorHelper,
    clearScreen as clearScreenHelper,
    performGoto as performGotoHelper,
} from './interpreterDrawingOps.js';
import { cloneInterpreterCommand } from './interpreterCommandClone.js';
import { destroyInterpreterLifecycle } from './interpreterLifecycleCleanup.js';
import {
    stopExecutionRuntime,
    pauseExecutionRuntime,
    resumeExecutionRuntime,
    wasBoundaryWarningShownRuntime,
} from './interpreterRuntimeState.js';

// State coordinates track the turtle tip (not sprite center),
// so a large visual radius causes premature edge triggers.
const RAVLYK_VISUAL_BOUNDARY_RADIUS_PX = 0;

export class RavlykInterpreter {
    constructor(context, canvas, ravlykVisualUpdater, commandIndicatorUpdater, infoNotifier) {
        this.ctx = context;
        this.canvas = canvas;
        this.ravlykVisualUpdater = ravlykVisualUpdater;
        this.commandIndicatorUpdater = commandIndicatorUpdater;
        this.infoNotifier = infoNotifier;

        this.state = {
            x: 0,
            y: 0,
            angle: RAVLYK_INITIAL_ANGLE,
            isPenDown: true,
            color: DEFAULT_PEN_COLOR,
            penSize: DEFAULT_PEN_SIZE,
            isRainbow: false,
            rainbowHue: 0,
            isStuck: false,
            scale: 1.0 // Animation scale factor
        };

        this.config = {
            animationEnabled: true,
            moveSpeed: DEFAULT_MOVE_PIXELS_PER_SECOND,
            turnSpeed: DEFAULT_TURN_DEGREES_PER_SECOND,
            gameTickMs: 50,
        };

        this.isExecuting = false;
        this.shouldStop = false;
        this.isPaused = false;
        this.animationFrameId = null;
        this.gameLoopTimerId = null;
        this.gameLoopReject = null;
        this.commandQueue = [];
        this.currentCommandIndex = 0;
        this.boundaryWarningShown = false;
        this.isDestroyed = false;
        this.executionEnv = null;
        this.parser = new RavlykParser();
        this.pressedKeys = new Set();
        this.scrollControlKeys = new Set(["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "spacebar", "pageup", "pagedown", "home", "end"]);
        this.onKeyDown = (event) => {
            if (!event || typeof event.key !== "string") return;
            const key = event.key.toLowerCase();
            this.pressedKeys.add(key);
            const isGameLoopActive = this.gameLoopTimerId !== null;
            if (isGameLoopActive && this.scrollControlKeys.has(key) && event.cancelable) {
                event.preventDefault();
            }
        };
        this.onKeyUp = (event) => {
            if (!event || typeof event.key !== "string") return;
            this.pressedKeys.delete(event.key.toLowerCase());
        };
        if (typeof window !== "undefined" && window.addEventListener) {
            window.addEventListener("keydown", this.onKeyDown);
            window.addEventListener("keyup", this.onKeyUp);
        }

        this.reset();
    }

    reset() {
        this.state.x = this.canvas.width / 2;
        this.state.y = this.canvas.height / 2;
        this.state.angle = RAVLYK_INITIAL_ANGLE;
        this.state.isPenDown = true;
        this.state.color = DEFAULT_PEN_COLOR;
        this.state.penSize = DEFAULT_PEN_SIZE;
        this.state.isRainbow = false;
        this.state.rainbowHue = 0;
        this.state.isStuck = false;
        this.state.scale = 1.0;
        this.boundaryWarningShown = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.stopGameLoop();
        this.isExecuting = false;
        this.shouldStop = false;
        this.isPaused = false;
        this.commandQueue = [];
        this.currentCommandIndex = 0;
        this.executionEnv = null;
        this.parser.resetUserState();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyContextSettings();
        this.updateRavlykVisualState(true);
        this.commandIndicatorUpdater(null, -1);
    }

    applyContextSettings() {
        this.ctx.strokeStyle = this.state.isRainbow ? `hsl(${this.state.rainbowHue}, 100%, 50%)` : this.state.color;
        this.ctx.lineWidth = this.state.penSize;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
    }

    updateRavlykVisualState(force = false) {
        if (this.ravlykVisualUpdater && (this.config.animationEnabled || force)) {
            this.ravlykVisualUpdater(this.state, this.canvas);
        }
    }

    getBoundaryMargin() {
        return getBoundaryMarginForState(this.state, RAVLYK_VISUAL_BOUNDARY_RADIUS_PX);
    }

    clampToCanvasBounds(x, y) {
        const margin = this.getBoundaryMargin();
        return clampToCanvasBoundsByMargin(x, y, this.canvas.width, this.canvas.height, margin);
    }

    isAtCanvasEdge() {
        const margin = this.getBoundaryMargin();
        return isAtCanvasEdgeByMargin(this.state.x, this.state.y, this.canvas.width, this.canvas.height, margin);
    }

    setAnimationEnabled(enabled) {
        this.config.animationEnabled = !!enabled;
    }

    setSpeed(moveSpeed, turnSpeed) {
        this.config.moveSpeed = moveSpeed > 0 ? moveSpeed : DEFAULT_MOVE_PIXELS_PER_SECOND;
        this.config.turnSpeed = turnSpeed > 0 ? turnSpeed : DEFAULT_TURN_DEGREES_PER_SECOND;
    }

    tokenize(codeStr) {
        return this.parser.tokenize(codeStr);
    }

    parseTokens(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        // Compatibility API: parse token list through the AST pipeline,
        // then adapt to queue format expected by legacy tests/callers.
        const ast = this.parser.parseTokensToAst(tokens, depth, substitutions, tokenMeta);
        if (hasGameStatementHelper(ast)) {
            throw new RavlykError("GAME_NOT_SUPPORTED_HERE");
        }
        return this.astToLegacyQueue(ast);
    }

    parseTokensToAst(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        return this.parser.parseTokensToAst(tokens, depth, substitutions, tokenMeta);
    }
    evalAstNumberExpression(expr, env) {
        return evalAstNumberExpressionHelper(expr, env, {
            attachAstErrorLocation: (error, node) => this.attachAstErrorLocation(error, node),
        });
    }

    attachAstErrorLocation(error, node) {
        attachAstErrorLocationHelper(error, node);
    }

    handlePrimitiveAstStatement(stmt, env, mode, outputQueue = null) {
        return handlePrimitiveAstStatementHelper({
            stmt,
            env,
            mode,
            outputQueue,
            state: this.state,
            evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
            performMove: (distance) => performMoveHelper({
                distance,
                state: this.state,
                ctx: this.ctx,
                clampToCanvasBounds: (x, y) => this.clampToCanvasBounds(x, y),
                applyContextSettings: () => this.applyContextSettings(),
            }),
            performTurn: (angle) => performTurnHelper({ angle, state: this.state }),
            setColor: (colorName) => this.setColor(colorName),
            performGoto: (x, y) => this.performGoto(x, y),
            clearScreen: () => this.clearScreen(),
        });
    }

    astToLegacyQueue(programAst, options = {}) {
        return astProgramToLegacyQueue({
            programAst,
            emitAssignments: !!options.emitAssignments,
            EnvironmentCtor: Environment,
            maxRecursionDepth: MAX_RECURSION_DEPTH,
            maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
            evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
            handlePrimitiveAstStatement: (stmt, envRef, mode, out) => this.handlePrimitiveAstStatement(stmt, envRef, mode, out),
            attachAstErrorLocation: (error, node) => this.attachAstErrorLocation(error, node),
            createError: (messageKey, ...params) => new RavlykError(messageKey, ...params),
        });
    }

    validateGameProgramContract(programAst) {
        return validateGameProgramContractHelper(programAst, {
            createError: (messageKey) => new RavlykError(messageKey),
            hasGameStatementFn: hasGameStatementHelper,
        });
    }

    stopGameLoop(optionalError = undefined) {
        stopGameLoopRuntime(this, optionalError);
    }

    executeGameProgram(programAst) {
        const gameAstRunner = createGameAstRunner({
            programAst,
            EnvironmentCtor: Environment,
            RavlykErrorCtor: RavlykError,
            maxRecursionDepth: MAX_RECURSION_DEPTH,
            maxRepeatsInLoop: MAX_REPEATS_IN_LOOP,
            evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
            handlePrimitiveAstStatement: (stmt, envCtx, mode) => this.handlePrimitiveAstStatement(stmt, envCtx, mode),
            evaluateCondition: (condition, envCtx) => evaluateAstCondition(condition, {
                evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
                env: envCtx,
                isAtCanvasEdge: () => this.isAtCanvasEdge(),
                pressedKeys: this.pressedKeys,
            }),
            attachAstErrorLocation: (error, stmt) => this.attachAstErrorLocation(error, stmt),
        });

        this.commandIndicatorUpdater("грати (...)", 0);
        this.updateRavlykVisualState(true);

        return startGameLoopRuntime(this, {
            gameTickMs: this.config.gameTickMs,
            shouldStop: () => this.shouldStop,
            isPaused: () => this.isPaused,
            onStopRequested: () => {
                this.commandIndicatorUpdater(null, -1);
                this.stopGameLoop(new RavlykError("EXECUTION_STOPPED_BY_USER"));
            },
            onTick: () => {
                gameAstRunner.runGameTick();
                this.updateRavlykVisualState(true);
            },
            onError: (error) => {
                this.commandIndicatorUpdater(null, -1);
                this.stopGameLoop(error);
            },
        });
    }

    async executeCommands(commandsString) {
        if (this.isExecuting) {
            throw new RavlykError("EXECUTION_IN_PROGRESS");
        }

        this.isExecuting = true;
        this.shouldStop = false;
        this.isPaused = false;
        this.currentCommandIndex = 0;
        this.boundaryWarningShown = false;
        this.parser.resetUserState();

        try {
            const programAst = this.parser.parseCodeToAst(commandsString);
            this.validateGameProgramContract(programAst);
            if (hasGameStatementHelper(programAst)) {
                return await this.executeGameProgram(programAst);
            }
            this.commandQueue = this.astToLegacyQueue(programAst, {
                emitAssignments: true,
            });
            this.executionEnv = new Environment(null);
            return await this.runCommandQueue();
        } catch (error) {
            this.isExecuting = false;
            this.commandIndicatorUpdater(null, -1);
            throw error;
        } finally {
            this.isExecuting = false;
            this.commandIndicatorUpdater(null, -1);
        }
    }

    normalizeConditionKey(rawKey) {
        return normalizeConditionKeyHelper(rawKey);
    }

    evaluateIfCondition(condition) {
        const evalEnv = this.executionEnv || new Environment(null);
        return evaluateRuntimeIfCondition(condition, {
            evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
            executionEnv: evalEnv,
            isAtCanvasEdge: () => this.isAtCanvasEdge(),
            pressedKeys: this.pressedKeys,
        });
    }

    async runCommandQueue() {
        return runCommandQueueRuntime({
            commandQueue: this.commandQueue,
            config: this.config,
            commandIndicatorUpdater: this.commandIndicatorUpdater,
            ensureExecutionEnv: () => {
                if (!this.executionEnv) this.executionEnv = new Environment(null);
            },
            createStopError: () => new RavlykError("EXECUTION_STOPPED_BY_USER"),
            getShouldStop: () => this.shouldStop,
            getIsPaused: () => this.isPaused,
            setCurrentCommandIndex: (index) => {
                this.currentCommandIndex = index;
            },
            setAnimationFrameId: (frameId) => {
                this.animationFrameId = frameId;
            },
            getAnimationFrameId: () => this.animationFrameId,
            cancelAnimationFrameFn: cancelAnimationFrame,
            requestAnimationFrameFn: requestAnimationFrame,
            nowFn: () => performance.now(),
            onExecutionCompleted: () => {
                this.isExecuting = false;
                this.commandIndicatorUpdater(null, -1);
                this.executionEnv = null;
            },
            onExecutionError: () => {
                this.isExecuting = false;
                this.commandIndicatorUpdater(null, -1);
                this.executionEnv = null;
            },
            executeCurrentCommand: ({ currentCommandObject, currentFrame, executionStack, deltaTime }) => {
                return executeInterpreterCommand({
                    currentCommandObject,
                    currentFrame,
                    executionStack,
                    deltaTime,
                    executionEnv: this.executionEnv,
                    evalAstNumberExpression: (expr, envRef) => this.evalAstNumberExpression(expr, envRef),
                    createVariableValueInvalidError: (name, value) => new RavlykError("VARIABLE_VALUE_INVALID", name, value),
                    animatePen: (cmd, targetScale, dt) => this.animatePen(cmd, targetScale, dt),
                    animateMove: (cmd, distance, dt) => this.animateMove(cmd, distance, dt),
                    animateTurn: (cmd, angle, dt) => this.animateTurn(cmd, angle, dt),
                    setColor: (color) => this.setColor(color),
                    performGoto: (x, y) => this.performGoto(x, y),
                    clearScreen: () => this.clearScreen(),
                    cloneCommand: (cmd) => cloneInterpreterCommand(cmd),
                    evaluateIfCondition: (condition) => this.evaluateIfCondition(condition),
                    resetStuckState: () => {
                        this.state.isStuck = false;
                        this.boundaryWarningShown = false;
                    },
                    state: this.state,
                });
            },
            updateRavlykVisualState: () => this.updateRavlykVisualState(),
        });
    }

    animatePen(commandObject, targetScale, deltaTime) {
        return animatePenHelper({
            commandObject,
            targetScale,
            deltaTime,
            animationEnabled: this.config.animationEnabled,
            state: this.state,
        });
    }

    animateMove(commandObject, totalDistance, deltaTime) {
        return animateMoveHelper({
            commandObject,
            totalDistance,
            deltaTime,
            animationEnabled: this.config.animationEnabled,
            moveSpeed: this.config.moveSpeed,
            state: this.state,
            performMove: (distance) => performMoveHelper({
                distance,
                state: this.state,
                ctx: this.ctx,
                clampToCanvasBounds: (x, y) => this.clampToCanvasBounds(x, y),
                applyContextSettings: () => this.applyContextSettings(),
            }),
            infoNotifier: this.infoNotifier,
            boundaryWarningShown: this.boundaryWarningShown,
            setBoundaryWarningShown: (value) => {
                this.boundaryWarningShown = value;
            },
            outOfBoundsMessage: ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS,
        });
    }

    animateTurn(commandObject, totalAngle, deltaTime) {
        return animateTurnHelper({
            commandObject,
            totalAngle,
            deltaTime,
            animationEnabled: this.config.animationEnabled,
            turnSpeed: this.config.turnSpeed,
            performTurn: (angle) => performTurnHelper({ angle, state: this.state }),
        });
    }

    setColor(colorName) {
        setColorHelper({
            colorName,
            state: this.state,
            colorMap: COLOR_MAP,
            applyContextSettings: () => this.applyContextSettings(),
            createUnknownColorError: (rawColorName) => new RavlykError("UNKNOWN_COLOR", rawColorName),
        });
    }

    clearScreen() {
        clearScreenHelper({
            ctx: this.ctx,
            canvas: this.canvas,
        });
    }

    performGoto(logicalX, logicalY) {
        performGotoHelper({
            logicalX,
            logicalY,
            state: this.state,
            ctx: this.ctx,
            canvas: this.canvas,
            clampToCanvasBounds: (x, y) => this.clampToCanvasBounds(x, y),
            infoNotifier: this.infoNotifier,
            boundaryWarningShown: this.boundaryWarningShown,
            setBoundaryWarningShown: (value) => {
                this.boundaryWarningShown = value;
            },
            outOfBoundsMessage: ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS,
        });
    }

    handleCanvasResize(resizeMeta = null) {
        if (
            resizeMeta &&
            Number.isFinite(resizeMeta.deltaX) &&
            Number.isFinite(resizeMeta.deltaY)
        ) {
            this.state.x += resizeMeta.deltaX;
            this.state.y += resizeMeta.deltaY;
        }
        this.updateRavlykVisualState(true);
    }

    stopExecution() {
        stopExecutionRuntime({
            runtime: this,
            createStopError: () => new RavlykError("EXECUTION_STOPPED_BY_USER"),
            stopGameLoop: (error) => this.stopGameLoop(error),
        });
    }

    destroy() {
        destroyInterpreterLifecycle({
            runtime: this,
            cancelAnimationFrameFn: typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (() => {}),
            clearIntervalFn: typeof clearInterval === "function" ? clearInterval : (() => {}),
            windowRef: typeof window !== "undefined" ? window : null,
        });
    }

    pauseExecution() {
        pauseExecutionRuntime({ runtime: this });
    }

    resumeExecution() {
        resumeExecutionRuntime({ runtime: this });
    }
    
    wasBoundaryWarningShown() {
        return wasBoundaryWarningShownRuntime({ runtime: this });
    }
}
