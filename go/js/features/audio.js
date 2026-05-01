import { chooseVoice, getSpeechEngine, speakText, stopSpeech } from './speech.js';

export function createAudioFeedback({ performanceRef = globalThis.performance, windowRef = globalThis.window } = {}) {
  let audioCtx = null;
  let noiseBuffer = null;
  let lastStepSoundAt = 0;
  let audioPrimed = false;

  function getAudioContext() {
    const AudioContextCtor = windowRef?.AudioContext || windowRef?.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }

    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }

    return audioCtx;
  }

  function resumeAudio() {
    const ctx = getAudioContext();
    if (!ctx) {
      return null;
    }

    if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      ctx.resume().catch(() => {});
    }

    return ctx;
  }

  function getNoiseBuffer(ctx) {
    if (noiseBuffer) {
      return noiseBuffer;
    }

    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.18));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    noiseBuffer = buffer;
    return buffer;
  }

  function playTone(options) {
    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    const {
      attack = 0.005,
      duration = 0.12,
      frequency,
      release = 0.09,
      type = 'sine',
      volume = 0.05,
      when = ctx.currentTime
    } = options;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + duration + release + 0.02);
    return true;
  }

  function playNoiseBurst(options = {}) {
    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    const {
      duration = 0.09,
      highpass = 180,
      lowpass = 1200,
      volume = 0.025,
      when = ctx.currentTime
    } = options;
    const source = ctx.createBufferSource();
    source.buffer = getNoiseBuffer(ctx);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.setValueAtTime(lowpass, when);
    const cut = ctx.createBiquadFilter();
    cut.type = 'highpass';
    cut.frequency.setValueAtTime(highpass, when);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(volume, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(band);
    band.connect(cut);
    cut.connect(gain);
    gain.connect(ctx.destination);
    source.start(when);
    source.stop(when + duration + 0.02);
    return true;
  }

  function primeAudio() {
    if (audioPrimed) {
      return false;
    }

    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    audioPrimed = true;
    return playTone({
      attack: 0.001,
      duration: 0.01,
      frequency: 440,
      release: 0.01,
      type: 'sine',
      volume: 0.0002,
      when: ctx.currentTime + 0.01
    });
  }

  function playSuccessSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    const startAt = ctx.currentTime + 0.01;
    playTone({ duration: 0.08, frequency: 523.25, type: 'triangle', volume: 0.045, when: startAt });
    playTone({ duration: 0.08, frequency: 659.25, type: 'triangle', volume: 0.05, when: startAt + 0.1 });
    playTone({ duration: 0.14, frequency: 783.99, type: 'triangle', volume: 0.055, when: startAt + 0.2 });
    return true;
  }

  function playErrorSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    const startAt = ctx.currentTime + 0.01;
    playTone({ duration: 0.07, frequency: 261.63, type: 'triangle', volume: 0.022, when: startAt });
    playTone({ duration: 0.11, frequency: 196, type: 'triangle', volume: 0.02, when: startAt + 0.08 });
    playNoiseBurst({ duration: 0.06, highpass: 140, lowpass: 420, volume: 0.006, when: startAt + 0.02 });
    return true;
  }

  function playStepSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return false;
    }

    const now = performanceRef?.now ? performanceRef.now() : Date.now();
    if (now - lastStepSoundAt < 75) {
      return false;
    }

    lastStepSoundAt = now;
    playNoiseBurst({ duration: 0.05, highpass: 240, lowpass: 1200, volume: 0.006, when: ctx.currentTime });
    playTone({ attack: 0.003, duration: 0.025, frequency: 340, release: 0.035, type: 'triangle', volume: 0.006, when: ctx.currentTime });
    return true;
  }

  return {
    playErrorSound,
    playStepSound,
    playSuccessSound,
    primeAudio,
    resumeAudio
  };
}

export function createUiAudio({
  getCurrentTaskText,
  setLevelIntroStatus,
  setStatus,
  text,
  windowRef = globalThis.window
}) {
  let speechVoice = null;
  const feedback = createAudioFeedback({
    performanceRef: windowRef?.performance,
    windowRef
  });

  function initTaskSpeech() {
    const synth = getSpeechEngine(windowRef);
    if (synth && typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', () => {
        speechVoice = chooseVoice(windowRef);
      });
    }
    speechVoice = chooseVoice(windowRef);
  }

  function speakCurrentTask() {
    const spoken = speakText(getCurrentTaskText(), {
      onEnd: () => setLevelIntroStatus(),
      onError: () => setStatus('\u{1F50A}', text.ui.speechError, 'warn'),
      onStart: () => setStatus('\u{1F50A}', text.ui.speechStart, 'run'),
      windowRef
    });

    if (!spoken) {
      setStatus('\u{1F50A}', text.ui.speechUnsupported, 'warn');
    }
  }

  return {
    initTaskSpeech,
    playErrorSound: feedback.playErrorSound,
    playStepSound: feedback.playStepSound,
    playSuccessSound: feedback.playSuccessSound,
    primeAudio: feedback.primeAudio,
    resumeAudio: feedback.resumeAudio,
    speakCurrentTask,
    stopTaskSpeech: () => stopSpeech(windowRef)
  };
}
