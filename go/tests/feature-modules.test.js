const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createFakeAudioContextClass(events) {
  return class FakeAudioContext {
    constructor() {
      this.currentTime = 1;
      this.destination = {};
      this.sampleRate = 1000;
      this.state = 'suspended';
    }

    resume() {
      events.push('resume');
      this.state = 'running';
      return Promise.resolve();
    }

    createOscillator() {
      const osc = {
        frequency: {
          setValueAtTime(value) {
            events.push(`frequency:${value}`);
          }
        },
        connect() {},
        start() {
          events.push('osc-start');
        },
        stop() {
          events.push('osc-stop');
        },
        type: ''
      };
      return osc;
    }

    createGain() {
      return {
        connect() {},
        gain: {
          exponentialRampToValueAtTime() {},
          linearRampToValueAtTime() {},
          setValueAtTime() {}
        }
      };
    }

    createBuffer() {
      return {
        getChannelData() {
          return new Float32Array(10);
        }
      };
    }

    createBufferSource() {
      return {
        buffer: null,
        connect() {},
        start() {
          events.push('noise-start');
        },
        stop() {
          events.push('noise-stop');
        }
      };
    }

    createBiquadFilter() {
      return {
        connect() {},
        frequency: {
          setValueAtTime() {}
        },
        type: ''
      };
    }
  };
}

test('audio module degrades gracefully without AudioContext', async () => {
  const { createAudioFeedback } = await importModule('js/features/audio.js');
  const audio = createAudioFeedback({ windowRef: {} });

  assert.equal(audio.resumeAudio(), null);
  assert.equal(audio.primeAudio(), false);
  assert.equal(audio.playSuccessSound(), false);
  assert.equal(audio.playErrorSound(), false);
  assert.equal(audio.playStepSound(), false);
});

test('audio module resumes context and plays feedback sounds', async () => {
  const { createAudioFeedback } = await importModule('js/features/audio.js');
  const events = [];
  let now = 100;
  const audio = createAudioFeedback({
    performanceRef: {
      now() {
        return now;
      }
    },
    windowRef: {
      AudioContext: createFakeAudioContextClass(events)
    }
  });

  assert.ok(audio.resumeAudio());
  assert.equal(audio.primeAudio(), true);
  assert.equal(audio.primeAudio(), false);
  assert.equal(audio.playSuccessSound(), true);
  assert.equal(audio.playErrorSound(), true);
  assert.equal(audio.playStepSound(), true);
  now = 120;
  assert.equal(audio.playStepSound(), false);
  now = 200;
  assert.equal(audio.playStepSound(), true);
  assert.ok(events.includes('resume'));
  assert.ok(events.includes('osc-start'));
  assert.ok(events.includes('noise-start'));
});

test('speech module chooses Ukrainian voices and speaks with safe defaults', async () => {
  const { chooseVoice, speakText, stopSpeech } = await importModule('js/features/speech.js');
  let spoken = null;
  let cancelled = false;
  const voices = [
    { lang: 'en-US', name: 'English' },
    { lang: 'uk-UA', name: 'Українська' }
  ];
  function SpeechSynthesisUtterance(text) {
    this.text = text;
  }
  const windowRef = {
    SpeechSynthesisUtterance,
    speechSynthesis: {
      cancel() {
        cancelled = true;
      },
      getVoices() {
        return voices;
      },
      speak(utterance) {
        spoken = utterance;
      }
    }
  };

  assert.equal(chooseVoice(windowRef), voices[1]);
  assert.equal(speakText('Привіт', { windowRef }), true);
  assert.equal(cancelled, true);
  assert.equal(spoken.text, 'Привіт');
  assert.equal(spoken.voice, voices[1]);
  assert.equal(spoken.lang, 'uk-UA');
  stopSpeech(windowRef);
  assert.equal(cancelled, true);
});

test('speech module degrades gracefully when speech API is unavailable', async () => {
  const { chooseVoice, speakText, stopSpeech } = await importModule('js/features/speech.js');
  const windowRef = {};

  assert.equal(chooseVoice(windowRef), null);
  assert.equal(speakText('Текст', { windowRef }), false);
  assert.doesNotThrow(() => stopSpeech(windowRef));
});

test('confetti module creates pieces and clears them later', async () => {
  const { launchConfetti } = await importModule('js/features/confetti.js');
  const rootEl = {
    children: [],
    append(...items) {
      this.children.push(...items);
    },
    replaceChildren() {
      this.children = [];
    }
  };
  const documentRef = {
    createElement(tagName) {
      return {
        className: '',
        style: {},
        tagName
      };
    },
    getElementById() {
      return rootEl;
    }
  };
  const timeouts = [];
  const windowRef = {
    matchMedia() {
      return { matches: false };
    },
    setTimeout(fn, ms) {
      timeouts.push({ fn, ms });
      return 1;
    }
  };

  assert.equal(launchConfetti({
    count: 3,
    documentRef,
    durationMs: 123,
    random: () => 0.5,
    windowRef
  }), true);
  assert.equal(rootEl.children.length, 3);
  assert.equal(rootEl.children[0].className, 'cp');
  assert.equal(timeouts[0].ms, 123);
  timeouts[0].fn();
  assert.equal(rootEl.children.length, 0);
});

test('confetti module skips animation for reduced motion', async () => {
  const { launchConfetti } = await importModule('js/features/confetti.js');
  const rootEl = {
    children: [],
    append(...items) {
      this.children.push(...items);
    },
    replaceChildren() {
      this.children = [];
    }
  };

  assert.equal(launchConfetti({
    root: rootEl,
    windowRef: {
      matchMedia() {
        return { matches: true };
      },
      setTimeout() {}
    }
  }), false);
  assert.equal(rootEl.children.length, 0);
});
