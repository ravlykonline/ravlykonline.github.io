/**
 * Чисті функції для дерева блоків (без DOM і без стану додатка).
 * Блок: { id, type, n?, color?, blocks? }.
 */
import { blockDefinitions } from '../data/blocks.js';

/**
 * Короткий конструктор блоку для еталонних розв’язків.
 *   blk('step'), blk('forward', 100), blk('color', 'синій'),
 *   blk('repeat', 4, [blk('step'), blk('turn_right90')])
 */
export function blk(type, param, children) {
  const definition = blockDefinitions[type];
  if (!definition) throw new Error(`Невідомий тип блоку: ${type}`);
  const block = { type };
  if (definition.param) {
    block[definition.param.key] = param ?? definition.param.default;
  }
  if (definition.container) block.blocks = children ?? [];
  return block;
}

/** Повертає копію дерева, де кожен блок має унікальний числовий id. */
export function withIds(tree, startId = 1) {
  let next = startId;
  const walk = (list) => list.map((block) => {
    const copy = { ...block, id: next };
    next += 1;
    if (block.blocks) copy.blocks = walk(block.blocks);
    return copy;
  });
  return walk(tree);
}

export function countBlocksIn(list) {
  let total = 0;
  for (const block of list) {
    total += 1;
    if (block.blocks) total += countBlocksIn(block.blocks);
  }
  return total;
}

export function containsBlockType(list, type) {
  return list.some((block) => block.type === type
    || (block.blocks ? containsBlockType(block.blocks, type) : false));
}

/** Чи є «повторити» всередині іншого «повторити». */
export function hasNestedRepeat(list, insideRepeat = false) {
  return list.some((block) => {
    if (block.type === 'repeat' && insideRepeat) return true;
    return block.blocks ? hasNestedRepeat(block.blocks, insideRepeat || block.type === 'repeat') : false;
  });
}
