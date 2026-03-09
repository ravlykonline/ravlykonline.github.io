import assert from 'node:assert/strict';
import {
    COLOR_REGISTRY,
    RANDOM_MIN_DISTANCE_PX,
    RANDOM_SAFE_MARGIN_PX,
} from '../js/modules/constants.js';
import { createRandomResolver } from '../js/modules/randomResolver.js';
import { runTest } from './testUtils.js';

runTest('random resolver returns canonical non-rainbow color names', () => {
    const resolver = createRandomResolver({
        rng: () => 0,
        colorRegistry: COLOR_REGISTRY,
    });
    const canonicalNames = new Set(
        COLOR_REGISTRY
            .filter((entry) => entry.hex !== 'RAINBOW')
            .map((entry) => entry.name)
    );

    const result = resolver.pickRandomColorName();

    assert.equal(canonicalNames.has(result), true);
    assert.notEqual(result, 'веселка');
});

runTest('random resolver is deterministic under injected rng', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    assert.equal(resolver.pickRandomColorName(), resolver.pickRandomBackgroundColorName());
});

runTest('random resolver supports core-only filtering', () => {
    const resolver = createRandomResolver({
        rng: () => 0.999999,
        colorRegistry: COLOR_REGISTRY,
    });
    const coreNames = new Set(
        COLOR_REGISTRY
            .filter((entry) => entry.hex !== 'RAINBOW' && entry.core)
            .map((entry) => entry.name)
    );

    const result = resolver.pickRandomColorName({ coreOnly: true });

    assert.equal(coreNames.has(result), true);
});

runTest('random resolver fails fast on invalid rng output', () => {
    const resolver = createRandomResolver({
        rng: () => Number.NaN,
        colorRegistry: COLOR_REGISTRY,
    });

    assert.throws(
        () => resolver.pickRandomColorName(),
        /RANDOM_RNG_INVALID/
    );
});

runTest('random resolver picks safe random point inside safe margins', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    const point = resolver.pickSafeRandomPoint({
        canvasWidth: 800,
        canvasHeight: 600,
        preferredMarginPx: RANDOM_SAFE_MARGIN_PX,
    });
    const canvasX = point.logicalX + 400;
    const canvasY = 300 - point.logicalY;

    assert.equal(Number.isFinite(point.logicalX), true);
    assert.equal(Number.isFinite(point.logicalY), true);
    assert.equal(canvasX >= RANDOM_SAFE_MARGIN_PX, true);
    assert.equal(canvasX <= 800 - RANDOM_SAFE_MARGIN_PX, true);
    assert.equal(canvasY >= RANDOM_SAFE_MARGIN_PX, true);
    assert.equal(canvasY <= 600 - RANDOM_SAFE_MARGIN_PX, true);
});

runTest('random resolver shrinks safe margin on small canvas', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    const point = resolver.pickSafeRandomPoint({
        canvasWidth: 80,
        canvasHeight: 70,
        preferredMarginPx: RANDOM_SAFE_MARGIN_PX,
    });
    const canvasX = point.logicalX + 40;
    const canvasY = 35 - point.logicalY;

    assert.equal(Number.isFinite(canvasX), true);
    assert.equal(Number.isFinite(canvasY), true);
    assert.equal(canvasX >= RANDOM_MIN_DISTANCE_PX, true);
    assert.equal(canvasX <= 80 - RANDOM_MIN_DISTANCE_PX, true);
    assert.equal(canvasY >= RANDOM_MIN_DISTANCE_PX, true);
    assert.equal(canvasY <= 70 - RANDOM_MIN_DISTANCE_PX, true);
});

runTest('random resolver picks safe random forward distance that stays inside safe zone', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    const distance = resolver.pickSafeRandomDistance({
        canvasWidth: 800,
        canvasHeight: 600,
        x: 400,
        y: 300,
        angle: 0,
        direction: 'forward',
        preferredMarginPx: RANDOM_SAFE_MARGIN_PX,
        minimumDistancePx: RANDOM_MIN_DISTANCE_PX,
    });
    const finalX = 400 + distance;

    assert.equal(Number.isFinite(distance), true);
    assert.equal(distance >= RANDOM_MIN_DISTANCE_PX, true);
    assert.equal(finalX >= RANDOM_SAFE_MARGIN_PX, true);
    assert.equal(finalX <= 800 - RANDOM_SAFE_MARGIN_PX, true);
});

runTest('random resolver returns zero when no safe outward movement is available', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    const distance = resolver.pickSafeRandomDistance({
        canvasWidth: 200,
        canvasHeight: 200,
        x: 195,
        y: 100,
        angle: 0,
        direction: 'forward',
        preferredMarginPx: 20,
        minimumDistancePx: 10,
    });

    assert.equal(distance, 0);
});

runTest('random resolver supports backward safe distance using the reversed heading', () => {
    const resolver = createRandomResolver({
        rng: () => 0.5,
        colorRegistry: COLOR_REGISTRY,
    });

    const distance = resolver.pickSafeRandomDistance({
        canvasWidth: 800,
        canvasHeight: 600,
        x: 400,
        y: 300,
        angle: 0,
        direction: 'backward',
        preferredMarginPx: RANDOM_SAFE_MARGIN_PX,
        minimumDistancePx: RANDOM_MIN_DISTANCE_PX,
    });
    const finalX = 400 - distance;

    assert.equal(Number.isFinite(distance), true);
    assert.equal(distance >= RANDOM_MIN_DISTANCE_PX, true);
    assert.equal(finalX >= RANDOM_SAFE_MARGIN_PX, true);
    assert.equal(finalX <= 800 - RANDOM_SAFE_MARGIN_PX, true);
});
