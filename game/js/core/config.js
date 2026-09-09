// Базові налаштування руху, камери та світу.
// Значення світу (`worldWidth`, `obstacleCount`, `appleCount`, `pearCount`)
// є типовими: кожен рівень може перевизначити їх через `level.world`.
export const CONFIG = {
    playerRadius: 26,
    maxSpeed: 2.6,
    acceleration: 0.18,
    deceleration: 0.14,
    worldWidth: 4200,
    worldHeight: 4200,
    cameraThreshold: 250,
    topHudSafeArea: 72,
    cameraLerp: 0.08,
    rotationLerp: 0.08,
    rotationSnapThreshold: 0.8,
    rotationMinSpeed: 0.18,
    pointerArrivalRadius: 16,
    obstacleCount: 88,
    appleCount: 42,
    pearCount: 0,
    interactionRadius: 132
};

/**
 * Побудувати конфіг конкретного рівня: базові значення + `level.world`.
 * Рух і камера лишаються однаковими на всіх рівнях — змінюється лише світ.
 * @param {{ world?: object }|null|undefined} level
 * @returns {typeof CONFIG}
 */
export function createLevelConfig(level) {
    return { ...CONFIG, ...(level?.world ?? {}) };
}
