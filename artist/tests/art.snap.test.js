import assert from 'node:assert/strict';

import {
  SNAP_HYSTERESIS, SNAP_RADIUS, connectionPointsFromLists, findSnapTarget, snapDistance, snapKey,
} from '../js/core/snap.js';
import { attachAbove, cloneDoc, placeTail } from '../js/core/workspace.js';

function runTest(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

const mainList = {
  owner: 'main',
  parentId: null,
  rect: { left: 20, top: 80 },
  kids: [
    { left: 20, top: 80, bottom: 120 },
    { left: 20, top: 120, bottom: 200 },
  ],
};

runTest('connectionPointsFromLists builds a point before every block and after the last', () => {
  const points = connectionPointsFromLists([mainList]);
  assert.deepEqual(points.map((p) => [p.index, p.x, p.y, p.anchor]), [
    [0, 20, 80, 'top'], [1, 20, 120, 'top'], [2, 20, 200, 'top'],
  ]);
});

runTest('an empty list (loop mouth) gets one point at its top-left corner', () => {
  const points = connectionPointsFromLists([{ owner: 'main', parentId: 7, rect: { left: 36, top: 150 }, kids: [] }]);
  assert.deepEqual(points, [{ owner: 'main', parentId: 7, index: 0, x: 36, y: 150, anchor: 'top' }]);
});

runTest('the first point of a loose stack is bottom-anchored (attach above it)', () => {
  const points = connectionPointsFromLists([{ ...mainList, owner: 5, looseRoot: true }]);
  assert.equal(points[0].anchor, 'bottom');
  assert.equal(points[1].anchor, 'top');
  assert.equal(points[2].anchor, 'top');
  // нижній кут хвоста висотою 40 на y=40 дорівнює точці y=80
  assert.equal(snapDistance(points[0], { x: 20, y: 40, height: 40 }), 0);
});

runTest('findSnapTarget picks the nearest point inside the radius and nothing outside', () => {
  const points = connectionPointsFromLists([mainList]);
  assert.equal(findSnapTarget(points, { x: 24, y: 118, height: 40 }).index, 1);
  assert.equal(findSnapTarget(points, { x: 24, y: 205, height: 40 }).index, 2);
  assert.equal(findSnapTarget(points, { x: 400, y: 120, height: 40 }), null, 'too far to the right');
  assert.equal(findSnapTarget(points, { x: 20, y: 400, height: 40 }), null);
  assert.equal(findSnapTarget([], { x: 0, y: 0, height: 40 }), null);
});

runTest('the radius is about 44 px and scales with zoom', () => {
  const points = [{ owner: 'main', parentId: null, index: 0, x: 0, y: 0, anchor: 'top' }];
  assert.ok(SNAP_RADIUS >= 40 && SNAP_RADIUS <= 48);
  assert.ok(findSnapTarget(points, { x: SNAP_RADIUS - 2, y: 0, height: 10 }));
  assert.equal(findSnapTarget(points, { x: SNAP_RADIUS + 2, y: 0, height: 10 }), null);
  assert.ok(findSnapTarget(points, { x: SNAP_RADIUS + 2, y: 0, height: 10 }, { scale: 1.5 }));
});

runTest('hysteresis keeps the previous point until another is clearly better', () => {
  const points = connectionPointsFromLists([mainList]);
  const previousKey = snapKey(points[1]); // y = 120
  // між index 1 (y=120) і index 2 (y=200) ближча index 2, але лише трохи
  const nearlyTie = { x: 20, y: 161, height: 40 }; // до 1: 41, до 2: 39
  assert.equal(findSnapTarget(points, nearlyTie).index, 2, 'without history the nearest wins');
  assert.equal(findSnapTarget(points, nearlyTie, { previousKey }).index, 1, 'with history the old one stays');
  // вже явно ближче до іншої — перемикаємося
  const clear = { x: 20, y: 190, height: 40 };
  assert.equal(findSnapTarget(points, clear, { previousKey }).index, 2);
});

runTest('hysteresis also lets the previous point survive slightly outside the radius', () => {
  const points = [{ owner: 'main', parentId: null, index: 0, x: 0, y: 0, anchor: 'top' }];
  const key = snapKey(points[0]);
  const edge = { x: SNAP_RADIUS + SNAP_HYSTERESIS - 1, y: 0, height: 10 };
  assert.equal(findSnapTarget(points, edge), null);
  assert.ok(findSnapTarget(points, edge, { previousKey: key }));
  assert.equal(findSnapTarget(points, { x: SNAP_RADIUS + SNAP_HYSTERESIS + 3, y: 0, height: 10 }, { previousKey: key }), null);
});

runTest('top and bottom anchored points with the same index have different keys', () => {
  const a = { owner: 3, parentId: null, index: 0, anchor: 'top' };
  const b = { ...a, anchor: 'bottom' };
  assert.notEqual(snapKey(a), snapKey(b));
  assert.equal(snapKey(null), '');
});

runTest('attachAbove puts the tail on top of a loose stack and lifts the stack by the tail height', () => {
  const doc = { main: [], loose: [{ id: 50, x: 100, y: 200, blocks: [{ id: 1, type: 'step' }] }] };
  const tail = [{ id: 2, type: 'step' }, { id: 3, type: 'step' }];
  assert.equal(attachAbove(doc, tail, 50, 80), true);
  assert.deepEqual(doc.loose[0].blocks.map((b) => b.id), [2, 3, 1]);
  assert.equal(doc.loose[0].y, 120);
  assert.equal(doc.loose[0].x, 100);
  const before = cloneDoc(doc);
  assert.equal(attachAbove(doc, tail, 999, 80), false, 'unknown stack');
  assert.deepEqual(doc, before);
  doc.loose[0].y = 30;
  attachAbove(doc, [{ id: 9, type: 'step' }], 50, 80);
  assert.equal(doc.loose[0].y, 0, 'never above the canvas');
});

runTest('placeTail works with points produced by the snap module', () => {
  const doc = { main: [{ id: 1, type: 'step' }], loose: [] };
  const points = connectionPointsFromLists([{ owner: 'main', parentId: null, rect: { left: 0, top: 0 }, kids: [{ left: 0, top: 0, bottom: 40 }] }]);
  const target = findSnapTarget(points, { x: 3, y: 44, height: 40 });
  assert.equal(target.index, 1);
  assert.equal(placeTail(doc, [{ id: 2, type: 'step' }], target), true);
  assert.deepEqual(doc.main.map((b) => b.id), [1, 2]);
});
