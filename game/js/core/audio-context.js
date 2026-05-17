/**
 * Shared Web Audio API context.
 * Browsers limit the number of concurrent AudioContext instances (typically 6).
 * All audio modules (RewardEffects, MusicController) share this single instance.
 *
 * Usage:
 *   import { getSharedAudioContext } from '../core/audio-context.js';
 *   const ctx = getSharedAudioContext();
 *   if (!ctx) return; // Web Audio not supported
 */

let _ctx = null;

export function getSharedAudioContext() {
    if (_ctx) return _ctx;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    _ctx = new AudioContextClass();
    return _ctx;
}

export function resumeSharedAudioContext() {
    if (_ctx && _ctx.state === 'suspended') {
        _ctx.resume();
    }
}
