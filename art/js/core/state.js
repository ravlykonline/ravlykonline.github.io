import { lessons } from '../data/lessons.js';

function createSnail(lesson) {
  return { ...lesson.start };
}

export const appState = {
  currentLessonIndex: 0,
  currentLesson: lessons[0],
  snail: createSnail(lessons[0]),
  workspace: [],
  running: false,
  doneLessons: new Set(),
  trailPoints: [],
  activeBlockId: null,
  codePanelOpen: false,
};

let blockIdCounter = 1;

export function nextBlockId() {
  return blockIdCounter++;
}

export function setLesson(index) {
  appState.currentLessonIndex = index;
  appState.currentLesson = lessons[index];
  appState.workspace = [];
  appState.activeBlockId = null;
  resetRuntimeState();
}

export function resetRuntimeState() {
  appState.snail = createSnail(appState.currentLesson);
  appState.trailPoints = [];
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

export function toggleCodePanelState() {
  appState.codePanelOpen = !appState.codePanelOpen;
  return appState.codePanelOpen;
}
