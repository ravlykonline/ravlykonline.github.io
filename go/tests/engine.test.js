const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { bootstrapEngineHarness, root } = require('./testHelpers.cjs');

test('invalid-turn helper modal opens after broken routes on straight and turn levels', async () => {
  const withoutTurns = await bootstrapEngineHarness();
  await withoutTurns.app.engine.run();
  assert.equal(withoutTurns.modalCalls.turnHint, 1);

  const withTurns = await bootstrapEngineHarness({
    id: 1000,
    allowedTiles: ['up', 'right', 'down', 'left', 'left-up']
  });
  await withTurns.app.engine.run();
  assert.equal(withTurns.modalCalls.turnHint, 1);
});

test('helper modal also opens when the start command is not next to the snail', async () => {
  const harness = await bootstrapEngineHarness({
    presetArrows: { '0,3': 'right' },
    allowedTiles: ['up', 'right', 'down', 'left']
  });

  await harness.app.engine.run();
  assert.equal(harness.modalCalls.turnHint, 1);
});

test('turn hint modal keeps turn-specific copy guarded behind turn-tile levels', () => {
  const engine = fs.readFileSync(path.join(root, 'js/engine/runtime.js'), 'utf8');
  const modalRenderers = fs.readFileSync(path.join(root, 'js/ui/modals.js'), 'utf8');
  const engineRoute = fs.readFileSync(path.join(root, 'js/engine/runtime.js'), 'utf8');

  assert.ok(engine.includes('includeTurnHint: app.levelUsesTurnTiles()'));
  assert.ok(modalRenderers.includes('function showTurnHintModal(options = {})'));
  assert.ok(modalRenderers.includes('if (includeTurnHint)'));
  assert.ok(engineRoute.includes('function findNeighborStartMove('));
  assert.ok(engineRoute.includes('function analyzeCurrentRoute('));
  assert.ok(engineRoute.includes('function resolveRouteStep('));
  assert.ok(engineRoute.includes('function inspectForwardMove('));
  assert.ok(engine.includes('showTurnModal: true'));
});
