export function approach(current, target, delta, scale = 1) {
    const step = delta * scale;
    if (current < target) {
        return Math.min(current + step, target);
    }

    if (current > target) {
        return Math.max(current - step, target);
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

export function updateAngle(currentAngle, targetAngle, rotationLerp, snapThreshold, scale = 1) {
    const diff = normalizeAngleDifference(targetAngle - currentAngle);

    if (Math.abs(diff) < snapThreshold) {
        return targetAngle;
    }

    // Frame-rate independent lerp: same feel at any fps
    const lerpFactor = scale === 1 ? rotationLerp : 1 - Math.pow(1 - rotationLerp, scale);
    return currentAngle + diff * lerpFactor;
}
