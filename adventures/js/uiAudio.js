(function () {
  const app = window.SnailGame;

  app.createUiAudio = function createUiAudio(deps) {
    const {
      getCurrentTaskText,
      setLevelIntroStatus,
      setStatus,
      text
    } = deps;

    let speechVoice = null;
    let audioCtx = null;
    let noiseBuffer = null;
    let lastStepSoundAt = 0;
    let audioPrimed = false;

  function getSpeechEngine() {
    return window.speechSynthesis || null;
  }

  function chooseVoice() {
    const synth = getSpeechEngine();
    if (!synth) {
      return null;
    }

    const voices = synth.getVoices();
    if (!voices.length) {
      return null;
    }

    const ukrainianVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith('uk'));
    if (ukrainianVoice) {
      return ukrainianVoice;
    }

    const fallbackVoice = voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith('ru'));
    return fallbackVoice || voices[0] || null;
  }

  function stopTaskSpeech() {
    const synth = getSpeechEngine();
    if (synth) {
      synth.cancel();
    }
  }

  function speakCurrentTask() {
    const synth = getSpeechEngine();
    if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
      setStatus('\u{1F50A}', text.ui.speechUnsupported, 'warn');
      return;
    }

    stopTaskSpeech();
    const utterance = new window.SpeechSynthesisUtterance(getCurrentTaskText());
    speechVoice = speechVoice || chooseVoice();
    if (speechVoice) {
      utterance.voice = speechVoice;
      utterance.lang = speechVoice.lang;
    } else {
      utterance.lang = 'uk-UA';
    }
    utterance.rate = 0.92;
    utterance.pitch = 1.02;
    utterance.onstart = () => setStatus('\u{1F50A}', text.ui.speechStart, 'run');
    utterance.onend = () => setLevelIntroStatus();
    utterance.onerror = () => setStatus('\u{1F50A}', text.ui.speechError, 'warn');
    synth.speak(utterance);
  }

  // Creates one shared Web Audio context for feedback sounds and speech unlocks.
  function getAudioContext() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
      return null;
    }
    if (!audioCtx) {
      audioCtx = new AudioContextCtor();
    }
    return audioCtx;
  }

  // Resumes audio after a real user gesture so browsers are willing to play sounds.
  function resumeAudio() {
    const ctx = getAudioContext();
    if (!ctx) {
      return null;
    }
    if (ctx.state === 'suspended') {
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

  // Plays short musical tones used for success and error feedback.
  function playTone(options) {
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    const {
      frequency,
      type = 'sine',
      duration = 0.12,
      volume = 0.05,
      when = ctx.currentTime,
      attack = 0.005,
      release = 0.09
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
  }

  // Plays a filtered noise burst for soft rustle and error textures.
  function playNoiseBurst(options) {
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    const {
      duration = 0.09,
      volume = 0.025,
      when = ctx.currentTime,
      lowpass = 1200,
      highpass = 180
    } = options || {};
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
  }

  function primeAudio() {
    if (audioPrimed) {
      return;
    }
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    audioPrimed = true;
    playTone({ frequency: 440, type: 'sine', duration: 0.01, volume: 0.0002, when: ctx.currentTime + 0.01, attack: 0.001, release: 0.01 });
  }

  // Warm ascending cue for success.
  function playSuccessSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    const startAt = ctx.currentTime + 0.01;
    playTone({ frequency: 523.25, type: 'triangle', duration: 0.08, volume: 0.045, when: startAt });
    playTone({ frequency: 659.25, type: 'triangle', duration: 0.08, volume: 0.05, when: startAt + 0.1 });
    playTone({ frequency: 783.99, type: 'triangle', duration: 0.14, volume: 0.055, when: startAt + 0.2 });
  }

  // Softer descending cue for mistakes.
  function playErrorSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    const startAt = ctx.currentTime + 0.01;
    playTone({ frequency: 261.63, type: 'triangle', duration: 0.07, volume: 0.022, when: startAt });
    playTone({ frequency: 196, type: 'triangle', duration: 0.11, volume: 0.02, when: startAt + 0.08 });
    playNoiseBurst({ duration: 0.06, volume: 0.006, when: startAt + 0.02, lowpass: 420, highpass: 140 });
  }

  // Short rustle for every snail step, throttled so quick movements do not stack too loudly.
  function playStepSound() {
    const ctx = resumeAudio();
    if (!ctx) {
      return;
    }
    const now = performance.now();
    if (now - lastStepSoundAt < 75) {
      return;
    }
    lastStepSoundAt = now;
    playNoiseBurst({ duration: 0.05, volume: 0.006, when: ctx.currentTime, lowpass: 1200, highpass: 240 });
    playTone({ frequency: 340, type: 'triangle', duration: 0.025, volume: 0.006, when: ctx.currentTime, attack: 0.003, release: 0.035 });
  }


    function initTaskSpeech() {
      const synth = getSpeechEngine();
      if (synth && typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', () => {
          speechVoice = chooseVoice();
        });
      }
      speechVoice = chooseVoice();
    }

    return {
      initTaskSpeech,
      playErrorSound,
      playStepSound,
      playSuccessSound,
      primeAudio,
      resumeAudio,
      speakCurrentTask,
      stopTaskSpeech
    };
  };
})();
