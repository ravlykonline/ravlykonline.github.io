export function circleIntersectsRect(circle, rect) {
    const testX = circle.x < rect.x ? rect.x : circle.x > rect.x + rect.w ? rect.x + rect.w : circle.x;
    const testY = circle.y < rect.y ? rect.y : circle.y > rect.y + rect.h ? rect.y + rect.h : circle.y;
    return Math.hypot(circle.x - testX, circle.y - testY) <= circle.radius;
}

export function hasWorldCollision({ x, y, radius, worldWidth, worldHeight, rects }) {
    if (
        x < radius ||
        x > worldWidth - radius ||
        y < radius ||
        y > worldHeight - radius
    ) {
        return true;
    }

    const circle = { x, y, radius };
    return rects.some((rect) => circleIntersectsRect(circle, rect));
}
