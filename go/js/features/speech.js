export function getSpeechEngine(windowRef = window) {
  return windowRef.speechSynthesis || null;
}

export function chooseVoice(windowRef = window) {
  const synth = getSpeechEngine(windowRef);
  if (!synth || typeof synth.getVoices !== 'function') {
    return null;
  }

  const voices = synth.getVoices();
  if (!voices.length) {
    return null;
  }

  return (
    voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith('uk')) ||
    voices.find((voice) => voice.lang && voice.lang.toLowerCase().startsWith('ru')) ||
    voices[0] ||
    null
  );
}

export function stopSpeech(windowRef = window) {
  const synth = getSpeechEngine(windowRef);
  if (synth && typeof synth.cancel === 'function') {
    synth.cancel();
  }
}

export function speakText(text, options = {}) {
  const {
    onEnd = () => {},
    onError = () => {},
    onStart = () => {},
    windowRef = window
  } = options;
  const synth = getSpeechEngine(windowRef);
  const Utterance = windowRef.SpeechSynthesisUtterance;

  if (!synth || typeof Utterance !== 'function') {
    return false;
  }

  stopSpeech(windowRef);
  const utterance = new Utterance(text);
  const voice = chooseVoice(windowRef);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = 'uk-UA';
  }

  utterance.rate = 0.92;
  utterance.pitch = 1.02;
  utterance.onstart = onStart;
  utterance.onend = onEnd;
  utterance.onerror = onError;
  synth.speak(utterance);
  return true;
}
