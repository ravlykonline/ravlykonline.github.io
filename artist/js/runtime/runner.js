/**
 * Ліниве виконання програми з блоків. Без DOM.
 *
 * `runSteps` — генератор: цикли не розгортаються наперед, кожен крок
 * (один примітив) обчислюється лише тоді, коли його запитують.
 * Крок: { blockId, before, after, segment | null }.
 */
import {
  createTurtleForLesson,
  moveBack,
  moveForward,
  penDown,
  penUp,
  setColor,
  turnLeft,
  turnRight,
} from '../domain/turtle.js';
import { colorHex } from '../data/colors.js';
import { LIMITS } from './execution-limits.js';

const STEP_LENGTH = 50;
const QUARTER_TURN = 90;

/** Порожні цикли не створюють дій, незалежно від числа повторів. */
function executableBlocks(blocks) {
  return blocks.flatMap((block) => {
    if (block.type !== 'repeat') return [block];
    if (block.n <= 0) return [];
    const children = executableBlocks(block.blocks);
    return children.length ? [{ ...block, blocks: children }] : [];
  });
}

/** Застосовує один примітивний блок. Повертає { turtle, segment }. */
export function applyBlock(turtle, block) {
  switch (block.type) {
    case 'step': return moveForward(turtle, STEP_LENGTH);
    case 'forward': return moveForward(turtle, block.n);
    case 'back': return moveBack(turtle, block.n);
    case 'turn_right90': return { turtle: turnRight(turtle, QUARTER_TURN), segment: null };
    case 'turn_left90': return { turtle: turnLeft(turtle, QUARTER_TURN), segment: null };
    case 'right': return { turtle: turnRight(turtle, block.n), segment: null };
    case 'left': return { turtle: turnLeft(turtle, block.n), segment: null };
    case 'pen_up': return { turtle: penUp(turtle), segment: null };
    case 'pen_down': return { turtle: penDown(turtle), segment: null };
    case 'color': return { turtle: setColor(turtle, colorHex(block.color)), segment: null };
    default: return { turtle, segment: null };
  }
}

/**
 * @param {object[]} blocks дерево блоків (з id)
 * @param {object} lesson рівень (береться start і pen) або готова черепаха через options.turtle
 * @param {{ turtle?: object, maxSteps?: number }} [options]
 */
export function* runSteps(blocks, lesson, options = {}) {
  const maxSteps = options.maxSteps ?? LIMITS.maxExpandedActions;
  let turtle = options.turtle ?? createTurtleForLesson(lesson);
  let executed = 0;

  function* execute(list) {
    for (const block of list) {
      if (block.type === 'repeat') {
        for (let index = 0; index < block.n; index += 1) {
          yield* execute(block.blocks);
        }
      } else {
        if (executed >= maxSteps) {
          throw new Error('Забагато кроків у програмі.');
        }
        executed += 1;
        const before = turtle;
        const result = applyBlock(turtle, block);
        turtle = result.turtle;
        yield { blockId: block.id, before, after: turtle, segment: result.segment };
      }
    }
  }

  yield* execute(executableBlocks(blocks));
}

/** Виконує програму повністю (без анімації): відрізки й фінальний стан. */
export function runProgram(blocks, lesson, options = {}) {
  const segments = [];
  let steps = 0;
  let finalTurtle = options.turtle ?? createTurtleForLesson(lesson);
  for (const step of runSteps(blocks, lesson, options)) {
    steps += 1;
    finalTurtle = step.after;
    if (step.segment) segments.push(step.segment);
  }
  return { segments, turtle: finalTurtle, steps };
}
