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
        ctx.beginPath();
        ctx.moveTo(oldX, oldY);
        if (state.isRainbow) {
            state.rainbowHue = (state.rainbowHue + Math.abs(distance) * 0.5) % 360;
            if (state.rainbowHue < 0) state.rainbowHue += 360;
            applyContextSettings();
        }
        ctx.lineTo(state.x, state.y);
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

export function clearScreen({ ctx, canvas }) {
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

    const canvasTargetX = (canvas.width / 2) + logicalX;
    const canvasTargetY = (canvas.height / 2) - logicalY;
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
