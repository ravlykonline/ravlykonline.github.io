import assert from 'node:assert/strict';
import fs from 'node:fs';

function runTest(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAIL: ${name}`);
        throw error;
    }
}

const htmlFiles = [
    'index.html',
    'manual.html',
    'lessons.html',
    'quiz.html',
    'resources.html',
    'teacher_guidelines.html',
    'advice_for_parents.html',
    'zen.html',
    'about.html',
];

function getReleaseVersionFromServiceWorker() {
    const sw = fs.readFileSync('sw.js', 'utf8');
    const match = sw.match(/const CACHE_VERSION = '([^']+)';/);
    assert.ok(match, 'sw.js should define CACHE_VERSION');
    return match[1];
}

runTest('release version stays synchronized across service worker entry points', () => {
    const releaseVersion = getReleaseVersionFromServiceWorker();
    const registerServiceWorkerJs = fs.readFileSync('js/registerServiceWorker.js', 'utf8');

    assert.equal(
        registerServiceWorkerJs.includes(`/sw.js?v=${releaseVersion}`),
        true,
        'js/registerServiceWorker.js should register the current service worker version'
    );
});

runTest('release version stays synchronized across public HTML entry points', () => {
    const releaseVersion = getReleaseVersionFromServiceWorker();

    htmlFiles.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');

        assert.equal(
            html.includes(`Release token for GitHub Pages cache busting: ${releaseVersion}`),
            true,
            `${path} should expose the current release token comment`
        );

        const versionedAssetUrls = html.match(/(?:site\.webmanifest|(?:css|js)\/[^"]+)\?v=([^"]+)/g) || [];
        assert.ok(versionedAssetUrls.length > 0, `${path} should include versioned public assets`);

        versionedAssetUrls.forEach((assetUrl) => {
            assert.equal(
                assetUrl.endsWith(`?v=${releaseVersion}`),
                true,
                `${path} has stale asset version: ${assetUrl}`
            );
        });
    });
});

console.log('Release version tests completed.');
