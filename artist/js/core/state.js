import { lessons } from '../data/lessons.js';
import { DEFAULT_SPEED } from '../domain/snail.js';
import { countBlocksIn, withIds } from './blockTree.js';

export const appState = {
  currentLessonIndex: 0,
  currentLesson: lessons[0],
  workspace: [], // головний стос під «коли ▶ натиснуто» — єдине, що виконується
  loose: [], // вільні стоси: [{ id, x, y, blocks }] — не виконуються
  errorBlockId: null,
  running: false, // є активний сеанс виконання (редагування заблоковане), навіть на паузі
  doneLessons: new Set(),
  turtleSegments: [],
  activeBlockId: null,
  insertTargetId: null,
  view: 'blocks', // 'blocks' | 'code'
  speed: DEFAULT_SPEED,
  animating: false, // триває анімація кроку (поза нею сеанс може стояти на паузі)
  introSeen: new Set(), // id рівнів, чиє інтро вже показано в цій сесії (без localStorage)
};

let blockIdCounter = 1;

export function nextBlockId() {
  return blockIdCounter++;
}

function initialWorkspace(lesson) {
  if (!lesson.startBlocks) return [];
  const blocks = withIds(lesson.startBlocks, blockIdCounter);
  blockIdCounter += countBlocksIn(blocks);
  return blocks;
}

export function setLesson(index) {
  appState.currentLessonIndex = index;
  appState.currentLesson = lessons[index];
  appState.workspace = initialWorkspace(appState.currentLesson);
  appState.loose = [];
  appState.errorBlockId = null;
  appState.activeBlockId = null;
  resetRuntimeState();
}

export function resetRuntimeState() {
  appState.turtleSegments = [];
  appState.activeBlockId = null;
}

export function setRunning(value) {
  appState.running = value;
}

export function setActiveBlock(id) {
  appState.activeBlockId = id;
}

export function markLessonDone(index) {
  appState.doneLessons.add(index);
}

export function setView(view) {
  appState.view = view === 'code' ? 'code' : 'blocks';
  return appState.view;
}

export function setSpeed(speed) {
  appState.speed = speed;
}
