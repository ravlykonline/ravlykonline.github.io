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

  return { ok: false, message: 'Невідомий режим перевірки.' };
}
