// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_CANVAS_BACKGROUND, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';
import { RavlykParser, RavlykError } from './ravlykParser.js';
import {
    getBoundaryMarginForState,
    clampToCanvasBoundsByMargin,
    isAtCanvasEdgeByMargin,
} from './interpreterBoundary.js';
import {
    normalizeConditionKey as normalizeConditionKeyHelper,
} from './interpreterConditions.js';
import {
    stopGameLoopRuntime,
} from './interpreterGameLoop.js';
import { hasGameStatement as hasGameStatementHelper } from './interpreterGameContract.js';
import {
    evalAstNumberExpression as evalAstNumberExpressionHelper,
    attachAstErrorLocation as attachAstErrorLocationHelper,
} from './interpreterAstEval.js';
import { destroyInterpreterLifecycle } from './interpreterLifecycleCleanup.js';
import {
    stopExecutionRuntime,
    pauseExecutionRuntime,
    resumeExecutionRuntime,
    wasBoundaryWarningShownRuntime,
} from './interpreterRuntimeState.js';
import {
    handlePrimitiveAstStatementRuntime,
    astToLegacyQueueRuntime,
    validateGameProgramContractRuntime,
    executeGameProgramRuntime,
    executeCommandsRuntime,
    evaluateIfConditionRuntime,
    runCommandQueueWithRuntime,
    animatePenRuntime,
    animateMoveRuntime,
    animateTurnRuntime,
    setColorRuntime,
    setBackgroundColorRuntime,
    clearScreenRuntime,
    clearToDefaultSheetRuntime,
    performGotoRuntime,
} from './ravlykInterpreterRuntime.js';

// State coordinates track the turtle tip (not sprite center),
// so a large visual radius causes premature edge triggers.
const RAVLYK_VISUAL_BOUNDARY_RADIUS_PX = 0;

export class RavlykInterpreter {
    constructor(context, canvas, ravlykVisualUpdater, commandIndicatorUpdater, infoNotifier, options = {}) {
        this.ctx = context;
        this.canvas = canvas;
        this.backgroundCanvas = options.backgroundCanvas || null;
        this.backgroundCtx = options.backgroundCtx || null;
        this.ravlykVisualUpdater = ravlykVisualUpdater;
        this.commandIndicatorUpdater = commandIndicatorUpdater;
        this.infoNotifier = infoNotifier;

        this.state = {
            x: 0,
            y: 0,
            angle: RAVLYK_INITIAL_ANGLE,
            isPenDown: true,
            color: DEFAULT_PEN_COLOR,
            backgroundColor: DEFAULT_CANVAS_BACKGROUND,
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
        this.state.backgroundColor = DEFAULT_CANVAS_BACKGROUND;
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

        if (this.backgroundCanvas && this.backgroundCanvas.style) {
            this.backgroundCanvas.style.backgroundColor = this.state.backgroundColor;
        } else if (this.canvas && this.canvas.style) {
            this.canvas.style.backgroundColor = this.state.backgroundColor;
        }
        this.clearScreen();
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
        return handlePrimitiveAstStatementRuntime(this, stmt, env, mode, outputQueue);
    }

    astToLegacyQueue(programAst, options = {}) {
        return astToLegacyQueueRuntime(this, programAst, options);
    }

    validateGameProgramContract(programAst) {
        return validateGameProgramContractRuntime(programAst);
    }

    stopGameLoop(optionalError = undefined) {
        stopGameLoopRuntime(this, optionalError);
    }

    executeGameProgram(programAst) {
        return executeGameProgramRuntime(this, programAst);
    }

    async executeCommands(commandsString) {
        return executeCommandsRuntime(this, commandsString);
    }

    normalizeConditionKey(rawKey) {
        return normalizeConditionKeyHelper(rawKey);
    }

    evaluateIfCondition(condition) {
        return evaluateIfConditionRuntime(this, condition);
    }

    async runCommandQueue() {
        return runCommandQueueWithRuntime(this);
    }

    animatePen(commandObject, targetScale, deltaTime) {
        return animatePenRuntime(this, commandObject, targetScale, deltaTime);
    }

    animateMove(commandObject, totalDistance, deltaTime) {
        return animateMoveRuntime(this, commandObject, totalDistance, deltaTime);
    }

    animateTurn(commandObject, totalAngle, deltaTime) {
        return animateTurnRuntime(this, commandObject, totalAngle, deltaTime);
    }

    setColor(colorName) {
        return setColorRuntime(this, colorName);
    }

    setBackgroundColor(colorName) {
        return setBackgroundColorRuntime(this, colorName);
    }

    clearScreen() {
        return clearScreenRuntime(this);
    }

    clearToDefaultSheet() {
        return clearToDefaultSheetRuntime(this);
    }

    performGoto(logicalX, logicalY) {
        return performGotoRuntime(this, logicalX, logicalY);
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
        this.clearScreen();
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

    getCanvasBackgroundColor() {
        return this.state.backgroundColor;
    }

    getBackgroundCanvas() {
        return this.backgroundCanvas;
    }
}
