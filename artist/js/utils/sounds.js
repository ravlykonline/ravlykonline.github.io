/**
 * Synthesized sounds via Web Audio API.
 * No external files — all sounds are generated in-browser.
 */

let _ctx = null;
let soundEnabled = true;

/** Вмикає/вимикає всі звуки (лише в пам’яті сесії). */
export function setSoundEnabled(enabled) {
  soundEnabled = Boolean(enabled);
}

export function isSoundEnabled() {
  return soundEnabled;
}

function getCtx() {
  if (!_ctx) {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Context) throw new Error('AudioContext unavailable');
    _ctx = new Context();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

function tone(ctx, freq, type, startTime, duration, volume = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/**
 * Cheerful ascending arpeggio: C5 – E5 – G5 – C6
 */
export function playSuccess() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      tone(ctx, freq, 'sine', now + i * 0.1, 0.35, 0.28);
    });
  } catch {
    // AudioContext not available — silently skip
  }
}

/**
 * Tiny soft «click» when a block snaps into place.
 */
export function playSnap() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    tone(ctx, 880, 'triangle', now, 0.06, 0.08);
    tone(ctx, 660, 'sine', now + 0.012, 0.05, 0.05);
  } catch {
    // AudioContext not available — silently skip
  }
}

/**
 * Short descending wobble — soft "oops" sound.
 */
export function playFailure() {
  if (!soundEnabled) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.35);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc.start(now);
    osc.stop(now + 0.42);
  } catch {
    // AudioContext not available — silently skip
  }
}
