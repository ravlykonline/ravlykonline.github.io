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
