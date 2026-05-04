export const LIMITS = {
  maxExpandedActions: 500,
  maxRepeatCount: 20,
  maxNestingDepth: 4,
};

function validateBlocks(blocks, depth = 0) {
  if (depth > LIMITS.maxNestingDepth) {
    return { ok: false, message: 'Програма надто глибоко вкладена. Спробуй зменшити кількість вкладених повторень.' };
  }

  let expandedCount = 0;

  for (const block of blocks) {
    if (block.type === 'repeat') {
      if (block.count > LIMITS.maxRepeatCount) {
        return { ok: false, message: `Максимальна кількість повторів — ${LIMITS.maxRepeatCount}. Спробуй зменшити.` };
      }

      const inner = validateBlocks(block.blocks, depth + 1);
      if (!inner.ok) {
        return inner;
      }

      expandedCount += block.count * inner.expandedCount;
    } else {
      expandedCount += 1;
    }

    if (expandedCount > LIMITS.maxExpandedActions) {
      return { ok: false, message: 'У програмі забагато кроків. Спробуй зменшити кількість повторів.' };
    }
  }

  return { ok: true, expandedCount };
}

export function validateProgram(workspace) {
  return validateBlocks(workspace);
}
