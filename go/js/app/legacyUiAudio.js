import { createAudioFeedback } from '../features/audio.js';
import { chooseVoice, getSpeechEngine, speakText, stopSpeech } from '../features/speech.js';

export function installLegacyUiAudio({ windowRef = window } = {}) {
  const app = windowRef.SnailGame;

  app.createUiAudio = function createUiAudio(deps) {
    const {
      getCurrentTaskText,
      setLevelIntroStatus,
      setStatus,
      text
    } = deps;

    let speechVoice = null;
    const feedback = createAudioFeedback({
      performanceRef: windowRef.performance,
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
  };
}
