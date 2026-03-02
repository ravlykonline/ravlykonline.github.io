// js/modules/ravlykInterpreter.js
import {
    DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    CANVAS_BOUNDARY_PADDING, ERROR_MESSAGES,
    DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
} from './constants.js';
import { RavlykParser, RavlykError } from './ravlykParser.js';

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
        this.parser = new RavlykParser();

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
        return this.parser.parseTokens(tokens, depth, substitutions, tokenMeta);
    }

    async executeCommands(commandsString) {
        if (this.isExecuting) {
            throw new RavlykError("EXECUTION_IN_PROGRESS");
        }

        this.isExecuting = true;
        this.shouldStop = false;
        this.currentCommandIndex = 0;
        this.boundaryWarningShown = false;
        this.parser.resetUserState();

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
            const executionStack = [{ commands: this.commandQueue, index: 0 }];

            const processNextCommand = (timestamp) => {
                if (this.shouldStop) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    reject(new RavlykError("EXECUTION_STOPPED_BY_USER"));
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


