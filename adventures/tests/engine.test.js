const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { bootstrapEngineHarness, root } = require('./testHelpers.cjs');

test('invalid-turn helper modal opens only on levels with turn tiles', async () => {
  const withoutTurns = bootstrapEngineHarness();
  await withoutTurns.app.engine.run();
  assert.equal(withoutTurns.modalCalls.turnHint, 0);

  const withTurns = bootstrapEngineHarness({
    id: 1000,
    allowedTiles: ['up', 'right', 'down', 'left', 'left-up']
  });
  await withTurns.app.engine.run();
  assert.equal(withTurns.modalCalls.turnHint, 1);
});

test('turn hint modal stays guarded behind turn-tile levels', () => {
  const engine = fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8');
  const engineRoute = fs.readFileSync(path.join(root, 'js/engineRoute.js'), 'utf8');

  assert.match(engine, /async function showTurnTryAgain\(\) \{[\s\S]*app\.levelUsesTurnTiles\(\)/);
  assert.match(engineRoute, /app\.createEngineRoute/);
  assert.match(engineRoute, /function findNeighborStartMove\(/);
  assert.match(engineRoute, /function analyzeCurrentRoute\(/);
  assert.match(engineRoute, /function resolveRouteStep\(/);
  assert.match(engineRoute, /function inspectForwardMove\(/);
  assert.match(engine, /showTurnModal: true/);
});
