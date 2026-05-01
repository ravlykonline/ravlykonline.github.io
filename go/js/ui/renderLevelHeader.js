export function getLevelTaskButtonLabels({ level, text }) {
  const isEarlyLevel = level.id <= 3 && level.type !== 'debug';
  if (isEarlyLevel) {
    return {
      infoText: text.static.earlyLevelInfoButton,
      speakText: text.static.earlyLevelSpeakButton,
      speakAria: text.static.earlyLevelSpeakAria,
      speakTitle: text.static.earlyLevelSpeakTitle
    };
  }

  return {
    infoText: text.static.infoButton,
    speakText: text.static.speakButton,
    speakAria: text.static.speakAria,
    speakTitle: text.static.speakTitle
  };
}

export function renderLevelHeader({
  canGoNext,
  canGoPrev,
  completedLevelIds,
  documentRef = document,
  isRunning,
  level,
  levelIndex,
  refs,
  text,
  totalLevels
}) {
  const {
    btnLevelInfo,
    btnNext,
    btnPrev,
    btnSpeakTask,
    debugNoteEl,
    levelChipEl,
    levelGoalEl,
    levelHintEl,
    levelModeEl,
    levelTitleEl
  } = refs;
  const done = completedLevelIds.includes(level.id);
  const isDebug = level.type === 'debug';
  const taskButtons = getLevelTaskButtonLabels({ level, text });

  levelChipEl.textContent = text.levelChip(levelIndex, totalLevels, done);
  levelTitleEl.textContent = level.name;
  levelModeEl.textContent = text.mode(isDebug);
  levelModeEl.className = `mode-chip ${isDebug ? 'debug' : 'play'}`;
  levelGoalEl.textContent = level.goal;
  levelHintEl.textContent = level.hint;
  debugNoteEl.hidden = !isDebug;
  debugNoteEl.textContent = isDebug ? text.ui.debugNote : '';
  btnLevelInfo.textContent = taskButtons.infoText;
  btnSpeakTask.textContent = taskButtons.speakText;
  btnSpeakTask.setAttribute('aria-label', taskButtons.speakAria);
  btnSpeakTask.setAttribute('title', taskButtons.speakTitle);
  documentRef.body?.classList?.toggle('debug-mode', isDebug);
  btnPrev.disabled = !canGoPrev || isRunning;
  btnNext.disabled = !canGoNext || isRunning;
}
