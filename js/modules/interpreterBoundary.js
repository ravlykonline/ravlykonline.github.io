import {
    CANVAS_BOUNDARY_PADDING,
    DEFAULT_PEN_SIZE,
} from './constants.js';

export function getBoundaryMarginForState(state, visualBoundaryRadiusPx = 0) {
    const penMargin = Math.ceil((Number(state?.penSize) || DEFAULT_PEN_SIZE) / 2);
    return Math.max(CANVAS_BOUNDARY_PADDING, visualBoundaryRadiusPx, penMargin);
}

export function clampToCanvasBoundsByMargin(x, y, canvasWidth, canvasHeight, margin) {
    const boundedX = Math.max(margin, Math.min(x, canvasWidth - margin));
    const boundedY = Math.max(margin, Math.min(y, canvasHeight - margin));
    return { boundedX, boundedY };
}

export function isAtCanvasEdgeByMargin(x, y, canvasWidth, canvasHeight, margin) {
    return x <= margin
        || x >= canvasWidth - margin
        || y <= margin
        || y >= canvasHeight - margin;
}
