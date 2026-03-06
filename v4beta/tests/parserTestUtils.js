import { RavlykInterpreter } from '../js/modules/ravlykInterpreter.js';

export function createInterpreter() {
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
    const canvas = { width: 800, height: 600 };
    return new RavlykInterpreter(ctx, canvas, () => {}, () => {}, () => {});
}

