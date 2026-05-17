/**
 * Virtual joystick for touch devices.
 * Appears where the user touches; drag sets movement direction.
 * Integrates with Input by writing intentX/intentY each frame.
 *
 * Usage:
 *   Joystick.init()    — call once in bootGame (touch devices only)
 *   Joystick.getIntent() → { x, y }  — normalised direction, or { x:0, y:0 }
 *   Joystick.destroy() — cleanup
 */

const RADIUS = 52;       // outer ring radius in px
const KNOB_R = 22;       // inner knob radius in px
const DEAD_ZONE = 8;     // px of travel before registering movement

let _outer = null;
let _knob  = null;
let _active = false;
let _originX = 0;
let _originY = 0;
let _intentX = 0;
let _intentY = 0;
let _touchId = null;

const _listeners = [];

function addListener(target, type, handler, opts) {
    target.addEventListener(type, handler, opts);
    _listeners.push({ target, type, handler, opts });
}

function mount() {
    _outer = document.createElement('div');
    _outer.id = 'joystick-outer';
    _outer.setAttribute('aria-hidden', 'true');
    _outer.hidden = true;

    _knob = document.createElement('div');
    _knob.id = 'joystick-knob';
    _outer.appendChild(_knob);

    document.body.appendChild(_outer);
}

function show(x, y) {
    _outer.style.left = `${x}px`;
    _outer.style.top  = `${y}px`;
    _outer.hidden = false;
}

function hide() {
    _outer.hidden = true;
    _knob.style.transform = 'translate(-50%, -50%)';
}

function updateKnob(dx, dy) {
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, RADIUS - KNOB_R);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;
    _knob.style.transform = `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`;

    if (dist > DEAD_ZONE) {
        _intentX = dx / dist;
        _intentY = dy / dist;
    } else {
        _intentX = 0;
        _intentY = 0;
    }
}

export const Joystick = {
    /** Call once on DOMContentLoaded. Only activates on coarse-pointer (touch) devices. */
    init() {
        if (!window.matchMedia('(pointer: coarse)').matches) return;

        mount();

        addListener(document, 'touchstart', (e) => {
            // Ignore touches on interactive elements
            if (e.target.closest('[data-game-interactive], button, input, [role="button"]')) return;
            // Ignore if a dialog is open
            const dialog = document.getElementById('dialog-layer');
            if (dialog && dialog.style.display !== 'none') return;

            const touch = e.changedTouches[0];
            _touchId = touch.identifier;
            _originX = touch.clientX;
            _originY = touch.clientY;
            _active = true;
            _intentX = 0;
            _intentY = 0;
            show(_originX, _originY);
        }, { passive: true });

        addListener(document, 'touchmove', (e) => {
            if (!_active) return;
            const touch = [...e.changedTouches].find((t) => t.identifier === _touchId);
            if (!touch) return;
            updateKnob(touch.clientX - _originX, touch.clientY - _originY);
        }, { passive: true });

        const endHandler = (e) => {
            if (!_active) return;
            const touch = [...e.changedTouches].find((t) => t.identifier === _touchId);
            if (!touch) return;
            _active = false;
            _intentX = 0;
            _intentY = 0;
            _touchId = null;
            hide();
        };

        addListener(document, 'touchend',    endHandler, { passive: true });
        addListener(document, 'touchcancel', endHandler, { passive: true });
    },

    /** Returns normalised {x, y} movement intent from joystick. Both in [-1, 1]. */
    getIntent() {
        return _active ? { x: _intentX, y: _intentY } : { x: 0, y: 0 };
    },

    isActive() {
        return _active;
    },

    destroy() {
        _listeners.forEach(({ target, type, handler, opts }) => {
            target.removeEventListener(type, handler, opts);
        });
        _listeners.length = 0;
        _outer?.remove();
        _outer = null;
        _knob  = null;
        _active = false;
    }
};
