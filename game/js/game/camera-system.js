/**
 * Camera system — pure functions, no `this`, no class.
 * All state mutations are done on the passed-in `state` object (player state).
 */

/**
 * @param {{ viewport: Element|null }} dom
 * @returns {{ width: number, height: number }}
 */
export function getViewportSize(dom) {
    return {
        width: dom.viewport?.clientWidth || window.innerWidth,
        height: dom.viewport?.clientHeight || window.innerHeight
    };
}

/**
 * @param {{ viewport: Element|null }} dom
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function getViewportRect(dom) {
    return dom.viewport?.getBoundingClientRect() ?? {
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight
    };
}

/**
 * Convert a client-space pointer coordinate to world-space.
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ x: number, y: number }} camera
 * @param {{ left: number, top: number }} viewportRect
 * @returns {{ x: number, y: number }}
 */
export function getWorldPointFromClient(clientX, clientY, camera, viewportRect) {
    return {
        x: clientX - viewportRect.left + camera.x,
        y: clientY - viewportRect.top + camera.y
    };
}

/**
 * Snap camera instantly to centre on the player (used on scene init).
 * Mutates state.camera and state.targetCamera in place.
 * @param {{ x: number, y: number, camera: {x:number,y:number}, targetCamera: {x:number,y:number} }} state
 * @param {{ worldWidth: number, worldHeight: number }} config
 * @param {{ width: number, height: number }} viewportSize
 */
export function syncCameraToPlayer(state, config, viewportSize) {
    const tx = Math.max(0, Math.min(
        state.x - viewportSize.width / 2,
        config.worldWidth - viewportSize.width
    ));
    const ty = Math.max(0, Math.min(
        state.y - viewportSize.height / 2,
        config.worldHeight - viewportSize.height
    ));

    state.targetCamera.x = tx;
    state.targetCamera.y = ty;
    state.camera.x = tx;
    state.camera.y = ty;
}

/**
 * Scroll-follow camera update called every frame.
 * Mutates state.camera and state.targetCamera in place.
 * @param {{ x: number, y: number, camera: {x:number,y:number}, targetCamera: {x:number,y:number} }} state
 * @param {{ worldWidth: number, worldHeight: number, cameraThreshold: number, topHudSafeArea: number, cameraLerp: number }} config
 * @param {{ width: number, height: number }} viewportSize
 */
export function updateCamera(state, config, viewportSize) {
    const topCameraThreshold = config.cameraThreshold + config.topHudSafeArea;
    const screenX = state.x - state.targetCamera.x;
    const screenY = state.y - state.targetCamera.y;

    if (screenX < config.cameraThreshold) {
        state.targetCamera.x -= (config.cameraThreshold - screenX);
    } else if (screenX > viewportSize.width - config.cameraThreshold) {
        state.targetCamera.x += screenX - (viewportSize.width - config.cameraThreshold);
    }

    if (screenY < topCameraThreshold) {
        state.targetCamera.y -= (topCameraThreshold - screenY);
    } else if (screenY > viewportSize.height - config.cameraThreshold) {
        state.targetCamera.y += screenY - (viewportSize.height - config.cameraThreshold);
    }

    state.targetCamera.x = Math.max(0, Math.min(state.targetCamera.x, config.worldWidth - viewportSize.width));
    state.targetCamera.y = Math.max(0, Math.min(state.targetCamera.y, config.worldHeight - viewportSize.height));

    state.camera.x += (state.targetCamera.x - state.camera.x) * config.cameraLerp;
    state.camera.y += (state.targetCamera.y - state.camera.y) * config.cameraLerp;
}
