// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP, CANVAS_BOUNDARY_PADDING,
    ERROR_MESSAGES, DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';

const RESERVED_COMMAND_NAMES = new Set([
    "вперед", "forward",
    "назад", "backward",
    "праворуч", "right",
    "ліворуч", "left",
    "колір", "color",
    "підняти", "penup",
    "опустити", "pendown",
    "очистити", "clear",
    "перейти", "goto",
    "повторити", "повтори", "repeat",
    "створити", "create",
]);
const STRICT_NUMBER_REGEX = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const STRICT_INTEGER_REGEX = /^[-+]?\d+$/;

class RavlykError extends Error {
    constructor(messageKey, ...params) {
        const messageTemplate = ERROR_MESSAGES[messageKey] || "Невідома помилка інтерпретатора";
        const message = typeof messageTemplate === 'function' ? messageTemplate(...params) : messageTemplate;
        super(message);
        this.name = "RavlykError";
    }
}

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
        };

        this.isExecuting = false;
        this.shouldStop = false;
        this.animationFrameId = null;
        this.commandQueue = [];
        this.currentCommandIndex = 0;
        this.boundaryWarningShown = false;
        this.userFunctions = {};
        this.userVariables = {};

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
        this.isExecuting = false;
        this.shouldStop = false;
        this.commandQueue = [];
        this.currentCommandIndex = 0;
        this.userFunctions = {};
        this.userVariables = {};

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

    setAnimationEnabled(enabled) {
        this.config.animationEnabled = !!enabled;
    }

    setSpeed(moveSpeed, turnSpeed) {
        this.config.moveSpeed = moveSpeed > 0 ? moveSpeed : DEFAULT_MOVE_PIXELS_PER_SECOND;
        this.config.turnSpeed = turnSpeed > 0 ? turnSpeed : DEFAULT_TURN_DEGREES_PER_SECOND;
    }

    tokenize(codeStr) {
        const lines = codeStr.split(/[\n\r]+/)
            .map(line => line.replace(/#.*/, '').trim())
            .filter(line => line.length > 0);
        const combinedCode = lines.join(' ');
        const tokens = combinedCode.match(/[()=]|[^\s()=]+/g) || [];
        return tokens.filter(token => token.trim() !== "");
    }

    async executeCommands(commandsString) {
        if (this.isExecuting) {
            throw new RavlykError("EXECUTION_IN_PROGRESS");
        }
        this.isExecuting = true;
        this.shouldStop = false;
        this.currentCommandIndex = 0;
        this.boundaryWarningShown = false;
        this.userFunctions = {};
        this.userVariables = {};

        try {
            const tokens = this.tokenize(commandsString);
            this.commandQueue = this.parseTokens(tokens);
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

    normalizeIdentifier(identifier) {
        return String(identifier || "").toLowerCase();
    }

    resolveToken(token, substitutions) {
        const normalized = this.normalizeIdentifier(token);
        if (substitutions && Object.prototype.hasOwnProperty.call(substitutions, normalized)) {
            return String(substitutions[normalized]);
        }
        if (Object.prototype.hasOwnProperty.call(this.userVariables, normalized)) {
            return String(this.userVariables[normalized]);
        }
        return token;
    }

    hasBoundValue(token, substitutions) {
        const normalized = this.normalizeIdentifier(token);
        if (substitutions && Object.prototype.hasOwnProperty.call(substitutions, normalized)) {
            return true;
        }
        return Object.prototype.hasOwnProperty.call(this.userVariables, normalized);
    }

    isValidIdentifier(identifier) {
        return /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(identifier);
    }

    parseStrictNumberOrThrow(rawToken, substitutions, errorKey, ...errorParams) {
        const resolved = this.resolveToken(rawToken, substitutions);
        if (STRICT_NUMBER_REGEX.test(resolved)) {
            return { resolved, value: Number(resolved) };
        }
        if (this.isValidIdentifier(rawToken) && !this.hasBoundValue(rawToken, substitutions)) {
            throw new RavlykError("UNDEFINED_VARIABLE", rawToken);
        }
        throw new RavlykError(errorKey, ...errorParams, resolved);
    }

    parseStrictIntegerOrThrow(rawToken, substitutions, errorKey, ...errorParams) {
        const resolved = this.resolveToken(rawToken, substitutions);
        if (STRICT_INTEGER_REGEX.test(resolved)) {
            return { resolved, value: Number(resolved) };
        }
        if (this.isValidIdentifier(rawToken) && !this.hasBoundValue(rawToken, substitutions)) {
            throw new RavlykError("UNDEFINED_VARIABLE", rawToken);
        }
        throw new RavlykError(errorKey, ...errorParams, resolved);
    }

    isArithmeticOperator(token) {
        return token === "+" || token === "-" || token === "*" || token === "/";
    }

    applyArithmeticOperator(leftValue, operator, rightValue, errorKey, ...errorParams) {
        if (operator === "+") return leftValue + rightValue;
        if (operator === "-") return leftValue - rightValue;
        if (operator === "*") return leftValue * rightValue;
        if (operator === "/") {
            if (rightValue === 0) throw new RavlykError(errorKey, ...errorParams);
            return leftValue / rightValue;
        }
        throw new RavlykError(errorKey, ...errorParams);
    }

    parseNumberExpressionOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        if (startIndex >= tokens.length) {
            throw new RavlykError(errorKey, ...errorParams);
        }

        const leftToken = this.parseStrictNumberOrThrow(tokens[startIndex], substitutions, errorKey, ...errorParams);
        const operatorIndex = startIndex + 1;
        const rightIndex = startIndex + 2;

        if (
            operatorIndex < tokens.length &&
            this.isArithmeticOperator(tokens[operatorIndex]) &&
            rightIndex < tokens.length
        ) {
            const rightToken = this.parseStrictNumberOrThrow(tokens[rightIndex], substitutions, errorKey, ...errorParams);
            const resolvedExpression = `${leftToken.resolved} ${tokens[operatorIndex]} ${rightToken.resolved}`;
            let value;
            try {
                value = this.applyArithmeticOperator(
                    leftToken.value,
                    tokens[operatorIndex],
                    rightToken.value,
                    errorKey,
                    ...errorParams,
                    resolvedExpression
                );
            } catch (error) {
                if (error instanceof RavlykError) {
                    throw error;
                }
                throw new RavlykError(errorKey, ...errorParams, resolvedExpression);
            }
            if (!Number.isFinite(value)) {
                throw new RavlykError(errorKey, ...errorParams, resolvedExpression);
            }
            return {
                value,
                resolved: resolvedExpression,
                nextIndex: rightIndex + 1,
            };
        }

        return {
            value: leftToken.value,
            resolved: leftToken.resolved,
            nextIndex: operatorIndex,
        };
    }

    parseIntegerExpressionOrThrow(tokens, startIndex, substitutions, errorKey, ...errorParams) {
        const expression = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex,
            substitutions,
            errorKey,
            ...errorParams
        );
        if (!Number.isInteger(expression.value)) {
            throw new RavlykError(errorKey, ...errorParams, expression.resolved);
        }
        return expression;
    }

    parseVariableAssignment(tokens, startIndex, substitutions, createdWithKeyword = false) {
        const nameIndex = createdWithKeyword ? startIndex + 1 : startIndex;
        const eqIndex = createdWithKeyword ? startIndex + 2 : startIndex + 1;
        const valueIndex = createdWithKeyword ? startIndex + 3 : startIndex + 2;

        if (valueIndex >= tokens.length || tokens[eqIndex] !== "=") {
            throw new RavlykError("VARIABLE_DECLARATION_SYNTAX");
        }

        const variableName = tokens[nameIndex];
        const variableKey = this.normalizeIdentifier(variableName);

        if (!this.isValidIdentifier(variableName)) {
            throw new RavlykError("VARIABLE_NAME_INVALID", variableName);
        }
        if (RESERVED_COMMAND_NAMES.has(variableKey)) {
            throw new RavlykError("VARIABLE_NAME_RESERVED", variableName);
        }
        if (this.userFunctions[variableKey]) {
            throw new RavlykError("VARIABLE_NAME_CONFLICT_FUNCTION", variableName);
        }

        const parsedValue = this.parseNumberExpressionOrThrow(
            tokens,
            valueIndex,
            substitutions,
            "VARIABLE_VALUE_INVALID",
            variableName
        );
        this.userVariables[variableKey] = parsedValue.value;
        return parsedValue.nextIndex;
    }

    parseCreateStatement(tokens, startIndex, substitutions) {
        if (startIndex + 2 >= tokens.length) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        if (tokens[startIndex + 2] === "=") {
            return this.parseVariableAssignment(tokens, startIndex, substitutions, true);
        }
        if (tokens[startIndex + 2] === "(") {
            return this.parseFunctionDeclaration(tokens, startIndex);
        }
        throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
    }

    parseFunctionDeclaration(tokens, startIndex) {
        if (startIndex + 5 >= tokens.length) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        const functionName = tokens[startIndex + 1];
        const nameLower = this.normalizeIdentifier(functionName);
        if (!this.isValidIdentifier(functionName)) {
            throw new RavlykError("FUNCTION_NAME_INVALID", functionName);
        }
        if (RESERVED_COMMAND_NAMES.has(nameLower)) {
            throw new RavlykError("FUNCTION_NAME_RESERVED", functionName);
        }
        if (Object.prototype.hasOwnProperty.call(this.userVariables, nameLower)) {
            throw new RavlykError("FUNCTION_NAME_CONFLICT_VARIABLE", functionName);
        }
        if (this.userFunctions[nameLower]) {
            throw new RavlykError("FUNCTION_ALREADY_EXISTS", functionName);
        }

        if (tokens[startIndex + 2] !== "(") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }
        const paramName = tokens[startIndex + 3];
        if (!this.isValidIdentifier(paramName)) {
            throw new RavlykError("FUNCTION_PARAM_INVALID", paramName);
        }
        if (RESERVED_COMMAND_NAMES.has(this.normalizeIdentifier(paramName))) {
            throw new RavlykError("FUNCTION_PARAM_RESERVED", paramName);
        }
        if (tokens[startIndex + 4] !== ")") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }
        if (tokens[startIndex + 5] !== "(") {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        let parenBalance = 1;
        let bodyStart = startIndex + 6;
        let bodyEnd = bodyStart;
        while (bodyEnd < tokens.length) {
            if (tokens[bodyEnd] === "(") parenBalance++;
            else if (tokens[bodyEnd] === ")") parenBalance--;
            if (parenBalance === 0) break;
            bodyEnd++;
        }

        if (parenBalance !== 0) {
            throw new RavlykError("FUNCTION_DECLARATION_SYNTAX");
        }

        const bodyTokens = tokens.slice(bodyStart, bodyEnd);
        if (bodyTokens.length === 0) {
            throw new RavlykError("FUNCTION_BODY_EMPTY", functionName);
        }

        this.userFunctions[nameLower] = {
            name: functionName,
            paramName: this.normalizeIdentifier(paramName),
            bodyTokens,
        };

        return bodyEnd + 1;
    }

    tryParseFunctionCall(tokens, startIndex, depth, substitutions) {
        const functionName = tokens[startIndex];
        const nameLower = this.normalizeIdentifier(functionName);
        const functionDef = this.userFunctions[nameLower];
        if (!functionDef) return null;

        if (startIndex + 2 >= tokens.length || tokens[startIndex + 1] !== "(") {
            throw new RavlykError("FUNCTION_CALL_SYNTAX", functionName);
        }

        const parsedArgument = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 2,
            substitutions,
            "FUNCTION_ARGUMENT_INVALID",
            functionName
        );
        if (parsedArgument.nextIndex >= tokens.length || tokens[parsedArgument.nextIndex] !== ")") {
            throw new RavlykError("FUNCTION_CALL_SYNTAX", functionName);
        }
        const localSubstitutions = { ...substitutions, [functionDef.paramName]: parsedArgument.value };
        const expandedCommands = this.parseTokens(functionDef.bodyTokens, depth + 1, localSubstitutions);

        return {
            commands: expandedCommands,
            nextIndex: parsedArgument.nextIndex + 1,
        };
    }

    parseMoveCommand(tokens, startIndex, token, originalToken, substitutions, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_DISTANCE", originalToken);
        const distanceToken = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_DISTANCE",
            originalToken
        );
        queue.push({
            type: (token === "вперед" || token === "forward") ? "MOVE" : "MOVE_BACK",
            value: distanceToken.value,
            original: `${originalToken} ${distanceToken.resolved}`
        });
        return distanceToken.nextIndex;
    }

    parseTurnCommand(tokens, startIndex, token, originalToken, substitutions, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_ANGLE", originalToken);
        const angleToken = this.parseNumberExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_ANGLE",
            originalToken
        );
        queue.push({
            type: (token === "праворуч" || token === "right") ? "TURN" : "TURN_LEFT",
            value: angleToken.value,
            original: `${originalToken} ${angleToken.resolved}`
        });
        return angleToken.nextIndex;
    }

    parseColorCommand(tokens, startIndex, originalToken, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("NO_COLOR_NAME", originalToken);
        const colorName = tokens[startIndex + 1].toLowerCase();
        if (!COLOR_MAP[colorName]) throw new RavlykError("UNKNOWN_COLOR", tokens[startIndex + 1]);
        queue.push({
            type: "COLOR",
            value: colorName,
            original: `${originalToken} ${tokens[startIndex + 1]}`
        });
        return startIndex + 2;
    }

    parseGotoCommand(tokens, startIndex, originalToken, substitutions, queue) {
        let xIndex = startIndex + 1;
        const maybePreposition = tokens[xIndex]?.toLowerCase();
        if (maybePreposition === "в" || maybePreposition === "to") {
            xIndex++;
        }

        if (xIndex >= tokens.length) throw new RavlykError("NO_POSITION_X", originalToken);

        const xToken = this.parseNumberExpressionOrThrow(
            tokens,
            xIndex,
            substitutions,
            "INVALID_POSITION_X",
            originalToken
        );
        if (xToken.nextIndex >= tokens.length) throw new RavlykError("NO_POSITION_Y", originalToken);
        const yToken = this.parseNumberExpressionOrThrow(
            tokens,
            xToken.nextIndex,
            substitutions,
            "INVALID_POSITION_Y",
            originalToken
        );

        queue.push({
            type: "GOTO",
            x: xToken.value,
            y: yToken.value,
            original: `${originalToken} ${xToken.resolved} ${yToken.resolved}`
        });

        return yToken.nextIndex;
    }

    parseSimpleCommand(startIndex, type, originalToken, queue) {
        queue.push({ type, original: originalToken });
        return startIndex + 1;
    }

    parseRepeatCommand(tokens, startIndex, originalToken, depth, substitutions, queue) {
        if (startIndex + 1 >= tokens.length) throw new RavlykError("REPEAT_EXPECT_NUMBER");
        const repeatCountToken = this.parseIntegerExpressionOrThrow(
            tokens,
            startIndex + 1,
            substitutions,
            "INVALID_REPEAT_COUNT"
        );
        const repeatCount = repeatCountToken.value;
        if (repeatCount < 0) throw new RavlykError("INVALID_REPEAT_COUNT", repeatCountToken.resolved);
        if (repeatCount > MAX_REPEATS_IN_LOOP) {
            console.warn(`Warning: Repeat count ${repeatCount} exceeds maximum ${MAX_REPEATS_IN_LOOP}. Clamping to max.`);
        }
        const actualRepeatCount = Math.min(repeatCount, MAX_REPEATS_IN_LOOP);

        if (repeatCountToken.nextIndex >= tokens.length || tokens[repeatCountToken.nextIndex] !== "(") {
            throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
        }

        let parenBalance = 1;
        const subTokensStart = repeatCountToken.nextIndex + 1;
        let subTokensEnd = subTokensStart;
        while (subTokensEnd < tokens.length) {
            if (tokens[subTokensEnd] === "(") parenBalance++;
            else if (tokens[subTokensEnd] === ")") parenBalance--;
            if (parenBalance === 0) break;
            subTokensEnd++;
        }

        if (parenBalance !== 0) {
            throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
        }

        const commandsToRepeatTokens = tokens.slice(subTokensStart, subTokensEnd);
        const nestedCommands = this.parseTokens(commandsToRepeatTokens, depth + 1, substitutions);

        if (actualRepeatCount > 0 && nestedCommands.length > 0) {
            queue.push({
                type: "REPEAT",
                count: actualRepeatCount,
                commands: nestedCommands,
                original: `${originalToken} ${repeatCountToken.resolved} (...)`
            });
        }

        return subTokensEnd + 1;
    }

    parseDefaultCommand(tokens, startIndex, depth, substitutions, queue, originalToken) {
        if (this.isValidIdentifier(originalToken) && startIndex + 1 < tokens.length && tokens[startIndex + 1] === "=") {
            return this.parseVariableAssignment(tokens, startIndex, substitutions, false);
        }

        const functionCall = this.tryParseFunctionCall(tokens, startIndex, depth, substitutions);
        if (functionCall) {
            queue.push(...functionCall.commands);
            return functionCall.nextIndex;
        }

        throw new RavlykError("UNKNOWN_COMMAND", originalToken);
    }

    parseTokens(tokens, depth = 0, substitutions = {}) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new RavlykError("TOO_MANY_NESTED_REPEATS");
        }

        const queue = [];
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i].toLowerCase();
            const originalToken = tokens[i];

            switch (token) {
                case "створити": case "create":
                    i = this.parseCreateStatement(tokens, i, substitutions);
                    break;
                case "вперед": case "forward":
                case "назад": case "backward":
                    i = this.parseMoveCommand(tokens, i, token, originalToken, substitutions, queue);
                    break;

                case "праворуч": case "right":
                case "ліворуч": case "left":
                    i = this.parseTurnCommand(tokens, i, token, originalToken, substitutions, queue);
                    break;

                case "колір": case "color":
                    i = this.parseColorCommand(tokens, i, originalToken, queue);
                    break;
                case "перейти": case "goto":
                    i = this.parseGotoCommand(tokens, i, originalToken, substitutions, queue);
                    break;
                case "підняти": case "penup":
                    i = this.parseSimpleCommand(i, "PEN_UP", originalToken, queue);
                    break;
                case "опустити": case "pendown":
                    i = this.parseSimpleCommand(i, "PEN_DOWN", originalToken, queue);
                    break;
                case "очистити": case "clear":
                    i = this.parseSimpleCommand(i, "CLEAR", originalToken, queue);
                    break;
                case "повторити": case "повтори": case "repeat":
                    i = this.parseRepeatCommand(tokens, i, originalToken, depth, substitutions, queue);
                    break;
                case "(": case ")":
                    throw new RavlykError("UNKNOWN_COMMAND", `${originalToken} (неочікувана дужка)`);
                default:
                    i = this.parseDefaultCommand(tokens, i, depth, substitutions, queue, originalToken);
            }
        }
        return queue;
    }
    cloneCommand(command) {
        const cloned = { ...command };
        if (Array.isArray(command.commands)) {
            cloned.commands = command.commands.map((nestedCommand) => this.cloneCommand(nestedCommand));
        }
        delete cloned.remainingDistance;
        delete cloned.remainingAngle;
        delete cloned.animationProgress;
        delete cloned.startScale;
        return cloned;
    }

    async runCommandQueue() {
        return new Promise((resolve, reject) => {
            let lastTimestamp = performance.now();

            const processNextCommand = (timestamp) => {
                if (this.shouldStop) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    reject(new RavlykError("EXECUTION_STOPPED_BY_USER"));
                    return;
                }

                if (this.currentCommandIndex >= this.commandQueue.length) {
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    resolve();
                    return;
                }

                const currentCommandObject = this.commandQueue[this.currentCommandIndex];
                this.commandIndicatorUpdater(currentCommandObject.original, this.currentCommandIndex);

                try {
                    const deltaTime = this.config.animationEnabled ? (timestamp - lastTimestamp) / 1000 : Infinity;
                    lastTimestamp = timestamp;

                    let commandDone = true;

                    switch (currentCommandObject.type) {
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

                            const oneIteration = currentCommandObject.commands.map((cmd) => this.cloneCommand(cmd));
                            if (currentCommandObject.count > 1) {
                                this.commandQueue.splice(
                                    this.currentCommandIndex,
                                    1,
                                    ...oneIteration,
                                    {
                                        type: "REPEAT",
                                        count: currentCommandObject.count - 1,
                                        commands: currentCommandObject.commands,
                                        original: currentCommandObject.original
                                    }
                                );
                            } else {
                                this.commandQueue.splice(this.currentCommandIndex, 1, ...oneIteration);
                            }
                            commandDone = false;
                            break;
                        default:
                            console.error("Unknown command type:", currentCommandObject);
                            commandDone = true;
                    }

                    this.updateRavlykVisualState();

                    if (commandDone) {
                        this.currentCommandIndex++;
                    }

                    this.animationFrameId = requestAnimationFrame(processNextCommand);

                } catch (err) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
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

        const boundedX = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(newX, this.canvas.width - CANVAS_BOUNDARY_PADDING));
        const boundedY = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(newY, this.canvas.height - CANVAS_BOUNDARY_PADDING));
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
        if (COLOR_MAP[colorName] === "RAINBOW") {
            this.state.isRainbow = true;
        } else {
            this.state.isRainbow = false;
            this.state.color = COLOR_MAP[colorName];
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
        const boundedX = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(canvasTargetX, this.canvas.width - CANVAS_BOUNDARY_PADDING));
        const boundedY = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(canvasTargetY, this.canvas.height - CANVAS_BOUNDARY_PADDING));
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
    }
    
    wasBoundaryWarningShown() {
        return this.boundaryWarningShown;
    }
}

