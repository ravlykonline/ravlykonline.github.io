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

test('speech plays the matching local recording and stops previous playback', async () => {
  const { createTaskSpeech } = await importModule('js/features/speech.js');
  const players = [];
  const events = [];
  class Audio {
    constructor(src) {
      this.src = src;
      this.handlers = {};
      players.push(this);
    }
    addEventListener(name, handler) {
      this.handlers[name] = handler;
    }
    play() {
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
  }
  const speech = createTaskSpeech({
    windowRef: { Audio },
    onStart() { events.push('start'); },
    onEnd() { events.push('end'); },
    onError() { events.push('error'); }
  });

  assert.equal(speech.play(1), true);
  assert.equal(players[0].src, './assets/voice/1.mp3');
  players[0].handlers.playing();
  assert.equal(speech.play(12), true);
  assert.equal(players[0].paused, true);
  assert.equal(players[1].src, './assets/voice/12.mp3');
  players[0].handlers.error();
  players[1].handlers.ended();
  assert.deepEqual(events, ['start', 'end']);
  assert.equal(speech.play(-1), false);
  assert.equal(createTaskSpeech({ windowRef: {} }).play(1), false);
});

test('all recorded tasks match the visible Ukrainian hints', async () => {
  const { levels } = await importModule('js/core/levels.js');
  const fs = require('node:fs');
  const folder = path.join(root, 'assets/voice');
  const transcripts = JSON.parse(fs.readFileSync(path.join(folder, 'transcripts.json'), 'utf8'));
  const pronunciation = JSON.parse(fs.readFileSync(path.join(folder, 'pronunciation.json'), 'utf8'));
  assert.equal(Object.keys(transcripts).length, levels.length);
  assert.equal(Object.keys(pronunciation).length, levels.length);
  for (const { id, hint } of levels) {
    assert.equal(transcripts[id], hint);
    assert.equal(pronunciation[id].replaceAll('\u0301', ''), hint);
    for (const word of pronunciation[id].match(/[а-яіїєґ\u0301]+/gi)) {
      if ((word.match(/[аеєиіїоуюя]/gi) || []).length >= 2) {
        assert.equal(word.split('\u0301').length, 2, `level ${id}: ${word}`);
      }
    }
    assert.ok(fs.statSync(path.join(folder, id + '.mp3')).size > 5000);
  }
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
