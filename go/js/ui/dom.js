export function getDomRefs(documentRef = document) {
  return {
    gridEl: documentRef.getElementById('grid'),
    gwrap: documentRef.getElementById('gwrap'),
    snailEl: documentRef.getElementById('snail'),
    statusEl: documentRef.getElementById('status'),
    sicoEl: documentRef.getElementById('sico'),
    stxtEl: documentRef.getElementById('stxt'),
    btnRun: documentRef.getElementById('btn-run'),
    btnClr: documentRef.getElementById('btn-clr'),
    btnPrev: documentRef.getElementById('btn-prev'),
    btnNext: documentRef.getElementById('btn-next'),
    btnLevelInfo: documentRef.getElementById('btn-level-info'),
    btnSpeakTask: documentRef.getElementById('btn-speak-task'),
    levelChipEl: documentRef.getElementById('level-chip'),
    levelTitleEl: documentRef.getElementById('level-title'),
    levelModeEl: documentRef.getElementById('level-mode'),
    levelGoalEl: documentRef.getElementById('level-goal'),
    levelHintEl: documentRef.getElementById('level-hint'),
    debugNoteEl: documentRef.getElementById('debug-note'),
    progressTextEl: documentRef.getElementById('progress-text'),
    progressTrackEl: documentRef.getElementById('progress-track'),
    progressFillEl: documentRef.getElementById('progress-fill'),
    btnMap: documentRef.getElementById('btn-map'),
    ghostEl: documentRef.getElementById('ghost'),
    confEl: documentRef.getElementById('confetti'),
    paletteEl: documentRef.getElementById('palette')
  };
}
