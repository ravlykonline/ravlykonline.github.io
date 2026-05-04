const past = [];
const future = [];

export function pushSnapshot(workspace) {
  past.push(JSON.parse(JSON.stringify(workspace)));
  future.length = 0;
}

export function undo(currentWorkspace) {
  if (past.length === 0) return null;
  future.push(JSON.parse(JSON.stringify(currentWorkspace)));
  return past.pop();
}

export function redo(currentWorkspace) {
  if (future.length === 0) return null;
  past.push(JSON.parse(JSON.stringify(currentWorkspace)));
  return future.pop();
}

export function canUndo() { return past.length > 0; }
export function canRedo() { return future.length > 0; }

export function clearHistory() {
  past.length = 0;
  future.length = 0;
}
