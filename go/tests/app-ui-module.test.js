const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { readUtf8, root } = require('./testHelpers.cjs');

test('appUi module exposes the current UI controller without legacy global wiring', () => {
  const source = readUtf8('js/ui/appUi.js');

  assert.match(source, /export function createAppUi\(/);
  assert.doesNotMatch(source, /window\.SnailGame/);
  assert.match(source, /createAppUiLevelFlow\(/);
  assert.match(source, /loadCurrentLevel: flowApi\.loadCurrentLevel/);
  assert.match(source, /bindAppUiEvents\(/);
  assert.match(source, /app\.ui = ui/);
});

test('appUi module still avoids persistent storage and dynamic code execution', () => {
  const source = fs.readFileSync(path.join(root, 'js/ui/appUi.js'), 'utf8');

  assert.doesNotMatch(source, /localStorage|sessionStorage/);
  assert.doesNotMatch(source, /eval\(|new Function|document\.write/);
});
