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
  bestStars: new Map(), // індекс рівня → найкращі зірки за сесію (зберігаються в sessionStorage, див. state/progressStore.js)
  turtleSegments: [],
  activeBlockId: null,
  insertTargetId: null,
  view: 'blocks', // 'blocks' | 'code'
  speed: DEFAULT_SPEED,
  autoRun: false, // триває безперервний запуск («Старт/Далі»): «Крок» і «Старт» тоді вимкнені
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

// Програма кожного рівня в пам’яті сесії: при поверненні на рівень вона не губиться.
// Лише в оперативній пам’яті — не в localStorage/sessionStorage (див. AGENTS.md).
const deepClone = (value) => JSON.parse(JSON.stringify(value)); // дерево блоків — звичайний JSON
const levelMemory = new Map();
let hasLoadedLesson = false;

function rememberCurrentLesson() {
  if (!hasLoadedLesson) return;
  levelMemory.set(appState.currentLesson.id, {
    workspace: deepClone(appState.workspace),
    loose: deepClone(appState.loose),
  });
}

/** Скидає пам’ять програм (для тестів). */
export function clearLevelMemory() {
  levelMemory.clear();
  hasLoadedLesson = false;
}

export function setLesson(index) {
  rememberCurrentLesson();
  hasLoadedLesson = true;
  appState.currentLessonIndex = index;
  appState.currentLesson = lessons[index];
  const remembered = levelMemory.get(appState.currentLesson.id);
  if (remembered) {
    appState.workspace = deepClone(remembered.workspace);
    appState.loose = deepClone(remembered.loose);
  } else {
    appState.workspace = initialWorkspace(appState.currentLesson);
    appState.loose = [];
  }
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

export function markLessonDone(index, stars = 3) {
  appState.doneLessons.add(index);
  appState.bestStars.set(index, Math.max(stars, appState.bestStars.get(index) ?? 0));
}

export function setView(view) {
  appState.view = view === 'code' ? 'code' : 'blocks';
  return appState.view;
}

export function setSpeed(speed) {
  appState.speed = speed;
}
