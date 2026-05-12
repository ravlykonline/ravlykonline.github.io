function segmentWord(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'відрізок';
  if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'відрізки';
  return 'відрізків';
}

export function evaluateGoal(lesson, trailPoints) {
  const { mode } = lesson.success;

  if (mode === 'minimum-steps') {
    const minimum = lesson.success.minSteps ?? 0;
    if (trailPoints.length >= minimum) {
      return { ok: true, message: lesson.successMessage };
    }

    return {
      ok: false,
      message: `Додай більше ходів. Потрібно щонайменше ${minimum} кроків.`,
    };
  }

  if (mode === 'exact-path' || mode === 'path-match') {
    const goal = lesson.success.goal;

    if (mode === 'exact-path') {
      if (trailPoints.length !== goal.length) {
        return {
          ok: false,
          message: trailPoints.length < goal.length
            ? 'Ще не дійшов. Перевір кількість ходів.'
            : 'Занадто багато ходів. Спробуй зменшити.',
        };
      }

      const matches = goal.every(([x, y], i) => trailPoints[i][0] === x && trailPoints[i][1] === y);
      if (matches) {
        return { ok: true, message: lesson.successMessage };
      }

      return {
        ok: false,
        message: 'Майже вийшло. Перевір напрямок і кількість ходів.',
      };
    }

    // path-match: legacy режим, перевіряє лише множину клітинок
    const visitedCells = new Set(trailPoints.map(([x, y]) => `${x},${y}`));
    const matchesGoal = goal.every(([x, y]) => visitedCells.has(`${x},${y}`));

    if (matchesGoal) {
      return { ok: true, message: lesson.successMessage };
    }

    return {
      ok: false,
      message: 'Майже вийшло. Перевір напрямок і кількість ходів.',
    };
  }

  if (mode === 'turtle-minimum') {
    const minimum = lesson.success.minSegments ?? 1;
    const segments = trailPoints; // for turtle mode trailPoints = segment count
    if (segments >= minimum) {
      return { ok: true, message: lesson.successMessage };
    }

    return {
      ok: false,
      message: `Рівалик намалював лише ${segments} ${segmentWord(segments)} — потрібно щонайменше ${minimum}. Додай більше команд «вперед».`,
    };
  }

  return { ok: false, message: 'Невідомий режим перевірки.' };
}
