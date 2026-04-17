export function approach(current, target, delta) {
    if (current < target) {
        return Math.min(current + delta, target);
    }

    if (current > target) {
        return Math.max(current - delta, target);
    }

    return target;
}

export function normalizeAngleDifference(angle) {
    let normalized = angle;

    while (normalized <= -180) {
        normalized += 360;
    }

    while (normalized > 180) {
        normalized -= 360;
    }

    return normalized;
}

export function updateAngle(currentAngle, targetAngle, rotationLerp, snapThreshold) {
    const diff = normalizeAngleDifference(targetAngle - currentAngle);

    if (Math.abs(diff) < snapThreshold) {
        return targetAngle;
    }

    return currentAngle + diff * rotationLerp;
}
