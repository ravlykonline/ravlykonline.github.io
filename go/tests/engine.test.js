const test = require('node:test');
const assert = require('node:assert/strict');

const { bootstrapEngineHarness } = require('./testHelpers.cjs');

const failures = [
  {
    name: 'a missing arrow',
    presetArrows: { '1,2': 'right' },
    stop: [1, 3],
    message: 'noCommand'
  },
  {
    name: 'an incompatible turn',
    presetArrows: { '1,2': 'right', '1,3': 'left' },
    stop: [1, 3],
    message: 'invalidTurn'
  },
  {
    name: 'a missing starting arrow',
    presetArrows: { '0,3': 'right' },
    stop: [1, 1],
    message: 'placeNearby'
  }
];

for (const { name, presetArrows, stop, message } of failures) {
  test(`the engine highlights ${name} and allows editing without a dialog`, async () => {
    const { app, modalCalls } = await bootstrapEngineHarness({ presetArrows });
    const markers = [];
    const statuses = [];
    app.ui.setStopMark = (r, c) => markers.push([r, c]);
    app.ui.setStatus = (_icon, text) => statuses.push(text);

    await app.engine.run();

    assert.deepEqual(markers, [stop]);
    assert.equal(statuses.at(-1), app.text.engine[message]);
    assert.equal(app.state.running, false);
    assert.equal(modalCalls.turnHint, 0);
  });
}

test('an obstacle flashes the rock but marks the card under the snail as the stop', async () => {
  const { app } = await bootstrapEngineHarness({
    obstacles: [{ r: 1, c: 3, kind: 'rock', label: 'Камінь' }],
    presetArrows: { '1,2': 'right' }
  });
  const markers = [];
  const flashes = [];
  const statuses = [];
  app.ui.setStopMark = (r, c) => markers.push([r, c]);
  app.ui.flashCell = (r, c) => flashes.push([r, c]);
  app.ui.setStatus = (_icon, text) => statuses.push(text);

  await app.engine.run();

  assert.deepEqual(markers, [[1, 2]]);
  assert.deepEqual(flashes, [[1, 3]]);
  assert.equal(statuses.at(-1), app.text.engine.obstacle);
  assert.match(app.text.engine.obstacle, /Заміни картку/);
});
