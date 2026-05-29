export function executeInterpreterCommand({
    currentCommandObject,
    currentFrame,
    executionStack,
    deltaTime,
    semanticDeltaTime,
    executionEnv,
    evalAstNumberExpression,
    createVariableValueInvalidError,
    animatePen,
    animateMove,
    animateTurn,
    animateWait,
    setColor,
    setBackgroundColor,
    setThickness,
    performGoto,
    performHome,
    clearToDefaultSheet,
    setEmbroideryMode = null,
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
        case 'MOVE': {
            if (currentCommandObject._resolvedValue === undefined) {
                currentCommandObject._resolvedValue = evalAstNumberExpression(
                    currentCommandObject.distanceExpr,
                    executionEnv
                );
            }
            commandDone = animateMove(currentCommandObject, currentCommandObject._resolvedValue, deltaTime);
            break;
        }
        case 'MOVE_BACK': {
            if (currentCommandObject._resolvedValue === undefined) {
                currentCommandObject._resolvedValue = evalAstNumberExpression(
                    currentCommandObject.distanceExpr,
                    executionEnv
                );
            }
            commandDone = animateMove(currentCommandObject, -currentCommandObject._resolvedValue, deltaTime);
            break;
        }
        case 'TURN':
        case 'TURN_LEFT': {
            resetStuckState();
            if (currentCommandObject._resolvedValue === undefined) {
                currentCommandObject._resolvedValue = evalAstNumberExpression(
                    currentCommandObject.angleExpr,
                    executionEnv
                );
            }
            const turnSign = currentCommandObject.type === 'TURN' ? 1 : -1;
            commandDone = animateTurn(currentCommandObject, turnSign * currentCommandObject._resolvedValue, deltaTime);
            break;
        }
        case 'COLOR':
            setColor(currentCommandObject.value);
            break;
        case 'BACKGROUND':
            setBackgroundColor(currentCommandObject.value);
            break;
        case 'THICKNESS':
            setThickness(currentCommandObject.value);
            break;
        case 'GOTO': {
            let gotoX = currentCommandObject.x;
            let gotoY = currentCommandObject.y;
            if (gotoX === undefined) {
                gotoX = evalAstNumberExpression(currentCommandObject.xExpr, executionEnv);
                gotoY = evalAstNumberExpression(currentCommandObject.yExpr, executionEnv);
            }
            performGoto(gotoX, gotoY);
            break;
        }
        case 'HOME':
            performHome();
            break;
        case 'HIDE_RAVLYK':
            state.isVisible = false;
            break;
        case 'SHOW_RAVLYK':
            state.isVisible = true;
            break;
        case 'CLEAR':
            clearToDefaultSheet();
            break;
        case 'EMBROIDERY':
            if (typeof setEmbroideryMode === 'function') {
                setEmbroideryMode(currentCommandObject.mode === 'on');
            }
            break;
        case 'WAIT':
            // Use real frame time, not animation deltaTime (which may be Infinity).
            commandDone = animateWait(currentCommandObject, semanticDeltaTime ?? deltaTime);
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
