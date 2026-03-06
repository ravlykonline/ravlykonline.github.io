export function executeInterpreterCommand({
    currentCommandObject,
    currentFrame,
    executionStack,
    deltaTime,
    executionEnv,
    evalAstNumberExpression,
    createVariableValueInvalidError,
    animatePen,
    animateMove,
    animateTurn,
    setColor,
    performGoto,
    clearScreen,
    cloneCommand,
    evaluateIfCondition,
    resetStuckState,
    state,
}) {
    let commandDone = true;

    switch (currentCommandObject.type) {
        case 'ASSIGN_AST': {
            const value = evalAstNumberExpression(currentCommandObject.expr, executionEnv);
            if (!Number.isFinite(value)) {
                throw createVariableValueInvalidError(currentCommandObject.name, String(value));
            }
            executionEnv.set(currentCommandObject.name, value);
            break;
        }
        case 'PEN_UP':
            commandDone = animatePen(currentCommandObject, 1.2, deltaTime);
            if (commandDone) state.isPenDown = false;
            break;
        case 'PEN_DOWN':
            state.isPenDown = true;
            commandDone = animatePen(currentCommandObject, 1.0, deltaTime);
            break;
        case 'MOVE':
            commandDone = animateMove(currentCommandObject, currentCommandObject.value, deltaTime);
            break;
        case 'MOVE_BACK':
            commandDone = animateMove(currentCommandObject, -currentCommandObject.value, deltaTime);
            break;
        case 'TURN':
        case 'TURN_LEFT':
            resetStuckState();
            commandDone = animateTurn(
                currentCommandObject,
                currentCommandObject.type === 'TURN' ? currentCommandObject.value : -currentCommandObject.value,
                deltaTime
            );
            break;
        case 'COLOR':
            setColor(currentCommandObject.value);
            break;
        case 'GOTO':
            performGoto(currentCommandObject.x, currentCommandObject.y);
            break;
        case 'CLEAR':
            clearScreen();
            break;
        case 'REPEAT':
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
                const oneIteration = currentCommandObject.commands.map((cmd) => cloneCommand(cmd));
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
        case 'IF': {
            const isTrue = evaluateIfCondition(currentCommandObject.condition);
            const branch = isTrue ? currentCommandObject.thenCommands : currentCommandObject.elseCommands;
            if (Array.isArray(branch) && branch.length > 0) {
                executionStack.push({
                    commands: branch.map((cmd) => cloneCommand(cmd)),
                    index: 0,
                    rootIndex: currentFrame.rootIndex ?? currentFrame.index,
                });
            }
            break;
        }
        default:
            console.error('Unknown command type:', currentCommandObject);
            commandDone = true;
    }

    return commandDone;
}
