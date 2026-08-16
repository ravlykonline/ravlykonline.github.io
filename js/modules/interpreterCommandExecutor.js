export function executeInterpreterCommand({
    currentCommandObject,
    deltaTime,
    semanticDeltaTime,
    executionEnv,
    evalAstNumberExpression,
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
    resetStuckState,
    state,
}) {
    let commandDone = true;

    switch (currentCommandObject.type) {
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
        default:
            console.error('Unknown command type:', currentCommandObject);
            commandDone = true;
    }

    return commandDone;
}
