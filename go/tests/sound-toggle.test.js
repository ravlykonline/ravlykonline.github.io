const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { readUtf8, root } = require('./testHelpers.cjs');

async function importModule(relativePath) {
  return import(pathToFileURL(path.join(root, relativePath)).href);
}

function createFakeAudioContext(events) {
  const node = () => ({
    connect() {},
    frequency: { setValueAtTime() {} },
    gain: { exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {}, setValueAtTime() {} },
    start() { events.push('start'); },
    stop() {}
  });
  return class {
    constructor() {
      this.currentTime = 1;
      this.destination = {};
      this.sampleRate = 1000;
      this.state = 'running';
    }
    createOscillator() { return node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createBufferSource() { return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
  };
}

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key)
  };
}

test('every sound effect is silent while muted and works again after unmuting', async () => {
  const { createAudioFeedback } = await importModule('js/features/audio.js');
  const events = [];
  let muted = true;
  const audio = createAudioFeedback({
    isMuted: () => muted,
    performanceRef: { now: () => 1000 },
    windowRef: { AudioContext: createFakeAudioContext(events) }
  });
  const effects = ['playStepSound', 'playCrunchSound', 'playErrorSound', 'playSuccessSound', 'playFinaleSound'];

  for (const effect of effects) {
    assert.equal(audio[effect](), false, effect);
  }
  assert.deepEqual(events, []);

  muted = false;
  for (const effect of effects) {
    assert.equal(audio[effect](), true, effect);
  }
  assert.ok(events.length > 0);
});

test('createUiAudio mutes narration and stops a playing recording', async () => {
  const { createUiAudio } = await importModule('js/features/audio.js');
  const players = [];
  const statuses = [];
  let introResets = 0;
  class Audio {
    constructor(src) { this.src = src; players.push(this); }
    addEventListener() {}
    play() { return Promise.resolve(); }
    pause() { this.paused = true; }
  }
  const text = { ui: { speechError: 'e', speechMuted: 'muted', speechStart: 's', speechUnsupported: 'u' } };
  const audio = createUiAudio({
    getCurrentLevelId: () => 3,
    setLevelIntroStatus() { introResets += 1; },
    setStatus: (_icon, message) => statuses.push(message),
    text,
    windowRef: { Audio }
  });

  audio.speakCurrentTask();
  assert.equal(players.length, 1);

  audio.setMuted(true);
  assert.equal(audio.isMuted(), true);
  assert.equal(players[0].paused, true);
  assert.equal(introResets, 1);

  audio.speakCurrentTask();
  assert.equal(players.length, 1);
  assert.equal(statuses.at(-1), 'muted');

  audio.setMuted(false);
  audio.speakCurrentTask();
  assert.equal(players.length, 2);
});

test('sound preference lives in sessionStorage only and fails safely', async () => {
  const { loadSoundMuted, saveSoundMuted } = await importModule('js/state/sessionStore.js');
  const storage = createStorage();

  assert.equal(loadSoundMuted(storage), false);
  saveSoundMuted(true, storage);
  assert.equal(loadSoundMuted(storage), true);
  saveSoundMuted(false, storage);
  assert.equal(loadSoundMuted(storage), false);

  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); }
  };
  assert.equal(loadSoundMuted(broken), false);
  assert.doesNotThrow(() => saveSoundMuted(true, broken));
  assert.equal(loadSoundMuted(null), false);
});

test('sound button toggles aria state, label and storage', async () => {
  const { createAppUiLayout } = await importModule('js/ui/appUiLayout.js');
  const { loadSoundMuted } = await importModule('js/state/sessionStore.js');
  const attrs = {};
  const classes = new Set();
  const handlers = {};
  const button = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    classList: { toggle: (name, on) => (on ? classes.add(name) : classes.delete(name)) },
    setAttribute: (name, value) => { attrs[name] = value; }
  };
  const storage = createStorage();
  let muted = false;
  const audioApi = { isMuted: () => muted, setMuted: (value) => { muted = value; } };
  const layout = createAppUiLayout({
    app: { config: { cols: 8, rows: 6 } },
    documentRef: { querySelector: (selector) => (selector === '#btn-sound' ? button : null) },
    refs: {},
    storage,
    text: { static: { muteSound: 'Вимкнути звук', unmuteSound: 'Увімкнути звук' } }
  });

  layout.bindSoundControl(audioApi);
  assert.equal(attrs['aria-pressed'], 'false');
  assert.equal(attrs['aria-label'], 'Вимкнути звук');

  handlers.click();
  assert.equal(muted, true);
  assert.equal(attrs['aria-pressed'], 'true');
  assert.equal(attrs['aria-label'], 'Увімкнути звук');
  assert.equal(attrs.title, 'Увімкнути звук');
  assert.ok(classes.has('is-muted'));
  assert.equal(loadSoundMuted(storage), true);

  handlers.click();
  assert.equal(muted, false);
  assert.equal(attrs['aria-pressed'], 'false');
  assert.equal(loadSoundMuted(storage), false);
});

test('sound button markup mirrors the theme button and is a 48px touch target', () => {
  const html = readUtf8('index.html');
  const css = readUtf8('css/game.css');
  assert.match(html, /<button class="theme-btn sound-btn" id="btn-sound" type="button" aria-pressed="false" aria-label="Вимкнути звук"/);
  assert.ok(html.indexOf('id="btn-theme"') < html.indexOf('id="btn-sound"'));
  assert.match(css, /\.sound-btn\.is-muted::after/);
  assert.match(css, /\.theme-btn,\n\.tool-btn \{\n  min-width: var\(--control-size\);\n  min-height: var\(--control-size\)/);
});
