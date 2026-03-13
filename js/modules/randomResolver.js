import {
    RANDOM_MIN_DISTANCE_PX,
    RANDOM_SAFE_MARGIN_PX,
} from './constants.js';

export function createRandomResolver({ rng = Math.random, colorRegistry = [] } = {}) {
    function getRandomUnitValue() {
        const rawRandomValue = rng();
        if (!Number.isFinite(rawRandomValue)) {
            throw new Error('RANDOM_RNG_INVALID');
        }
        return rawRandomValue;
    }

    function validateCanvasSize(canvasWidth, canvasHeight) {
        if (!Number.isFinite(canvasWidth) || !Number.isFinite(canvasHeight) || canvasWidth <= 0 || canvasHeight <= 0) {
            throw new Error('RANDOM_CANVAS_INVALID');
        }
    }

    function resolveSafeMargin(canvasWidth, canvasHeight, preferredMarginPx = RANDOM_SAFE_MARGIN_PX) {
        validateCanvasSize(canvasWidth, canvasHeight);

        const halfMinDimension = Math.floor(Math.min(canvasWidth, canvasHeight) / 2);
        const maxAllowedMargin = Math.max(0, halfMinDimension - 1);
        if (maxAllowedMargin === 0) return 0;

        const preferred = Number.isFinite(preferredMarginPx) ? preferredMarginPx : RANDOM_SAFE_MARGIN_PX;
        const fallbackFloor = Math.min(RANDOM_MIN_DISTANCE_PX, maxAllowedMargin);
        return Math.max(fallbackFloor, Math.min(preferred, maxAllowedMargin));
    }

    function randomBetweenInclusive(min, max) {
        if (!Number.isFinite(min) || !Number.isFinite(max) || max < min) {
            throw new Error('RANDOM_RANGE_INVALID');
        }
        if (max === min) return min;
        return min + (max - min) * getRandomUnitValue();
    }

    function getSafeRect(canvasWidth, canvasHeight, preferredMarginPx) {
        const safeMargin = resolveSafeMargin(canvasWidth, canvasHeight, preferredMarginPx);
        return {
            safeMargin,
            minX: safeMargin,
            maxX: canvasWidth - safeMargin,
            minY: safeMargin,
            maxY: canvasHeight - safeMargin,
        };
    }

    function pickFromRegistry(options = {}) {
        const entries = Array.isArray(colorRegistry) ? colorRegistry : [];
        const selectable = entries.filter((entry) => {
            if (!entry || typeof entry.name !== 'string') return false;
            if (entry.hex === 'RAINBOW') return false;
            if (options.coreOnly && !entry.core) return false;
            return true;
        });

        if (selectable.length === 0) {
            throw new Error('RANDOM_COLOR_REGISTRY_EMPTY');
        }

        const rawIndex = Math.floor(getRandomUnitValue() * selectable.length);
        const safeIndex = Math.min(Math.max(rawIndex, 0), selectable.length - 1);
        if (!Number.isInteger(safeIndex)) {
            throw new Error('RANDOM_INDEX_INVALID');
        }

        return selectable[safeIndex].name;
    }

    function pickSafeRandomDistance({
        canvasWidth,
        canvasHeight,
        x,
        y,
        angle,
        direction = 'forward',
        preferredMarginPx = RANDOM_SAFE_MARGIN_PX,
        minimumDistancePx = RANDOM_MIN_DISTANCE_PX,
    } = {}) {
        validateCanvasSize(canvasWidth, canvasHeight);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(angle)) {
            throw new Error('RANDOM_POSITION_INVALID');
        }

        const { minX, maxX, minY, maxY } = getSafeRect(canvasWidth, canvasHeight, preferredMarginPx);
        const resolvedAngle = direction === 'backward' ? angle + 180 : angle;
        const radians = (resolvedAngle * Math.PI) / 180;
        const dx = Math.cos(radians);
        const dy = Math.sin(radians);

        let tMin = -Infinity;
        let tMax = Infinity;
        const axes = [
            { start: x, delta: dx, min: minX, max: maxX },
            { start: y, delta: dy, min: minY, max: maxY },
        ];

        for (const axis of axes) {
            if (Math.abs(axis.delta) < 1e-9) {
                if (axis.start < axis.min || axis.start > axis.max) {
                    return 0;
                }
                continue;
            }

            const t1 = (axis.min - axis.start) / axis.delta;
            const t2 = (axis.max - axis.start) / axis.delta;
            const axisMin = Math.min(t1, t2);
            const axisMax = Math.max(t1, t2);
            tMin = Math.max(tMin, axisMin);
            tMax = Math.min(tMax, axisMax);
        }

        const feasibleMin = Math.max(0, tMin);
        const feasibleMax = tMax;
        if (!Number.isFinite(feasibleMin) || !Number.isFinite(feasibleMax) || feasibleMax < feasibleMin) {
            return 0;
        }

        const minimumDistance = Number.isFinite(minimumDistancePx) ? minimumDistancePx : RANDOM_MIN_DISTANCE_PX;
        const desiredMinimum = Math.max(feasibleMin, Math.min(minimumDistance, feasibleMax));
        return randomBetweenInclusive(desiredMinimum, feasibleMax);
    }

    function pickSafeRandomPoint({
        canvasWidth,
        canvasHeight,
        preferredMarginPx = RANDOM_SAFE_MARGIN_PX,
    } = {}) {
        validateCanvasSize(canvasWidth, canvasHeight);

        const { minX, maxX, minY, maxY } = getSafeRect(canvasWidth, canvasHeight, preferredMarginPx);
        const canvasX = randomBetweenInclusive(minX, maxX);
        const canvasY = randomBetweenInclusive(minY, maxY);

        return {
            logicalX: canvasX - (canvasWidth / 2),
            logicalY: (canvasHeight / 2) - canvasY,
        };
    }

    return {
        pickRandomColorName(options = {}) {
            return pickFromRegistry(options);
        },
        pickRandomBackgroundColorName(options = {}) {
            return pickFromRegistry(options);
        },
        pickSafeRandomDistance,
        pickSafeRandomPoint,
    };
}
