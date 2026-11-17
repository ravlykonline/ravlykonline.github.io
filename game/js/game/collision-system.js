export function circleIntersectsRect(circle, rect, margin = 0) {
    const dx = Math.max(rect.x - margin - circle.x, 0, circle.x - (rect.x + rect.w + margin));
    if (dx > circle.radius) return false;
    const dy = Math.max(rect.y - margin - circle.y, 0, circle.y - (rect.y + rect.h + margin));
    return dx * dx + dy * dy <= circle.radius * circle.radius;
}

// Extra margin (px) added to obstacle rects to prevent the player's circle
// from visually entering the rounded CSS corners of obstacle elements.
export const WORLD_COLLISION_MARGIN = 6;

export function hasWorldCollision({ x, y, radius, worldWidth, worldHeight, rects, margin = WORLD_COLLISION_MARGIN }) {
    if (
        x < radius ||
        x > worldWidth - radius ||
        y < radius ||
        y > worldHeight - radius
    ) {
        return true;
    }

    const circle = { x, y, radius };
    return rects.some(rect => circleIntersectsRect(circle, rect, margin));
}
