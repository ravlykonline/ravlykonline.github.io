import { blockDefinitions } from '../data/blocks.js';
import { DEFAULT_PEN } from '../domain/turtle.js';

const INDENT = '  ';
export const SETUP_COMMENT = '// Підготовка поля';
export const PROGRAM_COMMENT = '// Твоя програма';

/** Число без «-0» і без зайвих дробових розрядів. */
function formatNumber(value) {
  const rounded = Math.round(value * 1000) / 1000;
  return String(rounded === 0 ? 0 : rounded);
}

/**
 * Рядки підготовки поля. Гра стартує не так, як РАВЛИК за замовчуванням
 * (чорний колір, товщина 1), тому товщину й колір пишемо завжди.
 * Точка гри (x, y) → `перейти в x -y` (у РАВЛИК вісь y вгору).
 */
export function buildSetupLines(lesson) {
  const x = lesson.start?.x ?? 0;
  const y = lesson.start?.y ?? 0;
  const heading = ((lesson.start?.heading ?? 0) % 360 + 360) % 360;
  const pen = { ...DEFAULT_PEN, ...(lesson.pen ?? {}) };
  const moved = x !== 0 || y !== 0;

  const lines = [SETUP_COMMENT];
  if (moved) {
    lines.push('підняти', `перейти в ${formatNumber(x)} ${formatNumber(-y)}`);
  }
  if (heading !== 0) {
    lines.push(heading <= 180 ? `праворуч ${formatNumber(heading)}` : `ліворуч ${formatNumber(360 - heading)}`);
  }
  if (moved) lines.push('опустити');
  lines.push(`товщина ${pen.width}`, `колір ${pen.color}`, PROGRAM_COMMENT);
  return lines;
}

/**
 * Рядки тіла програми. `offset` — номер першого рядка в повному тексті
 * (щоб заповнити lineByBlockId).
 */
export function blocksToLines(list, lineByBlockId = new Map(), offset = 0, depth = 0) {
  const lines = [];
  const pad = INDENT.repeat(depth);

  for (const block of list) {
    const definition = blockDefinitions[block.type];
    if (block.id !== undefined) lineByBlockId.set(block.id, offset + lines.length);
    lines.push(`${pad}${definition.code(block)}`);

    if (definition.container) {
      lines.push(...blocksToLines(block.blocks, lineByBlockId, offset + lines.length, depth + 1));
      lines.push(`${pad})`);
    }
  }

  return lines;
}

/**
 * @returns {{ setup: string[], body: string[], lineByBlockId: Map<number, number> }}
 *   lineByBlockId: id блока → індекс рядка в [...setup, ...body] (для repeat — заголовок).
 */
export function buildProgramCode(lesson, workspace) {
  const setup = buildSetupLines(lesson);
  const lineByBlockId = new Map();
  const body = blocksToLines(workspace, lineByBlockId, setup.length);
  return { setup, body, lineByBlockId };
}

/** Повний текст програми для показу й копіювання. */
export function programToText({ setup, body }) {
  return [...setup, ...body].join('\n');
}
