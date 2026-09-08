import {
    DEFAULT_PEN_COLOR,
    GRID_ALIGN_OFFSET_X,
    GRID_ALIGN_OFFSET_Y,
    RAVLYK_INITIAL_ANGLE,
    UKRAINIAN_COLOR_NAMES,
} from './constants.js';

export const MAX_CANVAS_STATE_LOG_ENTRIES = 50;

// DEFAULT_PEN_COLOR is #000000, while the colour registry's «чорний» is #1A1A1A,
// so the starting pen has no registry name and the panel would show a raw hex
// code in exactly the state a child sees first.
const FALLBACK_COLOR_NAMES = {
    [DEFAULT_PEN_COLOR.toUpperCase()]: 'чорний',
};

export function describeColor(rawColor) {
    const key = String(rawColor || '').toUpperCase();
    return UKRAINIAN_COLOR_NAMES[key] || FALLBACK_COLOR_NAMES[key] || 'власний колір';
}

function roundForLearning(value) {
    const rounded = Math.round(Number(value) * 100) / 100;
    return Object.is(rounded, -0) ? 0 : rounded;
}

export function normalizeLearningAngle(rawAngle) {
    const angle = Number(rawAngle);
    if (!Number.isFinite(angle)) return 0;
    const normalized = ((angle - RAVLYK_INITIAL_ANGLE) % 360 + 360) % 360;
    const rounded = roundForLearning(normalized);
    // Animation accumulates float error, so a completed turn lands just under a
    // full circle and rounds up to 360 — the same heading as 0, and confusing
    // for a child who is learning what the angle means.
    return rounded >= 360 ? 0 : rounded;
}

export function getCanvasStateSnapshot(state, canvas) {
    return {
        x: roundForLearning(Number(state?.x) - ((Number(canvas?.width) / 2) + GRID_ALIGN_OFFSET_X)),
        y: roundForLearning(((Number(canvas?.height) / 2) + GRID_ALIGN_OFFSET_Y) - Number(state?.y)),
        angle: normalizeLearningAngle(state?.angle),
        pen: state?.isPenDown ? 'опущене' : 'підняте',
        color: describeColor(state?.color),
        width: Number(canvas?.width) || 0,
        height: Number(canvas?.height) || 0,
    };
}

export function formatCanvasState(snapshot) {
    return `X ${snapshot.x}, Y ${snapshot.y}, кут ${snapshot.angle}°, перо ${snapshot.pen}, колір ${snapshot.color}, полотно ${snapshot.width} на ${snapshot.height}.`;
}

function primitiveLabel(primitive) {
    const type = primitive?.type || primitive?.stmt?.type || '';
    const labels = {
        MoveStmt: 'Завершено рух',
        MOVE: 'Завершено рух',
        TurnStmt: 'Завершено поворот',
        TURN: 'Завершено поворот',
        PenStmt: 'Змінено стан пера',
        PEN: 'Змінено стан пера',
        ColorStmt: 'Змінено колір',
        COLOR: 'Змінено колір',
        BackgroundStmt: 'Змінено фон',
        BACKGROUND: 'Змінено фон',
        ThicknessStmt: 'Змінено товщину',
        THICKNESS: 'Змінено товщину',
        GotoStmt: 'Завершено перехід',
        GOTO: 'Завершено перехід',
        HomeStmt: 'Равлик повернувся додому',
        HOME: 'Равлик повернувся додому',
        ClearStmt: 'Полотно очищено',
        CLEAR: 'Полотно очищено',
        WaitStmt: 'Завершено очікування',
        WAIT: 'Завершено очікування',
    };
    return labels[type] || 'Завершено команду';
}

export function createCanvasStateController({
    documentRef,
    canvas,
    getState,
    maxLogEntries = MAX_CANVAS_STATE_LOG_ENTRIES,
}) {
    const fields = {
        x: documentRef.getElementById('canvas-state-x'),
        y: documentRef.getElementById('canvas-state-y'),
        angle: documentRef.getElementById('canvas-state-angle'),
        pen: documentRef.getElementById('canvas-state-pen'),
        color: documentRef.getElementById('canvas-state-color'),
        size: documentRef.getElementById('canvas-state-size'),
    };
    const readButton = documentRef.getElementById('read-canvas-state-btn');
    const status = documentRef.getElementById('canvas-state-status');
    const log = documentRef.getElementById('canvas-state-log');
    let lastSnapshot = getCanvasStateSnapshot(getState(), canvas);

    function clearLog() {
        if (!log) return;
        while (log.firstElementChild) log.removeChild(log.firstElementChild);
        log.textContent = '';
    }

    function update(reason = 'state') {
        lastSnapshot = getCanvasStateSnapshot(getState(), canvas);
        if (fields.x) fields.x.textContent = String(lastSnapshot.x);
        if (fields.y) fields.y.textContent = String(lastSnapshot.y);
        if (fields.angle) fields.angle.textContent = `${lastSnapshot.angle}°`;
        if (fields.pen) fields.pen.textContent = lastSnapshot.pen;
        if (fields.color) fields.color.textContent = lastSnapshot.color;
        if (fields.size) fields.size.textContent = `${lastSnapshot.width} × ${lastSnapshot.height}`;
        if (reason === 'reset') clearLog();
        return lastSnapshot;
    }

    function recordPrimitive(primitive) {
        const snapshot = update('primitive');
        if (!log) return;
        const item = documentRef.createElement('li');
        item.textContent = `${primitiveLabel(primitive)}. X ${snapshot.x}, Y ${snapshot.y}, кут ${snapshot.angle}°.`;
        log.appendChild(item);
        while (log.children.length > maxLogEntries) log.removeChild(log.firstElementChild);
    }

    readButton?.addEventListener('click', () => {
        const snapshot = update('read');
        if (status) status.textContent = formatCanvasState(snapshot);
    });

    // Called just before the dialog is shown, so it always opens on current values.
    function refresh() {
        return update('refresh');
    }

    return { update, refresh, recordPrimitive, clearLog, getSnapshot: () => lastSnapshot };
}
