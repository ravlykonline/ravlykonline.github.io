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

  levelChipEl.textContent = `${levelIndex + 1} / ${totalLevels}${done ? ' ✓' : ''}`;
  levelChipEl.setAttribute('aria-label', text.levelChip(levelIndex, totalLevels, done));
  levelTitleEl.textContent = level.name;
  levelModeEl.textContent = text.mode(isDebug);
  levelModeEl.className = `mode-chip ${isDebug ? 'debug' : 'play'}`;
  levelGoalEl.textContent = level.goal;
  levelHintEl.textContent = level.hint;
  debugNoteEl.hidden = !isDebug;
  debugNoteEl.textContent = isDebug ? text.ui.debugNote : '';
  btnLevelInfo.textContent = text.static.infoButton;
  btnSpeakTask.textContent = text.static.speakButton;
  btnSpeakTask.setAttribute('aria-label', text.static.speakAria);
  btnSpeakTask.setAttribute('title', text.static.speakTitle);
  documentRef.body?.classList?.toggle('debug-mode', isDebug);
  btnPrev.disabled = !canGoPrev || isRunning;
  btnNext.disabled = !canGoNext || isRunning;
}
