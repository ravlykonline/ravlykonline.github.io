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

export function addBlock(type) {
  if (appState.running) {
    return;
  }

  const block = type === 'repeat'
    ? { type: 'repeat', id: nextBlockId(), count: 3, blocks: [] }
    : { type, id: nextBlockId() };

  if (appState.openRepeatId !== null) {
    const parent = findBlock(appState.workspace, appState.openRepeatId);
    if (parent) {
      parent.blocks.push(block);
    } else {
      appState.workspace.push(block);
    }
  } else {
    appState.workspace.push(block);
  }

  if (type === 'repeat') {
    appState.openRepeatId = block.id;
  }
}

function removeFromList(list, id) {
  return list
    .filter((block) => block.id !== id)
    .map((block) => (
      block.blocks
        ? { ...block, blocks: removeFromList(block.blocks, id) }
        : block
    ));
}

export function removeBlock(id) {
  if (appState.running) {
    return;
  }

  if (appState.openRepeatId === id) {
    appState.openRepeatId = null;
  }

  appState.workspace = removeFromList(appState.workspace, id);
}

export function updateRepeatCount(id, value) {
  const block = findBlock(appState.workspace, id);
  if (!block || block.type !== 'repeat') {
    return;
  }

  const parsedValue = Number.parseInt(value, 10);
  block.count = Math.max(1, Math.min(20, Number.isFinite(parsedValue) ? parsedValue : 1));
}

export function closeRepeat() {
  appState.openRepeatId = null;
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
