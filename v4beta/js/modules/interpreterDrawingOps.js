import { applyBackgroundLayer } from './backgroundLayer.js';
import { GRID_ALIGN_OFFSET_X, GRID_ALIGN_OFFSET_Y } from './constants.js';

export function performMove({
    distance,
    state,
    ctx,
    clampToCanvasBounds,
    applyContextSettings,
}) {
    const oldX = state.x;
    const oldY = state.y;
    const radians = (state.angle * Math.PI) / 180;
    const newX = oldX + distance * Math.cos(radians);
    const newY = oldY + distance * Math.sin(radians);

    const { boundedX, boundedY } = clampToCanvasBounds(newX, newY);
    const boundaryHit = (newX !== boundedX || newY !== boundedY);

    state.x = boundedX;
    state.y = boundedY;

    if (state.isPenDown) {
        const isVerticalMove = Math.abs(Math.cos(radians)) < 1e-6;
        const verticalCrispOffsetX = isVerticalMove && distance > 0 ? 1 : 0;
        const drawOldX = oldX + verticalCrispOffsetX;
        const drawNewX = state.x + verticalCrispOffsetX;
        ctx.beginPath();
        ctx.moveTo(drawOldX, oldY);
        if (state.isRainbow) {
            state.rainbowHue = (state.rainbowHue + Math.abs(distance) * 0.5) % 360;
            if (state.rainbowHue < 0) state.rainbowHue += 360;
            applyContextSettings();
        }
        ctx.lineTo(drawNewX, state.y);
        ctx.stroke();
    }

    return boundaryHit;
}

export function performTurn({ angle, state }) {
    state.angle = (state.angle + angle) % 360;
    if (state.angle < 0) state.angle += 360;
}

export function setColor({
    colorName,
    state,
    colorMap,
    applyContextSettings,
    createUnknownColorError,
}) {
    const normalized = String(colorName || '').toLowerCase();
    const mappedColor = colorMap[normalized];
    if (!mappedColor) {
        throw createUnknownColorError(colorName);
    }
    if (mappedColor === 'RAINBOW') {
        state.isRainbow = true;
    } else {
        state.isRainbow = false;
        state.color = mappedColor;
    }
    applyContextSettings();
}

export function setBackgroundColor({
    colorName,
    state,
    canvas,
    backgroundCanvas,
    backgroundCtx,
    colorMap,
    applyContextSettings,
    createUnknownColorError,
}) {
    const normalized = String(colorName || '').toLowerCase();
    const mappedColor = colorMap[normalized];
    if (!mappedColor || mappedColor === 'RAINBOW') {
        throw createUnknownColorError(colorName);
    }
    state.backgroundColor = mappedColor;
    applyBackgroundLayer({ canvas, backgroundCanvas, backgroundCtx, backgroundColor: mappedColor });
    applyContextSettings();
}

export function clearScreen({ ctx, canvas, backgroundColor }) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function performGoto({
    logicalX,
    logicalY,
    state,
    ctx,
    canvas,
    clampToCanvasBounds,
    infoNotifier,
    boundaryWarningShown,
    setBoundaryWarningShown,
    outOfBoundsMessage,
}) {
    const oldX = state.x;
    const oldY = state.y;

    const canvasTargetX = (canvas.width / 2) + GRID_ALIGN_OFFSET_X + logicalX;
    const canvasTargetY = (canvas.height / 2) + GRID_ALIGN_OFFSET_Y - logicalY;
    const { boundedX, boundedY } = clampToCanvasBounds(canvasTargetX, canvasTargetY);
    const boundaryHit = (canvasTargetX !== boundedX || canvasTargetY !== boundedY);

    state.x = boundedX;
    state.y = boundedY;

    if (state.isPenDown) {
        ctx.beginPath();
        ctx.moveTo(oldX, oldY);
        ctx.lineTo(state.x, state.y);
        ctx.stroke();
    }

    if (boundaryHit && infoNotifier && !boundaryWarningShown) {
        infoNotifier(outOfBoundsMessage, 5000);
        setBoundaryWarningShown(true);
    }
}
