import { appState, nextBlockId } from './state.js';
import { blockDefinitions } from '../data/blocks.js';
import { isColorName } from '../data/colors.js';
import { countBlocksIn } from './blockTree.js';

export function findBlock(list, id) {
  for (const block of list) {
    if (block.id === id) {
      return block;
    }

    if (block.blocks) {
      const match = findBlock(block.blocks, id);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function findBlockLocation(list, id, parentId = null) {
  for (let index = 0; index < list.length; index += 1) {
    const block = list[index];
    if (block.id === id) {
      return { block, parentId, index, list };
    }

    if (block.blocks) {
      const match = findBlockLocation(block.blocks, id, block.id);
      if (match) {
        return match;
      }
    }
  }

  return null;
}

export function createBlock(type, id = nextBlockId()) {
  const def = blockDefinitions[type];
  const block = { type, id };
  if (def?.param) block[def.param.key] = def.param.default;
  if (def?.container) block.blocks = [];
  return block;
}

export function clampBlockParam(def, rawValue) {
  const { param } = def;
  if (param.kind === 'color') {
    return isColorName(rawValue) ? rawValue : param.default;
  }
  const parsed = Number.parseInt(rawValue, 10);
  return Math.max(param.min, Math.min(param.max, Number.isFinite(parsed) ? parsed : param.default));
}

export function updateBlockParam(id, paramKey, rawValue) {
  const block = findInDoc(getDoc(), id)?.block;
  if (!block) return;
  const def = blockDefinitions[block.type];
  if (!def?.param || def.param.key !== paramKey) return;
  block[paramKey] = clampBlockParam(def, rawValue);
}

export function getBlockChildren(list, parentId = null) {
  if (parentId === null) {
    return list;
  }

  const parent = findBlock(list, parentId);
  if (!parent || !Array.isArray(parent.blocks)) {
    return null;
  }

  return parent.blocks;
}

function normalizeInsertIndex(length, index) {
  if (!Number.isInteger(index)) {
    return length;
  }

  return Math.max(0, Math.min(length, index));
}

function blockContainsId(block, id) {
  if (!block || id === null) {
    return false;
  }

  if (block.id === id) {
    return true;
  }

  return Array.isArray(block.blocks) ? Boolean(findBlock(block.blocks, id)) : false;
}

export function insertBlock(list, block, parentId = null, index = list.length) {
  const target = getBlockChildren(list, parentId);
  if (!target) {
    return false;
  }

  target.splice(normalizeInsertIndex(target.length, index), 0, block);
  return true;
}

export function removeBlockFromList(list, id) {
  for (let index = 0; index < list.length; index += 1) {
    const block = list[index];
    if (block.id === id) {
      return list.splice(index, 1)[0];
    }

    if (block.blocks) {
      const removed = removeBlockFromList(block.blocks, id);
      if (removed) {
        return removed;
      }
    }
  }

  return null;
}

export function moveBlockInList(list, id, targetParentId = null, targetIndex = 0) {
  const location = findBlockLocation(list, id);
  if (!location) {
    return false;
  }

  if (targetParentId === id || blockContainsId(location.block, targetParentId)) {
    return false;
  }

  const sourceList = location.list;
  const movingBlock = sourceList.splice(location.index, 1)[0];
  const targetList = getBlockChildren(list, targetParentId);

  if (!targetList) {
    sourceList.splice(location.index, 0, movingBlock);
    return false;
  }

  const adjustedIndex = location.parentId === targetParentId && location.index < targetIndex
    ? targetIndex - 1
    : targetIndex;

  targetList.splice(normalizeInsertIndex(targetList.length, adjustedIndex), 0, movingBlock);
  return true;
}

export function clearWorkspace() {
  appState.workspace = [];
  appState.loose = [];
  appState.activeBlockId = null;
}

export function addBlock(type) {
  return addBlockAt(type, null);
}

export function addBlockAt(type, parentId = null, index) {
  if (appState.running) {
    return null;
  }

  const resolvedParentId = getBlockChildren(appState.workspace, parentId) ? parentId : null;
  const block = createBlock(type);
  insertBlock(appState.workspace, block, resolvedParentId, index);
  return block;
}

export function removeBlock(id) {
  if (appState.running) {
    return null;
  }

  return removeFromDoc(getDoc(), id);
}

export function moveBlock(id, targetParentId = null, targetIndex = 0) {
  if (appState.running) {
    return false;
  }

  return moveBlockInList(appState.workspace, id, targetParentId, targetIndex);
}

export function countBlocks(list = appState.workspace) {
  return countBlocksIn(list);
}

// ── Документ: головний стос + «вільні» стоси ─────────────────────────────────
//
// doc = { main: Block[], loose: [{ id, x, y, blocks: Block[] }] }
// Виконується й потрапляє в код лише doc.main (стос під «коли ▶ натиснуто»).
// Вільні стоси — блоки, кинуті на порожнє місце: вони не виконуються.
// Власник списку (owner): 'main' або числовий id вільного стосу.

export const MAIN_OWNER = 'main';

/** Поточний документ додатка (посилання на живі масиви стану). */
export function getDoc() {
  return { main: appState.workspace, loose: appState.loose };
}

export function cloneDoc(doc) {
  return JSON.parse(JSON.stringify({ main: doc.main, loose: doc.loose }));
}

/** Усі верхні списки документа: [{ owner, list }]. */
export function docLists(doc) {
  return [
    { owner: MAIN_OWNER, list: doc.main },
    ...doc.loose.map((stack) => ({ owner: stack.id, list: stack.blocks })),
  ];
}

/** Знаходить блок у всьому документі. */
export function findInDoc(doc, id) {
  for (const { owner, list } of docLists(doc)) {
    const location = findBlockLocation(list, id);
    if (location) return { ...location, owner };
  }
  return null;
}

/** Список, у якому лежить `parentId` (null → верхній список власника). */
function resolveList(doc, owner, parentId) {
  const root = owner === MAIN_OWNER ? doc.main : doc.loose.find((stack) => stack.id === owner)?.blocks;
  if (!root) return null;
  return getBlockChildren(root, parentId);
}

/** Прибирає порожні вільні стоси. Повертає true, якщо щось видалено. */
export function pruneLoose(doc) {
  let removed = false;
  for (let index = doc.loose.length - 1; index >= 0; index -= 1) {
    if (doc.loose[index].blocks.length === 0) {
      doc.loose.splice(index, 1);
      removed = true;
    }
  }
  return removed;
}

/**
 * «Хвіст»: блок і всі блоки під ним у тому ж списку (як у Scratch).
 * Вилучає їх із документа й повертає. Порожні вільні стоси зникають.
 * @returns {{ tail: object[], from: { owner, parentId, index } } | null}
 */
export function liftTail(doc, id) {
  const found = findInDoc(doc, id);
  if (!found) return null;
  const tail = found.list.splice(found.index);
  const from = { owner: found.owner, parentId: found.parentId, index: found.index };
  pruneLoose(doc);
  return { tail, from };
}

/**
 * Вставляє хвіст у точку зчеплення { owner, parentId, index }.
 * Повертає false, якщо точки не існує або вона всередині самого хвоста.
 */
export function placeTail(doc, tail, slot) {
  if (!Array.isArray(tail) || tail.length === 0) return false;
  const target = resolveList(doc, slot.owner, slot.parentId ?? null);
  if (!target) return false;
  for (const block of tail) {
    if (slot.parentId !== null && slot.parentId !== undefined
      && (block.id === slot.parentId || (block.blocks && findBlock(block.blocks, slot.parentId)))) {
      return false;
    }
  }
  target.splice(normalizeInsertIndex(target.length, slot.index), 0, ...tail);
  return true;
}

/**
 * Приєднує хвіст ЗВЕРХУ до вільного стосу `owner`: хвіст стає на початок списку,
 * а сам стос піднімається на висоту хвоста, щоб блоки стосу лишилися на місці.
 */
export function attachAbove(doc, tail, owner, tailHeight = 0) {
  const stack = doc.loose.find((item) => item.id === owner);
  if (!stack || !placeTail(doc, tail, { owner, parentId: null, index: 0 })) return false;
  stack.y = Math.max(0, Math.round(stack.y - tailHeight));
  return true;
}

/** Кладе хвіст на порожнє місце полотна як новий вільний стос. */
export function placeLoose(doc, tail, x, y, id = nextBlockId()) {
  if (!Array.isArray(tail) || tail.length === 0) return null;
  const stack = { id, x: Math.round(x), y: Math.round(y), blocks: tail };
  doc.loose.push(stack);
  return stack;
}

/** Видаляє один блок (разом із вмістом циклу). */
export function removeFromDoc(doc, id) {
  for (const { list } of docLists(doc)) {
    const removed = removeBlockFromList(list, id);
    if (removed) {
      pruneLoose(doc);
      return removed;
    }
  }
  return null;
}

/**
 * Додає блок у кінець «поточної цілі»: цикл із id `targetId` (якщо він є
 * в документі) або кінець головного стосу.
 */
export function appendToTarget(doc, block, targetId = null) {
  if (targetId !== null && targetId !== undefined) {
    const found = findInDoc(doc, targetId);
    if (found && Array.isArray(found.block.blocks)) {
      found.block.blocks.push(block);
      return found.block.id;
    }
  }
  doc.main.push(block);
  return null;
}

export function moveUpInDoc(doc, id) {
  const found = findInDoc(doc, id);
  if (!found || found.index === 0) return false;
  const { list, index } = found;
  [list[index - 1], list[index]] = [list[index], list[index - 1]];
  return true;
}

export function moveDownInDoc(doc, id) {
  const found = findInDoc(doc, id);
  if (!found || found.index >= found.list.length - 1) return false;
  const { list, index } = found;
  [list[index], list[index + 1]] = [list[index + 1], list[index]];
  return true;
}

/** Виносить блок із циклу одразу після цього циклу. */
export function moveOutInDoc(doc, id) {
  const found = findInDoc(doc, id);
  if (!found || found.parentId === null) return false;
  const parent = findInDoc(doc, found.parentId);
  if (!parent) return false;
  const [block] = found.list.splice(found.index, 1);
  parent.list.splice(parent.index + 1, 0, block);
  return true;
}

/**
 * Найближча точка зчеплення до позиції (x, y) — верхнього лівого кута «привида».
 * points: [{ owner, parentId, index, x, y }] у тій самій системі координат.
 * Відстань по вертикалі важить удвічі більше, ніж по горизонталі, бо блоки
 * лежать стовпчиком. Поза радіусами (maxDx, maxDy) повертає null.
 */
export function nearestInsertionPoint(points, x, y, { maxDx = 64, maxDy = 36, dyWeight = 2 } = {}) {
  let best = null;
  let bestScore = Infinity;
  for (const point of points) {
    const dx = Math.abs(point.x - x);
    const dy = Math.abs(point.y - y);
    if (dx > maxDx || dy > maxDy) continue;
    const score = dx + dy * dyWeight;
    if (score < bestScore) {
      bestScore = score;
      best = point;
    }
  }
  return best;
}

// ── Обгортки над станом додатка (блокуються під час виконання) ───────────────

export function moveBlockUp(id) {
  if (appState.running) return false;
  return moveUpInDoc(getDoc(), id);
}

export function moveBlockDown(id) {
  if (appState.running) return false;
  return moveDownInDoc(getDoc(), id);
}

export function moveBlockOut(id) {
  if (appState.running) return false;
  return moveOutInDoc(getDoc(), id);
}
