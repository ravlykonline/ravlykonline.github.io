export function circleIntersectsRect(circle, rect) {
    const testX = circle.x < rect.x ? rect.x : circle.x > rect.x + rect.w ? rect.x + rect.w : circle.x;
    const testY = circle.y < rect.y ? rect.y : circle.y > rect.y + rect.h ? rect.y + rect.h : circle.y;
    return Math.hypot(circle.x - testX, circle.y - testY) <= circle.radius;
}

// Extra margin (px) added to obstacle rects to prevent the player's circle
// from visually entering the rounded CSS corners of obstacle elements.
const BORDER_RADIUS_MARGIN = 6;

export function hasWorldCollision({ x, y, radius, worldWidth, worldHeight, rects, margin = BORDER_RADIUS_MARGIN }) {
    if (
        x < radius ||
        x > worldWidth - radius ||
        y < radius ||
        y > worldHeight - radius
    ) {
        return true;
    }

    const circle = { x, y, radius };
    return rects.some((rect) => {
        const expanded = {
            x: rect.x - margin,
            y: rect.y - margin,
            w: rect.w + margin * 2,
            h: rect.h + margin * 2,
        };
        return circleIntersectsRect(circle, expanded);
    });
}
