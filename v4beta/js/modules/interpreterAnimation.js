const PEN_ANIMATION_DURATION_SECONDS = 0.2;

export function animatePen({
    commandObject,
    targetScale,
    deltaTime,
    animationEnabled,
    state,
}) {
    if (!animationEnabled) {
        state.scale = targetScale;
        return true;
    }

    if (typeof commandObject.animationProgress === 'undefined') {
        commandObject.animationProgress = 0;
        commandObject.startScale = state.scale;
    }

    commandObject.animationProgress += deltaTime;
    const progress = Math.min(commandObject.animationProgress / PEN_ANIMATION_DURATION_SECONDS, 1);
    state.scale = commandObject.startScale + (targetScale - commandObject.startScale) * progress;

    if (progress >= 1) {
        delete commandObject.animationProgress;
        delete commandObject.startScale;
        return true;
    }

    return false;
}

export function animateMove({
    commandObject,
    totalDistance,
    deltaTime,
    animationEnabled,
    moveSpeed,
    state,
    performMove,
    infoNotifier,
    boundaryWarningShown,
    setBoundaryWarningShown,
    outOfBoundsMessage,
}) {
    if (state.isStuck) return true;

    if (!animationEnabled || deltaTime === Infinity || moveSpeed <= 0) {
        const boundaryHit = performMove(totalDistance);
        if (boundaryHit) state.isStuck = true;
        delete commandObject.remainingDistance;
        return true;
    }

    if (typeof commandObject.remainingDistance === 'undefined') {
        commandObject.remainingDistance = totalDistance;
    }

    let currentMoveSpeed = moveSpeed;
    if (!state.isPenDown) {
        currentMoveSpeed *= 0.7;
    }

    const direction = Math.sign(commandObject.remainingDistance);
    const distanceThisFrame = Math.min(
        Math.abs(commandObject.remainingDistance),
        currentMoveSpeed * deltaTime
    ) * direction;

    const boundaryHit = performMove(distanceThisFrame);
    commandObject.remainingDistance -= distanceThisFrame;

    if (boundaryHit) {
        state.isStuck = true;
        if (infoNotifier && !boundaryWarningShown) {
            infoNotifier(outOfBoundsMessage, 5000);
            setBoundaryWarningShown(true);
        }
        delete commandObject.remainingDistance;
        return true;
    }

    if (Math.abs(commandObject.remainingDistance) < 1e-6) {
        delete commandObject.remainingDistance;
        return true;
    }

    return false;
}

export function animateTurn({
    commandObject,
    totalAngle,
    deltaTime,
    animationEnabled,
    turnSpeed,
    performTurn,
}) {
    if (!animationEnabled || deltaTime === Infinity || turnSpeed <= 0) {
        performTurn(totalAngle);
        delete commandObject.remainingAngle;
        return true;
    }

    if (typeof commandObject.remainingAngle === 'undefined') {
        commandObject.remainingAngle = totalAngle;
    }

    const direction = Math.sign(commandObject.remainingAngle);
    const angleThisFrame = Math.min(
        Math.abs(commandObject.remainingAngle),
        turnSpeed * deltaTime
    ) * direction;

    performTurn(angleThisFrame);
    commandObject.remainingAngle -= angleThisFrame;

    if (Math.abs(commandObject.remainingAngle) < 1e-6) {
        delete commandObject.remainingAngle;
        return true;
    }

    return false;
}
