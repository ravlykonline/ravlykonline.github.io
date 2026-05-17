/**
 * Ambient background music via Web Audio API.
 * Procedural pentatonic arpeggio — no audio files needed, works fully offline.
 *
 * Usage:
 *   MusicController.init({ dom })     — wire the mute button (call in bootGame)
 *   MusicController.start()           — call from inside a user-gesture handler
 *   MusicController.toggle()          — mute / unmute, returns new isMuted state
 *   MusicController.destroy()         — cleanup on teardown
 */

import { getSharedAudioContext, resumeSharedAudioContext } from '../core/audio-context.js';

// C4 D4 E4 G4 A4 C5  (C major pentatonic)
const NOTES_HZ = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];

// Arpeggio pattern — indices into NOTES_HZ, gently rises and falls
const PATTERN = [0, 2, 4, 3, 5, 3, 2, 4, 1, 3, 2, 0];

const INTERVAL = 0.88;   // seconds between note onsets
const DURATION = 1.70;   // each note's total duration in seconds
const VOLUME   = 0.055;  // very soft master volume
const FADE_TC  = 0.60;   // time-constant for mute/unmute crossfade (seconds)

let ctx        = null;
let masterGain = null;
let nextAt     = 0;
let patIdx     = 0;
let pumpTimer  = null;
let _muted     = false;
let _started   = false;

function ensureCtx() {
    if (!ctx) {
        ctx = getSharedAudioContext();
        if (!ctx) return; // Web Audio not supported
        masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(VOLUME, ctx.currentTime);
        masterGain.connect(ctx.destination);
    }

    resumeSharedAudioContext();
}

function scheduleNote(freq, startAt) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Soft bell-like envelope: quick attack, sustain, slow release
    env.gain.setValueAtTime(0, startAt);
    env.gain.linearRampToValueAtTime(1.0, startAt + 0.28);
    env.gain.setValueAtTime(1.0, startAt + DURATION * 0.55);
    env.gain.linearRampToValueAtTime(0, startAt + DURATION);

    osc.connect(env);
    env.connect(masterGain);
    osc.start(startAt);
    osc.stop(startAt + DURATION + 0.05);
}

function pump() {
    ensureCtx();

    const horizon = ctx.currentTime + 2.0; // schedule 2 s ahead

    while (nextAt < horizon) {
        const freq = NOTES_HZ[PATTERN[patIdx % PATTERN.length]];

        scheduleNote(freq, nextAt);

        // Every 3rd note: add a soft bass octave below for warmth
        if (patIdx % 3 === 0) {
            scheduleNote(freq / 2, nextAt);
        }

        nextAt += INTERVAL;
        patIdx += 1;
    }
}

export const MusicController = {
    /**
     * Begin playback.
     * MUST be called synchronously inside a user-gesture handler
     * (e.g. the "Start game" button click) so AudioContext can unlock.
     */
    start() {
        if (_started) return;
        _started = true;
        ensureCtx();
        nextAt = ctx.currentTime + 0.5;
        pump();
        pumpTimer = setInterval(pump, 500);
    },

    setMuted(value) {
        _muted = value;
        if (masterGain && ctx) {
            const target = _muted ? 0 : VOLUME;
            masterGain.gain.setTargetAtTime(target, ctx.currentTime, FADE_TC);
        }
    },

    /** Toggle mute. Returns the new isMuted state. */
    toggle() {
        this.setMuted(!_muted);
        return _muted;
    },

    isMuted() {
        return _muted;
    },

    /**
     * Wire the HUD mute button.
     * aria-pressed="true"  → music is active (button looks highlighted)
     * aria-pressed="false" → music is muted
     */
    init({ dom }) {
        this._btn = dom.musicToggleBtn;
        if (!this._btn) return;

        // Music starts playing, so button is "active"
        this._btn.setAttribute('aria-pressed', 'true');

        this._btn.addEventListener('click', () => {
            const nowMuted = this.toggle();
            // pressed = music ON = not muted
            this._btn.setAttribute('aria-pressed', String(!nowMuted));
        });
    },

    destroy() {
        clearInterval(pumpTimer);
        pumpTimer = null;

        // Disconnect the music gain node from the shared context — don't close the shared context
        if (masterGain) {
            masterGain.disconnect();
        }

        ctx = null;
        masterGain = null;
        _started = false;
        _muted = false;
        nextAt = 0;
        patIdx = 0;
    }
};
