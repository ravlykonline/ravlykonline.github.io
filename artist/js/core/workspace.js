import { appState, nextBlockId } from './state.js';

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
  return type === 'repeat'
    ? { type: 'repeat', id, count: 3, blocks: [] }
    : { type, id };
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

  return removeBlockFromList(appState.workspace, id);
}

export function moveBlock(id, targetParentId = null, targetIndex = 0) {
  if (appState.running) {
    return false;
  }

  return moveBlockInList(appState.workspace, id, targetParentId, targetIndex);
}

export function updateRepeatCount(id, value) {
  const block = findBlock(appState.workspace, id);
  if (!block || block.type !== 'repeat') {
    return;
  }

  const parsedValue = Number.parseInt(value, 10);
  block.count = Math.max(1, Math.min(20, Number.isFinite(parsedValue) ? parsedValue : 1));
}

export function countBlocks(list = appState.workspace) {
  let total = 0;

  for (const block of list) {
    total += 1;
    if (block.blocks) {
      total += countBlocks(block.blocks);
    }
  }

  return total;
}

export function flattenBlocks(list = appState.workspace) {
  const actions = [];

  for (const block of list) {
    if (block.type === 'repeat') {
      for (let index = 0; index < block.count; index += 1) {
        actions.push(...flattenBlocks(block.blocks));
      }
    } else {
      actions.push(block);
    }
  }

  return actions;
}
