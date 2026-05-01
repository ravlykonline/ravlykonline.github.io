export function getRectCenter(rect) {
    return {
        x: rect.x + rect.w / 2,
        y: rect.y + rect.h / 2
    };
}

export function getDistanceBetweenPoints(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

export function getDistanceFromRectCenter(rect, point) {
    return getDistanceBetweenPoints(getRectCenter(rect), point);
}

export function rectsOverlap(a, b, gap = 0) {
    return a.x < b.x + b.w + gap &&
        a.x + a.w + gap > b.x &&
        a.y < b.y + b.h + gap &&
        a.y + a.h + gap > b.y;
}

export function isFarFromPoint(rect, point, minDistance) {
    return getDistanceFromRectCenter(rect, point) >= minDistance;
}

export function hasNoRectOverlap(rect, rects, gap = 0) {
    return rects.every((candidate) => !rectsOverlap(rect, candidate, gap));
}

export function canPlaceRect(rect, {
    blockers = [],
    blockerGap = 0,
    avoidPoint = null,
    minDistanceFromPoint = 0
} = {}) {
    if (avoidPoint && !isFarFromPoint(rect, avoidPoint, minDistanceFromPoint)) {
        return false;
    }

    return hasNoRectOverlap(rect, blockers, blockerGap);
}
