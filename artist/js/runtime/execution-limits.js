import { MAX_REPEAT_COUNT } from '../data/blocks.js';

export const LIMITS = {
  maxExpandedActions: 1000,
  maxRepeatCount: MAX_REPEAT_COUNT,
  maxNestingDepth: 3,
};

function validateBlocks(blocks, depth = 0, ownerId = null) {
  if (depth > LIMITS.maxNestingDepth) {
    return { ok: false, blockId: ownerId, message: 'Програма надто глибоко вкладена. Спробуй зменшити кількість вкладених повторень.' };
  }

  let expandedCount = 0;

  for (const block of blocks) {
    if (block.type === 'repeat') {
      if (block.n > LIMITS.maxRepeatCount) {
        return { ok: false, blockId: block.id, message: `Максимальна кількість повторів — ${LIMITS.maxRepeatCount}. Спробуй зменшити.` };
      }

      const inner = validateBlocks(block.blocks, depth + 1, block.id);
      if (!inner.ok) {
        return inner;
      }

      expandedCount += block.n * inner.expandedCount;
    } else {
      expandedCount += 1;
    }

    if (expandedCount > LIMITS.maxExpandedActions) {
      return { ok: false, blockId: block.id, message: 'У програмі забагато кроків. Спробуй зменшити кількість повторів.' };
    }
  }

  return { ok: true, expandedCount };
}

export function validateProgram(workspace) {
  return validateBlocks(workspace);
}
