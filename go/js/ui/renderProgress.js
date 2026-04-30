export function getProgressPercent(completed, total) {
  if (!Number.isFinite(total) || total <= 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export function renderProgress({ completedLevelIds, refs, text, totalLevels }) {
  const completed = completedLevelIds.length;
  const percent = getProgressPercent(completed, totalLevels);

  refs.progressTextEl.textContent = text.progress(completed, totalLevels);
  refs.progressFillEl.style.width = `${percent}%`;
  refs.progressTrackEl.setAttribute('aria-valuenow', String(percent));

  return percent;
}
