// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    CANVAS_BOUNDARY_PADDING, ERROR_MESSAGES, MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';
import { RavlykParser, RavlykError } from './ravlykParser.js';
import { Environment } from './environment.js';

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
        const penMargin = Math.ceil((Number(this.state.penSize) || DEFAULT_PEN_SIZE) / 2);
        return Math.max(CANVAS_BOUNDARY_PADDING, RAVLYK_VISUAL_BOUNDARY_RADIUS_PX, penMargin);
    }

    clampToCanvasBounds(x, y) {
        const margin = this.getBoundaryMargin();
        const boundedX = Math.max(margin, Math.min(x, this.canvas.width - margin));
        const boundedY = Math.max(margin, Math.min(y, this.canvas.height - margin));
        return { boundedX, boundedY };
    }

    isAtCanvasEdge() {
        const margin = this.getBoundaryMargin();
        return this.state.x <= margin
            || this.state.x >= this.canvas.width - margin
            || this.state.y <= margin
            || this.state.y >= this.canvas.height - margin;
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
        if (this.hasGameStatement(ast)) {
            throw new RavlykError("GAME_NOT_SUPPORTED_HERE");
        }
        return this.astToLegacyQueue(ast);
    }

    parseTokensToAst(tokens, depth = 0, substitutions = {}, tokenMeta = null) {
        return this.parser.parseTokensToAst(tokens, depth, substitutions, tokenMeta);
    }
    evalAstNumberExpression(expr, env) {
        try {
            if (!expr || !expr.type) return NaN;
            if (expr.type === "NumberLiteral") {
                return Number(expr.value);
            }
            if (expr.type === "Identifier") {
                return env.get(expr.name);
            }
            if (expr.type === "UnaryExpr") {
                const value = this.evalAstNumberExpression(expr.expr, env);
                if (expr.op === "+") return +value;
                if (expr.op === "-") return -value;
                return NaN;
            }
            if (expr.type === "BinaryExpr") {
                const left = this.evalAstNumberExpression(expr.left, env);
                const right = this.evalAstNumberExpression(expr.right, env);
                if (expr.op === "+") return left + right;
                if (expr.op === "-") return left - right;
                if (expr.op === "*") return left * right;
                if (expr.op === "/") return right === 0 ? NaN : left / right;
                if (expr.op === "%") return right === 0 ? NaN : left % right;
                return NaN;
            }
            return NaN;
        } catch (error) {
            this.attachAstErrorLocation(error, expr);
            throw error;
        }
    }

    attachAstErrorLocation(error, node) {
        if (!error || error.name !== "RavlykError") return;
        if (typeof error.line === "number" && error.line > 0) return;
        const span = node?.span;
        const pos = span?.start;
        if (!pos) return;
        error.line = pos.line;
        error.column = pos.column;
        error.token = pos.token || null;
    }

    handlePrimitiveAstStatement(stmt, env, mode, outputQueue = null) {
        if (!stmt || !stmt.type) return false;

        if (stmt.type === "MoveStmt") {
            const value = this.evalAstNumberExpression(stmt.distance, env);
            if (!Number.isFinite(value)) {
                const original = stmt.direction === "backward" ? "назад" : "вперед";
                throw new RavlykError("INVALID_DISTANCE", original, String(value));
            }
            if (mode === "queue") {
                outputQueue.push({
                    type: stmt.direction === "backward" ? "MOVE_BACK" : "MOVE",
                    value,
                    original: stmt.direction === "backward" ? "назад" : "вперед"
                });
            } else {
                this._performMove(stmt.direction === "backward" ? -value : value);
            }
            return true;
        }

        if (stmt.type === "TurnStmt") {
            const value = this.evalAstNumberExpression(stmt.angle, env);
            if (!Number.isFinite(value)) {
                const original = stmt.direction === "left" ? "ліворуч" : "праворуч";
                throw new RavlykError("INVALID_ANGLE", original, String(value));
            }
            if (mode === "queue") {
                outputQueue.push({
                    type: stmt.direction === "left" ? "TURN_LEFT" : "TURN",
                    value,
                    original: stmt.direction === "left" ? "ліворуч" : "праворуч"
                });
            } else {
                this._performTurn(stmt.direction === "left" ? -value : value);
            }
            return true;
        }

        if (stmt.type === "ColorStmt") {
            if (mode === "queue") {
                outputQueue.push({ type: "COLOR", value: stmt.colorName, original: "колір" });
            } else {
                this.setColor(stmt.colorName);
            }
            return true;
        }

        if (stmt.type === "GotoStmt") {
            const x = this.evalAstNumberExpression(stmt.x, env);
            const y = this.evalAstNumberExpression(stmt.y, env);
            if (!Number.isFinite(x)) {
                throw new RavlykError("INVALID_POSITION_X", "перейти", String(x));
            }
            if (!Number.isFinite(y)) {
                throw new RavlykError("INVALID_POSITION_Y", "перейти", String(y));
            }
            if (mode === "queue") {
                outputQueue.push({ type: "GOTO", x, y, original: "перейти" });
            } else {
                this.performGoto(x, y);
            }
            return true;
        }

        if (stmt.type === "PenStmt") {
            if (mode === "queue") {
                outputQueue.push({
                    type: stmt.mode === "up" ? "PEN_UP" : "PEN_DOWN",
                    original: stmt.mode === "up" ? "підняти" : "опустити"
                });
            } else {
                this.state.isPenDown = stmt.mode !== "up";
            }
            return true;
        }

        if (stmt.type === "ClearStmt") {
            if (mode === "queue") {
                outputQueue.push({ type: "CLEAR", original: "очистити" });
            } else {
                this.clearScreen();
            }
            return true;
        }

        return false;
    }

    astToLegacyQueue(programAst, options = {}) {
        const emitAssignments = !!options.emitAssignments;
        if (!programAst || programAst.type !== "Program" || !Array.isArray(programAst.body)) {
            return [];
        }

        const output = [];
        const functionDefs = new Map();
        const rootEnv = new Environment(null);

        const cloneAstExpression = (expr) => {
            if (!expr || !expr.type) return expr;
            if (expr.type === "NumberLiteral" || expr.type === "Identifier") {
                return { ...expr };
            }
            if (expr.type === "UnaryExpr") {
                return {
                    ...expr,
                    expr: cloneAstExpression(expr.expr),
                };
            }
            if (expr.type === "BinaryExpr") {
                return {
                    ...expr,
                    left: cloneAstExpression(expr.left),
                    right: cloneAstExpression(expr.right),
                };
            }
            return { ...expr };
        };

        const convertConditionToRuntime = (condition) => {
            if (!condition || !condition.type) return null;
            if (condition.type === "EdgeCondition") return { type: "EDGE" };
            if (condition.type === "KeyCondition") return { type: "KEY", key: condition.key };
            if (condition.type === "CompareCondition") {
                return {
                    type: "COMPARE_AST",
                    op: condition.op,
                    left: cloneAstExpression(condition.left),
                    right: cloneAstExpression(condition.right),
                };
            }
            return null;
        };

        const runStmt = (stmt, env, out, callDepth) => {
            if (!stmt || !stmt.type) return;
            try {

                if (stmt.type === "AssignmentStmt") {
                    const value = this.evalAstNumberExpression(stmt.expr, env);
                    if (!Number.isFinite(value)) {
                        throw new RavlykError("VARIABLE_VALUE_INVALID", stmt.name, String(value));
                    }
                    env.set(stmt.name, value);
                    if (emitAssignments) {
                        out.push({
                            type: "ASSIGN_AST",
                            name: stmt.name,
                            expr: cloneAstExpression(stmt.expr),
                            original: "=",
                        });
                    }
                    return;
                }

            if (stmt.type === "FunctionDefStmt") {
                functionDefs.set(stmt.name, stmt);
                return;
            }

            if (stmt.type === "FunctionCallStmt") {
                const def = functionDefs.get(stmt.name);
                if (!def) {
                    throw new RavlykError("UNKNOWN_COMMAND", stmt.name);
                }
                if (callDepth > MAX_RECURSION_DEPTH) {
                    throw new RavlykError("TOO_MANY_NESTED_REPEATS");
                }
                const localEnv = new Environment(env);
                for (let idx = 0; idx < def.params.length; idx++) {
                    const paramName = def.params[idx];
                    const argExpr = stmt.args[idx];
                    const argValue = this.evalAstNumberExpression(argExpr, env);
                    if (!Number.isFinite(argValue)) {
                        throw new RavlykError("FUNCTION_ARGUMENT_INVALID", stmt.name, String(argValue));
                    }
                    localEnv.define(paramName, argValue);
                }
                for (const nested of def.body || []) {
                    runStmt(nested, localEnv, out, callDepth + 1);
                }
                return;
            }

            if (this.handlePrimitiveAstStatement(stmt, env, "queue", out)) {
                return;
            }

            if (stmt.type === "RepeatStmt") {
                const countValue = this.evalAstNumberExpression(stmt.count, env);
                if (!Number.isInteger(countValue) || countValue < 0) {
                    throw new RavlykError("INVALID_REPEAT_COUNT", String(countValue));
                }
                if (countValue > MAX_REPEATS_IN_LOOP) {
                    throw new RavlykError("TOO_MANY_REPEATS_IN_LOOP");
                }
                const iterations = countValue;
                for (let idx = 0; idx < iterations; idx++) {
                    for (const nested of stmt.body || []) {
                        runStmt(nested, env, out, callDepth);
                    }
                }
                return;
            }

            if (stmt.type === "IfStmt") {
                const thenCommands = [];
                const elseCommands = [];
                const thenEnv = env.clone();
                const elseEnv = env.clone();
                for (const nested of stmt.thenBody || []) runStmt(nested, thenEnv, thenCommands, callDepth);
                for (const nested of stmt.elseBody || []) runStmt(nested, elseEnv, elseCommands, callDepth);

                out.push({
                    type: "IF",
                    condition: convertConditionToRuntime(stmt.condition),
                    thenCommands,
                    elseCommands,
                    original: "якщо",
                });
                return;
            }

                if (stmt.type === "GameStmt") {
                    throw new RavlykError("GAME_NOT_SUPPORTED_HERE");
                }
            } catch (error) {
                this.attachAstErrorLocation(error, stmt);
                throw error;
            }
        };

        for (const stmt of programAst.body) {
            runStmt(stmt, rootEnv, output, 0);
        }
        return output;
    }

    hasGameStatement(node) {
        if (!node || typeof node !== "object") return false;
        if (node.type === "GameStmt") return true;
        if (Array.isArray(node.body) && node.body.some((item) => this.hasGameStatement(item))) return true;
        if (Array.isArray(node.thenBody) && node.thenBody.some((item) => this.hasGameStatement(item))) return true;
        if (Array.isArray(node.elseBody) && node.elseBody.some((item) => this.hasGameStatement(item))) return true;
        return false;
    }

    validateGameProgramContract(programAst) {
        if (!programAst || !Array.isArray(programAst.body)) return;
        const topLevelStatements = programAst.body;
        const topLevelGameBlocks = topLevelStatements.filter((stmt) => stmt?.type === "GameStmt");
        if (topLevelGameBlocks.length === 0) return;
        if (topLevelGameBlocks.length > 1) {
            throw new RavlykError("GAME_MODE_SINGLE_BLOCK");
        }

        for (const stmt of topLevelStatements) {
            if (!stmt || !stmt.type) continue;
            if (stmt.type === "GameStmt") {
                if (this.hasGameStatement({ type: "Program", body: stmt.body || [] })) {
                    throw new RavlykError("GAME_MODE_NESTED_BLOCK");
                }
                continue;
            }
            if (stmt.type === "AssignmentStmt") continue;
            if (stmt.type === "FunctionDefStmt") {
                if (this.hasGameStatement({ type: "Program", body: stmt.body || [] })) {
                    throw new RavlykError("GAME_MODE_NESTED_BLOCK");
                }
                continue;
            }
            throw new RavlykError("GAME_MODE_TOP_LEVEL_ONLY");
        }
    }

    stopGameLoop(optionalError = undefined) {
        if (this.gameLoopTimerId) {
            clearInterval(this.gameLoopTimerId);
            this.gameLoopTimerId = null;
        }
        if (this.gameLoopReject) {
            const reject = this.gameLoopReject;
            this.gameLoopReject = null;
            if (optionalError) {
                reject(optionalError);
            }
        }
    }

    executeGameProgram(programAst) {
        const env = new Environment(null);
        const functionDefs = new Map();
        const gameBodies = [];

        const evalCondition = (condition, envCtx) => {
            if (!condition || !condition.type) return false;
            if (condition.type === "CompareCondition") {
                const left = this.evalAstNumberExpression(condition.left, envCtx);
                const right = this.evalAstNumberExpression(condition.right, envCtx);
                if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
                if (condition.op === "=") return left === right;
                if (condition.op === "!=") return left !== right;
                if (condition.op === "<") return left < right;
                if (condition.op === ">") return left > right;
                if (condition.op === "<=") return left <= right;
                if (condition.op === ">=") return left >= right;
                return false;
            }
            if (condition.type === "EdgeCondition") {
                return this.isAtCanvasEdge();
            }
            if (condition.type === "KeyCondition") {
                const expected = this.normalizeConditionKey(condition.key);
                return this.pressedKeys.has(expected);
            }
            return false;
        };

        const runStmt = (stmt, envCtx, callDepth = 0) => {
            if (!stmt || !stmt.type) return;
            try {
                if (callDepth > MAX_RECURSION_DEPTH) throw new RavlykError("TOO_MANY_NESTED_REPEATS");

            if (stmt.type === "AssignmentStmt") {
                const value = this.evalAstNumberExpression(stmt.expr, envCtx);
                if (!Number.isFinite(value)) {
                    throw new RavlykError("VARIABLE_VALUE_INVALID", stmt.name, String(value));
                }
                envCtx.set(stmt.name, value);
                return;
            }

            if (stmt.type === "FunctionDefStmt") {
                functionDefs.set(stmt.name, stmt);
                return;
            }

            if (stmt.type === "FunctionCallStmt") {
                const def = functionDefs.get(stmt.name);
                if (!def) throw new RavlykError("UNKNOWN_COMMAND", stmt.name);
                const localEnv = new Environment(envCtx);
                for (let idx = 0; idx < def.params.length; idx++) {
                    const argValue = this.evalAstNumberExpression(stmt.args[idx], envCtx);
                    if (!Number.isFinite(argValue)) {
                        throw new RavlykError("FUNCTION_ARGUMENT_INVALID", stmt.name, String(argValue));
                    }
                    localEnv.define(def.params[idx], argValue);
                }
                for (const nested of def.body || []) runStmt(nested, localEnv, callDepth + 1);
                return;
            }

            if (this.handlePrimitiveAstStatement(stmt, envCtx, "immediate")) {
                return;
            }

            if (stmt.type === "RepeatStmt") {
                const countValue = this.evalAstNumberExpression(stmt.count, envCtx);
                if (!Number.isInteger(countValue) || countValue < 0) {
                    throw new RavlykError("INVALID_REPEAT_COUNT", String(countValue));
                }
                if (countValue > MAX_REPEATS_IN_LOOP) {
                    throw new RavlykError("TOO_MANY_REPEATS_IN_LOOP");
                }
                const iterations = countValue;
                for (let i = 0; i < iterations; i++) {
                    for (const nested of stmt.body || []) runStmt(nested, envCtx, callDepth);
                }
                return;
            }

            if (stmt.type === "IfStmt") {
                const selected = evalCondition(stmt.condition, envCtx) ? (stmt.thenBody || []) : (stmt.elseBody || []);
                for (const nested of selected) runStmt(nested, envCtx, callDepth);
                return;
            }

                if (stmt.type === "GameStmt") {
                    gameBodies.push(stmt.body || []);
                    return;
                }
            } catch (error) {
                this.attachAstErrorLocation(error, stmt);
                throw error;
            }
        };

        for (const stmt of programAst.body || []) {
            runStmt(stmt, env, 0);
        }

        if (gameBodies.length === 0) {
            throw new RavlykError("GAME_NOT_SUPPORTED_HERE");
        }

        this.commandIndicatorUpdater("грати (...)", 0);
        this.updateRavlykVisualState(true);

        return new Promise((resolve, reject) => {
            this.gameLoopReject = reject;
            this.gameLoopTimerId = setInterval(() => {
                try {
                    if (this.shouldStop) {
                        this.commandIndicatorUpdater(null, -1);
                        this.stopGameLoop(new RavlykError("EXECUTION_STOPPED_BY_USER"));
                        return;
                    }
                    if (this.isPaused) {
                        return;
                    }
                    for (const body of gameBodies) {
                        for (const stmt of body) {
                            runStmt(stmt, env, 0);
                        }
                    }
                    this.updateRavlykVisualState(true);
                } catch (error) {
                    this.commandIndicatorUpdater(null, -1);
                    this.stopGameLoop(error);
                }
            }, this.config.gameTickMs);
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
            if (this.hasGameStatement(programAst)) {
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

    cloneCommand(command) {
        const cloned = { ...command };
        if (Array.isArray(command.commands)) {
            cloned.commands = command.commands.map((nestedCommand) => this.cloneCommand(nestedCommand));
        }
        if (Array.isArray(command.thenCommands)) {
            cloned.thenCommands = command.thenCommands.map((nestedCommand) => this.cloneCommand(nestedCommand));
        }
        if (Array.isArray(command.elseCommands)) {
            cloned.elseCommands = command.elseCommands.map((nestedCommand) => this.cloneCommand(nestedCommand));
        }
        delete cloned.remainingDistance;
        delete cloned.remainingAngle;
        delete cloned.animationProgress;
        delete cloned.startScale;
        delete cloned.remainingIterations;
        return cloned;
    }

    normalizeConditionKey(rawKey) {
        const value = String(rawKey || "").trim().toLowerCase();
        const aliases = {
            "\u0432\u0433\u043e\u0440\u0443": "arrowup",
            "\u0432\u043d\u0438\u0437": "arrowdown",
            "\u043b\u0456\u0432\u043e": "arrowleft",
            "\u043b\u0456\u0432\u043e\u0440\u0443\u0447": "arrowleft",
            "\u043f\u0440\u0430\u0432\u043e": "arrowright",
            "\u043f\u0440\u0430\u0432\u043e\u0440\u0443\u0447": "arrowright",
            "up": "arrowup",
            "down": "arrowdown",
            "left": "arrowleft",
            "right": "arrowright",
        };
        return aliases[value] || value;
    }

    evaluateIfCondition(condition) {
        if (!condition || !condition.type) return false;
        if (condition.type === "EDGE") {
            return this.isAtCanvasEdge();
        }
        if (condition.type === "KEY") {
            const expected = this.normalizeConditionKey(condition.key);
            return this.pressedKeys.has(expected);
        }
        if (condition.type === "COMPARE_AST") {
            const evalEnv = this.executionEnv || new Environment(null);
            const left = this.evalAstNumberExpression(condition.left, evalEnv);
            const right = this.evalAstNumberExpression(condition.right, evalEnv);
            if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
            if (condition.op === "=") return left === right;
            if (condition.op === "!=") return left !== right;
            if (condition.op === "<") return left < right;
            if (condition.op === ">") return left > right;
            if (condition.op === "<=") return left <= right;
            if (condition.op === ">=") return left >= right;
        }
        if (condition.type === "COMPARE") {
            const left = Number(condition.left);
            const right = Number(condition.right);
            if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
            if (condition.operator === "=") return left === right;
            if (condition.operator === "!=") return left !== right;
            if (condition.operator === "<") return left < right;
            if (condition.operator === ">") return left > right;
            if (condition.operator === "<=") return left <= right;
            if (condition.operator === ">=") return left >= right;
        }
        return false;
    }

    async runCommandQueue() {
        return new Promise((resolve, reject) => {
            let lastTimestamp = performance.now();
            const executionStack = [{ commands: this.commandQueue, index: 0 }];
            if (!this.executionEnv) {
                this.executionEnv = new Environment(null);
            }

            const processNextCommand = (timestamp) => {
                if (this.shouldStop) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    this.executionEnv = null;
                    reject(new RavlykError("EXECUTION_STOPPED_BY_USER"));
                    return;
                }

                if (this.isPaused) {
                    lastTimestamp = timestamp;
                    this.animationFrameId = requestAnimationFrame(processNextCommand);
                    return;
                }

                while (executionStack.length > 0) {
                    const topFrame = executionStack[executionStack.length - 1];
                    if (topFrame.index < topFrame.commands.length) break;
                    executionStack.pop();
                }

                if (executionStack.length === 0) {
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    this.executionEnv = null;
                    resolve();
                    return;
                }

                const currentFrame = executionStack[executionStack.length - 1];
                const currentCommandObject = currentFrame.commands[currentFrame.index];
                this.currentCommandIndex = currentFrame.rootIndex ?? currentFrame.index;
                this.commandIndicatorUpdater(currentCommandObject.original, this.currentCommandIndex);

                try {
                    const deltaTime = this.config.animationEnabled ? (timestamp - lastTimestamp) / 1000 : Infinity;
                    lastTimestamp = timestamp;

                    let commandDone = true;

                    switch (currentCommandObject.type) {
                        case "ASSIGN_AST": {
                            const value = this.evalAstNumberExpression(currentCommandObject.expr, this.executionEnv);
                            if (!Number.isFinite(value)) {
                                throw new RavlykError("VARIABLE_VALUE_INVALID", currentCommandObject.name, String(value));
                            }
                            this.executionEnv.set(currentCommandObject.name, value);
                            break;
                        }
                        case "PEN_UP":
                            commandDone = this.animatePen(currentCommandObject, 1.2, deltaTime);
                            if (commandDone) this.state.isPenDown = false;
                            break;
                        case "PEN_DOWN":
                            this.state.isPenDown = true;
                            commandDone = this.animatePen(currentCommandObject, 1.0, deltaTime);
                            break;
                        case "MOVE":
                            commandDone = this.animateMove(currentCommandObject, currentCommandObject.value, deltaTime);
                            break;
                        case "MOVE_BACK":
                            commandDone = this.animateMove(currentCommandObject, -currentCommandObject.value, deltaTime);
                            break;
                        case "TURN":
                        case "TURN_LEFT":
                            this.state.isStuck = false;
                            this.boundaryWarningShown = false;
                            const angle = currentCommandObject.type === "TURN" ? currentCommandObject.value : -currentCommandObject.value;
                            commandDone = this.animateTurn(currentCommandObject, angle, deltaTime);
                            break;
                        case "COLOR":
                            this.setColor(currentCommandObject.value);
                            break;
                        case "GOTO":
                            this.performGoto(currentCommandObject.x, currentCommandObject.y);
                            break;
                        case "CLEAR":
                            this.clearScreen();
                            break;
                        case "REPEAT":
                            if (currentCommandObject.count <= 0 || !currentCommandObject.commands?.length) {
                                commandDone = true;
                                break;
                            }

                            if (typeof currentCommandObject.remainingIterations !== 'number') {
                                currentCommandObject.remainingIterations = currentCommandObject.count;
                            }

                            if (currentCommandObject.remainingIterations <= 0) {
                                delete currentCommandObject.remainingIterations;
                                commandDone = true;
                            } else {
                                currentCommandObject.remainingIterations -= 1;
                                const oneIteration = currentCommandObject.commands.map((cmd) => this.cloneCommand(cmd));
                                if (oneIteration.length > 0) {
                                    executionStack.push({
                                        commands: oneIteration,
                                        index: 0,
                                        rootIndex: currentFrame.rootIndex ?? currentFrame.index,
                                    });
                                }
                                commandDone = false;
                            }
                            break;
                        case "IF": {
                            const isTrue = this.evaluateIfCondition(currentCommandObject.condition);
                            const branch = isTrue ? currentCommandObject.thenCommands : currentCommandObject.elseCommands;
                            if (Array.isArray(branch) && branch.length > 0) {
                                executionStack.push({
                                    commands: branch.map((cmd) => this.cloneCommand(cmd)),
                                    index: 0,
                                    rootIndex: currentFrame.rootIndex ?? currentFrame.index,
                                });
                            }
                            break;
                        }
                        default:
                            console.error("Unknown command type:", currentCommandObject);
                            commandDone = true;
                    }

                    this.updateRavlykVisualState();

                    if (commandDone) currentFrame.index++;

                    this.animationFrameId = requestAnimationFrame(processNextCommand);

                } catch (err) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    this.executionEnv = null;
                    reject(err);
                }
            };
            this.animationFrameId = requestAnimationFrame(processNextCommand);
        });
    }

    animatePen(commandObject, targetScale, deltaTime) {
        const DURATION = 0.2; // Animation duration in seconds
        if (!this.config.animationEnabled) {
            this.state.scale = targetScale;
            return true;
        }

        if (typeof commandObject.animationProgress === 'undefined') {
            commandObject.animationProgress = 0;
            commandObject.startScale = this.state.scale;
        }

        commandObject.animationProgress += deltaTime;
        const progress = Math.min(commandObject.animationProgress / DURATION, 1);

        // Linear interpolation for smooth scale transition
        this.state.scale = commandObject.startScale + (targetScale - commandObject.startScale) * progress;

        if (progress >= 1) {
            delete commandObject.animationProgress;
            delete commandObject.startScale;
            return true;
        }
        return false;
    }

    animateMove(commandObject, totalDistance, deltaTime) {
        if (this.state.isStuck) return true;

        if (!this.config.animationEnabled || deltaTime === Infinity || this.config.moveSpeed <= 0) {
            const boundaryHit = this._performMove(totalDistance);
            if (boundaryHit) this.state.isStuck = true;
            delete commandObject.remainingDistance;
            return true;
        }

        if (typeof commandObject.remainingDistance === 'undefined') {
            commandObject.remainingDistance = totalDistance;
        }

        let currentMoveSpeed = this.config.moveSpeed;
        if (!this.state.isPenDown) {
            currentMoveSpeed *= 0.7;
        }

        const direction = Math.sign(commandObject.remainingDistance);
        const distanceThisFrame = Math.min(
            Math.abs(commandObject.remainingDistance),
            currentMoveSpeed * deltaTime
        ) * direction;

        const boundaryHit = this._performMove(distanceThisFrame);
        commandObject.remainingDistance -= distanceThisFrame;

        if (boundaryHit) {
            this.state.isStuck = true;
            if (this.infoNotifier && !this.boundaryWarningShown) {
                this.infoNotifier(ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS, 5000);
                this.boundaryWarningShown = true;
            }
            delete commandObject.remainingDistance;
            return true;
        }

        if (Math.abs(commandObject.remainingDistance) < 1e-6) {
            delete commandObject.remainingDistance;
            return true;
        }
        return false;
    }

    _performMove(distance) {
        const oldX = this.state.x;
        const oldY = this.state.y;
        const radians = (this.state.angle * Math.PI) / 180;
        let newX = oldX + distance * Math.cos(radians);
        let newY = oldY + distance * Math.sin(radians);

        const { boundedX, boundedY } = this.clampToCanvasBounds(newX, newY);
        const boundaryHit = (newX !== boundedX || newY !== boundedY);

        this.state.x = boundedX;
        this.state.y = boundedY;

        if (this.state.isPenDown) {
            this.ctx.beginPath();
            this.ctx.moveTo(oldX, oldY);
            if (this.state.isRainbow) {
                this.state.rainbowHue = (this.state.rainbowHue + Math.abs(distance) * 0.5) % 360;
                if (this.state.rainbowHue < 0) this.state.rainbowHue += 360;
                this.applyContextSettings();
            }
            this.ctx.lineTo(this.state.x, this.state.y);
            this.ctx.stroke();
        }
        
        return boundaryHit;
    }

    animateTurn(commandObject, totalAngle, deltaTime) {
        if (!this.config.animationEnabled || deltaTime === Infinity || this.config.turnSpeed <= 0) {
            this._performTurn(totalAngle);
            delete commandObject.remainingAngle;
            return true;
        }

        if (typeof commandObject.remainingAngle === 'undefined') {
            commandObject.remainingAngle = totalAngle;
        }

        const direction = Math.sign(commandObject.remainingAngle);
        const angleThisFrame = Math.min(
            Math.abs(commandObject.remainingAngle),
            this.config.turnSpeed * deltaTime
        ) * direction;

        this._performTurn(angleThisFrame);
        commandObject.remainingAngle -= angleThisFrame;

        if (Math.abs(commandObject.remainingAngle) < 1e-6) {
            delete commandObject.remainingAngle;
            return true;
        }
        return false;
    }

    _performTurn(angle) {
        this.state.angle = (this.state.angle + angle) % 360;
        if (this.state.angle < 0) this.state.angle += 360;
    }

    setColor(colorName) {
        const normalized = String(colorName || "").toLowerCase();
        const mappedColor = COLOR_MAP[normalized];
        if (!mappedColor) {
            throw new RavlykError("UNKNOWN_COLOR", colorName);
        }
        if (mappedColor === "RAINBOW") {
            this.state.isRainbow = true;
        } else {
            this.state.isRainbow = false;
            this.state.color = mappedColor;
        }
        this.applyContextSettings();
    }

    clearScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    performGoto(logicalX, logicalY) {
        const oldX = this.state.x;
        const oldY = this.state.y;

        const canvasTargetX = (this.canvas.width / 2) + logicalX;
        const canvasTargetY = (this.canvas.height / 2) - logicalY;
        const { boundedX, boundedY } = this.clampToCanvasBounds(canvasTargetX, canvasTargetY);
        const boundaryHit = (canvasTargetX !== boundedX || canvasTargetY !== boundedY);

        this.state.x = boundedX;
        this.state.y = boundedY;

        if (this.state.isPenDown) {
            this.ctx.beginPath();
            this.ctx.moveTo(oldX, oldY);
            this.ctx.lineTo(this.state.x, this.state.y);
            this.ctx.stroke();
        }

        if (boundaryHit && this.infoNotifier && !this.boundaryWarningShown) {
            this.infoNotifier(ERROR_MESSAGES.CANVAS_OUT_OF_BOUNDS, 5000);
            this.boundaryWarningShown = true;
        }
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
        this.shouldStop = true;
        this.isPaused = false;
        this.stopGameLoop(new RavlykError("EXECUTION_STOPPED_BY_USER"));
    }

    destroy() {
        if (this.isDestroyed) return;
        this.isDestroyed = true;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.gameLoopTimerId) {
            clearInterval(this.gameLoopTimerId);
            this.gameLoopTimerId = null;
        }

        if (typeof window !== "undefined" && window.removeEventListener) {
            window.removeEventListener("keydown", this.onKeyDown);
            window.removeEventListener("keyup", this.onKeyUp);
        }

        this.gameLoopReject = null;
        this.shouldStop = true;
        this.isPaused = false;
        this.isExecuting = false;
        this.executionEnv = null;
        this.commandQueue = [];
        this.currentCommandIndex = 0;
        this.pressedKeys.clear();
    }

    pauseExecution() {
        if (this.isExecuting) {
            this.isPaused = true;
        }
    }

    resumeExecution() {
        this.isPaused = false;
    }
    
    wasBoundaryWarningShown() {
        return this.boundaryWarningShown;
    }
}



