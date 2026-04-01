export function evaluateGoal(lesson, trailPoints) {
  if (lesson.success.mode === 'minimum-steps') {
    const minimum = lesson.success.minSteps ?? 0;
    if (trailPoints.length >= minimum) {
      return { ok: true, message: lesson.successMessage };
    }

    return {
      ok: false,
      message: `Add more moves. You need at least ${minimum} steps.`,
    };
  }

  const visitedCells = new Set(trailPoints.map(([x, y]) => `${x},${y}`));
  const matchesGoal = lesson.success.goal.every(([x, y]) => visitedCells.has(`${x},${y}`));

  if (matchesGoal) {
    return { ok: true, message: lesson.successMessage };
  }

  return {
    ok: false,
    message: 'Almost there. Check the direction and number of moves.',
  };
}
