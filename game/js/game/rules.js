export function isNpcWithinRange(distance, interactionRadius) {
    return distance <= interactionRadius;
}

export function shouldCollectApple(distance, playerRadius) {
    return distance < playerRadius + 14;
}

export function pickNearestByDistance(items, getDistance) {
    let nearestItem = null;
    let minDistance = Infinity;

    items.forEach((item) => {
        const distance = getDistance(item);
        if (distance < minDistance) {
            minDistance = distance;
            nearestItem = item;
        }
    });

    return nearestItem;
}
