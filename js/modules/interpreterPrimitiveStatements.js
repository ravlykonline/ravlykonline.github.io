export function handlePrimitiveAstStatement({
    stmt,
    env,
    mode,
    outputQueue = null,
    state,
    evalAstNumberExpression,
    createError,
    performMove,
    performTurn,
    setColor,
    setBackgroundColor,
    setThickness,
    pickRandomColorName = null,
    pickRandomBackgroundColorName = null,
    pickSafeRandomDistance = null,
    pickSafeRandomPoint = null,
    performGoto,
    clearToDefaultSheet,
}) {
    if (!stmt || !stmt.type) return false;

    const resolveColorArg = (colorArg, randomPicker) => {
        if (!colorArg) {
            throw createError('UNKNOWN_COLOR', '');
        }
        if (colorArg.kind === 'named') {
            return colorArg.value;
        }
        if (colorArg.kind === 'random' && typeof randomPicker === 'function') {
            return randomPicker();
        }
        if (colorArg.kind !== 'named') {
            throw createError('UNKNOWN_COLOR', String(colorArg && colorArg.value ? colorArg.value : ''));
        }
        return colorArg.value;
    };

    const resolveMoveDistance = (distanceArg, direction) => {
        if (distanceArg && distanceArg.kind === 'random' && typeof pickSafeRandomDistance === 'function') {
            return pickSafeRandomDistance(direction);
        }
        return evalAstNumberExpression(distanceArg, env);
    };

    const resolveGotoTarget = (gotoStmt) => {
        if (gotoStmt && gotoStmt.target && gotoStmt.target.kind === 'random' && typeof pickSafeRandomPoint === 'function') {
            return pickSafeRandomPoint();
        }
        return {
            x: evalAstNumberExpression(gotoStmt.x, env),
            y: evalAstNumberExpression(gotoStmt.y, env),
        };
    };

    if (stmt.type === 'MoveStmt') {
        const value = resolveMoveDistance(stmt.distance, stmt.direction);
        if (!Number.isFinite(value)) {
            const original = stmt.direction === 'backward' ? 'назад' : 'вперед';
            throw createError('INVALID_DISTANCE', original, String(value));
        }
        if (mode === 'queue') {
            outputQueue.push({
                type: stmt.direction === 'backward' ? 'MOVE_BACK' : 'MOVE',
                value,
                original: stmt.direction === 'backward' ? 'назад' : 'вперед',
            });
        } else {
            performMove(stmt.direction === 'backward' ? -value : value);
        }
        return true;
    }

    if (stmt.type === 'TurnStmt') {
        const value = evalAstNumberExpression(stmt.angle, env);
        if (!Number.isFinite(value)) {
            const original = stmt.direction === 'left' ? 'ліворуч' : 'праворуч';
            throw createError('INVALID_ANGLE', original, String(value));
        }
        if (mode === 'queue') {
            outputQueue.push({
                type: stmt.direction === 'left' ? 'TURN_LEFT' : 'TURN',
                value,
                original: stmt.direction === 'left' ? 'ліворуч' : 'праворуч',
            });
        } else {
            performTurn(stmt.direction === 'left' ? -value : value);
        }
        return true;
    }

    if (stmt.type === 'ColorStmt') {
        const colorName = resolveColorArg(stmt.colorArg, pickRandomColorName);
        if (mode === 'queue') {
            outputQueue.push({ type: 'COLOR', value: colorName, original: 'колір' });
        } else {
            setColor(colorName);
        }
        return true;
    }

    if (stmt.type === 'BackgroundStmt') {
        const colorName = resolveColorArg(stmt.colorArg, pickRandomBackgroundColorName);
        if (mode === 'queue') {
            outputQueue.push({ type: 'BACKGROUND', value: colorName, original: 'фон' });
        } else {
            setBackgroundColor(colorName);
        }
        return true;
    }

    if (stmt.type === 'ThicknessStmt') {
        if (mode === 'queue') {
            outputQueue.push({ type: 'THICKNESS', value: stmt.thickness, original: 'товщина' });
        } else {
            setThickness(stmt.thickness);
        }
        return true;
    }

    if (stmt.type === 'GotoStmt') {
        const { x, y } = resolveGotoTarget(stmt);
        if (!Number.isFinite(x)) {
            throw createError('INVALID_POSITION_X', 'перейти', String(x));
        }
        if (!Number.isFinite(y)) {
            throw createError('INVALID_POSITION_Y', 'перейти', String(y));
        }
        if (mode === 'queue') {
            outputQueue.push({ type: 'GOTO', x, y, original: 'перейти' });
        } else {
            performGoto(x, y);
        }
        return true;
    }

    if (stmt.type === 'PenStmt') {
        if (mode === 'queue') {
            outputQueue.push({
                type: stmt.mode === 'up' ? 'PEN_UP' : 'PEN_DOWN',
                original: stmt.mode === 'up' ? 'підняти' : 'опустити',
            });
        } else {
            state.isPenDown = stmt.mode !== 'up';
        }
        return true;
    }

    if (stmt.type === 'ClearStmt') {
        if (mode === 'queue') {
            outputQueue.push({ type: 'CLEAR', original: 'очистити' });
        } else {
            clearToDefaultSheet();
        }
        return true;
    }

    return false;
}
