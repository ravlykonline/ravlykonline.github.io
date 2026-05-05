import { blockDefinitions } from '../data/blocks.js';

export function blocksToCode(list, indent = '  ') {
  let output = '';

  for (const block of list) {
    const def = blockDefinitions[block.type];

    if (block.type === 'repeat') {
      output += `${indent}повторити ${block.count} разів {\n`;
      output += blocksToCode(block.blocks, `${indent}  `);
      output += `${indent}}\n`;
    } else if (def?.paramKey) {
      // Параметричний turtle-блок: «вперед 50», «праворуч 90»
      output += `${indent}${def.code} ${block[def.paramKey]}\n`;
    } else {
      // Атомарний блок (grid або turtle без параметра)
      output += `${indent}${def.code}\n`;
    }
  }

  return output;
}

export function buildProgramCode(workspace) {
  return `коли запущено {\n${blocksToCode(workspace)}}`;
}
