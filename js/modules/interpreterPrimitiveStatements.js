import { MIN_WAIT_SECONDS, MAX_WAIT_SECONDS } from './constants.js';

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
    performHome,
    clearToDefaultSheet,
    setEmbroideryMode = null,
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
        if (mode === 'queue') {
            const isRandom = stmt.distance && stmt.distance.kind === 'random';
            const original = stmt.direction === 'backward' ? 'назад' : 'вперед';
            const cmd = { type: stmt.direction === 'backward' ? 'MOVE_BACK' : 'MOVE', original };
            if (isRandom) {
                // Random values must be resolved once at queue-build time.
                const value = resolveMoveDistance(stmt.distance, stmt.direction);
                if (!Number.isFinite(value)) throw createError('INVALID_DISTANCE', original, String(value));
                cmd._resolvedValue = value;
            } else {
                // Validate eagerly to preserve span metadata on error, but store the
                // expression so runtime sees variable values set by preceding if/else.
                const earlyCheck = resolveMoveDistance(stmt.distance, stmt.direction);
                if (!Number.isFinite(earlyCheck)) throw createError('INVALID_DISTANCE', original, String(earlyCheck));
                cmd.distanceExpr = stmt.distance;
            }
            outputQueue.push(cmd);
        } else {
            const value = resolveMoveDistance(stmt.distance, stmt.direction);
            if (!Number.isFinite(value)) {
                const original = stmt.direction === 'backward' ? 'назад' : 'вперед';
                throw createError('INVALID_DISTANCE', original, String(value));
            }
            performMove(stmt.direction === 'backward' ? -value : value);
        }
        return true;
    }

    if (stmt.type === 'TurnStmt') {
        if (mode === 'queue') {
            const original = stmt.direction === 'left' ? 'ліворуч' : 'праворуч';
            const earlyCheck = evalAstNumberExpression(stmt.angle, env);
            if (!Number.isFinite(earlyCheck)) throw createError('INVALID_ANGLE', original, String(earlyCheck));
            outputQueue.push({ type: stmt.direction === 'left' ? 'TURN_LEFT' : 'TURN', angleExpr: stmt.angle, original });
        } else {
            const value = evalAstNumberExpression(stmt.angle, env);
            if (!Number.isFinite(value)) {
                const original = stmt.direction === 'left' ? 'ліворуч' : 'праворуч';
                throw createError('INVALID_ANGLE', original, String(value));
            }
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
        if (mode === 'queue') {
            const isRandom = stmt.target && stmt.target.kind === 'random';
            if (isRandom) {
                const { x, y } = resolveGotoTarget(stmt);
                if (!Number.isFinite(x)) throw createError('INVALID_POSITION_X', 'перейти', String(x));
                if (!Number.isFinite(y)) throw createError('INVALID_POSITION_Y', 'перейти', String(y));
                outputQueue.push({ type: 'GOTO', x, y, original: 'перейти' });
            } else {
                outputQueue.push({ type: 'GOTO', xExpr: stmt.x, yExpr: stmt.y, original: 'перейти' });
            }
        } else {
            const { x, y } = resolveGotoTarget(stmt);
            if (!Number.isFinite(x)) {
                throw createError('INVALID_POSITION_X', 'перейти', String(x));
            }
            if (!Number.isFinite(y)) {
                throw createError('INVALID_POSITION_Y', 'перейти', String(y));
            }
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

    if (stmt.type === 'VisibilityStmt') {
        if (mode === 'queue') {
            outputQueue.push({
                type: stmt.visible ? 'SHOW_RAVLYK' : 'HIDE_RAVLYK',
                original: stmt.visible ? 'показати' : 'сховати',
            });
        } else {
            state.isVisible = !!stmt.visible;
        }
        return true;
    }

    if (stmt.type === 'HomeStmt') {
        if (mode === 'queue') {
            outputQueue.push({ type: 'HOME', original: 'додому' });
        } else if (typeof performHome === 'function') {
            performHome();
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

    if (stmt.type === 'WaitStmt') {
        const seconds = evalAstNumberExpression(stmt.duration, env);
        if (!Number.isFinite(seconds)) {
            throw createError('INVALID_WAIT_VALUE', String(seconds));
        }
        if (seconds < MIN_WAIT_SECONDS || seconds > MAX_WAIT_SECONDS) {
            throw createError('WAIT_OUT_OF_RANGE');
        }
        if (mode === 'queue') {
            outputQueue.push({ type: 'WAIT', seconds, original: 'чекати' });
        }
        // direct mode: handled by caller via animateWait
        return true;
    }

    if (stmt.type === 'EmbroideryStmt') {
        if (mode === 'queue') {
            outputQueue.push({ type: 'EMBROIDERY', mode: stmt.mode, original: stmt.mode === 'on' ? 'вишиванка' : 'звичайний' });
        } else if (typeof setEmbroideryMode === 'function') {
            setEmbroideryMode(stmt.mode === 'on');
        }
        return true;
    }

    return false;
}
