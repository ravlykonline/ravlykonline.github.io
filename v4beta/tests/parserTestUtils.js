import { RavlykInterpreter } from '../js/modules/ravlykInterpreter.js';

export function createInterpreter(options = {}) {
    const ctx = {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        lineCap: 'round',
        lineJoin: 'round',
        lineWidth: 1,
        strokeStyle: '#000000',
    };
    const backgroundCtx = {
        clearRect() {},
        fillRect() {},
        fillStyle: '#ffffff',
    };
    const canvas = { width: 800, height: 600 };
    const backgroundCanvas = { width: 800, height: 600, style: {} };
    return new RavlykInterpreter(ctx, canvas, () => {}, () => {}, () => {}, {
        backgroundCanvas,
        backgroundCtx,
        rng: options.rng,
    });
}
