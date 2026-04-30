import { blockDefinitions } from '../data/blocks.js';

export function blocksToCode(list, indent = '  ') {
  let output = '';

  for (const block of list) {
    if (block.type === 'repeat') {
      output += `${indent}repeat ${block.count} times {\n`;
      output += blocksToCode(block.blocks, `${indent}  `);
      output += `${indent}}\n`;
    } else {
      output += `${indent}${blockDefinitions[block.type].code}\n`;
    }
  }

  return output;
}

export function buildProgramCode(workspace) {
  return `when run {\n${blocksToCode(workspace)}}`;
}
