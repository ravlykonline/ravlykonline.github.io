import assert from 'node:assert/strict';
import { evaluateReleaseTokenContract, isTokenGovernedAsset } from '../scripts/check-release-token.mjs';
import { runTest } from './testUtils.js';

runTest('release token guard recognises cache-versioned assets', () => {
    assert.equal(isTokenGovernedAsset('index.html'), true);
    assert.equal(isTokenGovernedAsset('lessons.html'), true);
    assert.equal(isTokenGovernedAsset('js/main.js'), true);
    assert.equal(isTokenGovernedAsset('js/modules/canvasStateController.js'), true);
    assert.equal(isTokenGovernedAsset('css/main-editor.css'), true);
    assert.equal(isTokenGovernedAsset('sw.js'), true);
});

runTest('release token guard ignores files the token does not version', () => {
    // Tests, docs, tooling and published subprojects are not requested with ?v=
    // and are not precached under the token, so they must not force a bump.
    assert.equal(isTokenGovernedAsset('tests/controllers.test.js'), false);
    assert.equal(isTokenGovernedAsset('tests/e2e/index.smoke.spec.js'), false);
    assert.equal(isTokenGovernedAsset('scripts/build-pages-artifact.mjs'), false);
    assert.equal(isTokenGovernedAsset('ARCHITECTURE.md'), false);
    assert.equal(isTokenGovernedAsset('old/index.html'), false);
    assert.equal(isTokenGovernedAsset('go/js/app.js'), false);
    assert.equal(isTokenGovernedAsset('assets/icons/play.svg'), false);
});

runTest('release token guard fails published asset changes without a token bump', () => {
    // This is the exact shape of the change that shipped a broken «Стан» button.
    const result = evaluateReleaseTokenContract([
        'index.html',
        'js/main.js',
        'js/modules/canvasStateController.js',
        'tests/canvasState.test.js',
    ]);
    assert.equal(result.ok, false);
    assert.equal(result.tokenChanged, false);
    assert.deepEqual(result.governed, ['index.html', 'js/main.js', 'js/modules/canvasStateController.js']);
});

runTest('release token guard passes when the token moves with the assets', () => {
    const result = evaluateReleaseTokenContract(['js/main.js', 'sw.js', 'release-version.json']);
    assert.equal(result.ok, true);
    assert.equal(result.tokenChanged, true);
});

runTest('release token guard stays quiet for test-only and docs-only changes', () => {
    const result = evaluateReleaseTokenContract(['tests/lessons.test.js', 'TESTING.md']);
    assert.equal(result.ok, true);
    assert.deepEqual(result.governed, []);
});

console.log('Release token guard tests completed.');
