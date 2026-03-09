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
    performGoto,
    clearToDefaultSheet,
}) {
    if (!stmt || !stmt.type) return false;

    if (stmt.type === 'MoveStmt') {
        const value = evalAstNumberExpression(stmt.distance, env);
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
        if (mode === 'queue') {
            outputQueue.push({ type: 'COLOR', value: stmt.colorName, original: 'колір' });
        } else {
            setColor(stmt.colorName);
        }
        return true;
    }

    if (stmt.type === 'BackgroundStmt') {
        if (mode === 'queue') {
            outputQueue.push({ type: 'BACKGROUND', value: stmt.colorName, original: 'фон' });
        } else {
            setBackgroundColor(stmt.colorName);
        }
        return true;
    }

    if (stmt.type === 'GotoStmt') {
        const x = evalAstNumberExpression(stmt.x, env);
        const y = evalAstNumberExpression(stmt.y, env);
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
