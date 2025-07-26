// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP, CANVAS_BOUNDARY_PADDING,
    ERROR_MESSAGES, DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';

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
            scale: 1.0 // Новий параметр для анімації масштабу
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
        const tokens = combinedCode.match(/\S+|\(|\)/g) || [];
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

    parseTokens(tokens, depth = 0) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new RavlykError("TOO_MANY_NESTED_REPEATS");
        }

        const queue = [];
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i].toLowerCase();
            const originalToken = tokens[i];

            switch (token) {
                // ... (всі кейси крім PEN_UP/PEN_DOWN такі ж)
                case "вперед": case "forward":
                case "назад": case "backward":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_DISTANCE", originalToken);
                    const distance = parseFloat(tokens[i + 1]);
                    if (isNaN(distance)) throw new RavlykError("INVALID_DISTANCE", originalToken, tokens[i+1]);
                    queue.push({
                        type: (token === "вперед" || token === "forward") ? "MOVE" : "MOVE_BACK",
                        value: distance,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2;
                    break;

                case "праворуч": case "right":
                case "ліворуч": case "left":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_ANGLE", originalToken);
                    const angle = parseFloat(tokens[i + 1]);
                    if (isNaN(angle)) throw new RavlykError("INVALID_ANGLE", originalToken, tokens[i+1]);
                     queue.push({
                        type: (token === "праворуч" || token === "right") ? "TURN" : "TURN_LEFT",
                        value: angle,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2;
                    break;

                case "колір": case "color":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_COLOR_NAME", originalToken);
                    const colorName = tokens[i + 1].toLowerCase();
                    if (!COLOR_MAP[colorName]) throw new RavlykError("UNKNOWN_COLOR", tokens[i + 1]);
                     queue.push({
                        type: "COLOR",
                        value: colorName,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2;
                    break;
                case "підняти": case "penup":
                    queue.push({ type: "PEN_UP", original: originalToken });
                    i += 1;
                    break;
                case "опустити": case "pendown":
                    queue.push({ type: "PEN_DOWN", original: originalToken });
                    i += 1;
                    break;
                case "очистити": case "clear":
                    queue.push({ type: "CLEAR", original: originalToken });
                    i += 1;
                    break;
                case "повторити": case "повтори": case "repeat":
                    if (i + 1 >= tokens.length) throw new RavlykError("REPEAT_EXPECT_NUMBER");
                    const repeatCount = parseInt(tokens[i + 1], 10);
                    if (isNaN(repeatCount) || repeatCount < 0) throw new RavlykError("INVALID_REPEAT_COUNT", tokens[i+1]);
                    if (repeatCount > MAX_REPEATS_IN_LOOP) {
                        console.warn(`Warning: Repeat count ${repeatCount} exceeds maximum ${MAX_REPEATS_IN_LOOP}. Clamping to max.`);
                    }
                    const actualRepeatCount = Math.min(repeatCount, MAX_REPEATS_IN_LOOP);

                    if (i + 2 >= tokens.length || tokens[i + 2] !== "(") {
                        throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                    }

                    let parenBalance = 1;
                    let subTokensStart = i + 3;
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
                    const nestedCommands = this.parseTokens(commandsToRepeatTokens, depth + 1);

                    if (actualRepeatCount > 0 && nestedCommands.length > 0) {
                         queue.push({
                            type: "REPEAT",
                            count: actualRepeatCount,
                            commands: nestedCommands,
                            original: `${originalToken} ${tokens[i+1]} (...)`
                        });
                    }
                    i = subTokensEnd + 1;
                    break;
                case "(": case ")":
                    throw new RavlykError("UNKNOWN_COMMAND", `${originalToken} (неочікувана дужка)`);
                default:
                    throw new RavlykError("UNKNOWN_COMMAND", originalToken);
            }
        }
        return queue;
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
                        case "CLEAR":
                            this.clearScreen();
                            break;
                        case "REPEAT":
                            const expandedCommands = [];
                            for (let k = 0; k < currentCommandObject.count; k++) {
                                expandedCommands.push(...JSON.parse(JSON.stringify(currentCommandObject.commands)));
                            }
                            this.commandQueue.splice(this.currentCommandIndex, 1, ...expandedCommands);
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
        const DURATION = 0.2; // Тривалість анімації в секундах
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

        // Лінійна інтерполяція для плавної зміни
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

    handleCanvasResize() {
        this.updateRavlykVisualState(true);
    }

    stopExecution() {
        this.shouldStop = true;
    }
    
    wasBoundaryWarningShown() {
        return this.boundaryWarningShown;
    }
}