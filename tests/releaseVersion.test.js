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
    '404.html',
    'manual.html',
    'lessons.html',
    'quiz.html',
    'resources.html',
    'teacher_guidelines.html',
    'advice_for_parents.html',
    'zen.html',
    'about.html',
    'privacy.html',
];

function getCanonicalReleaseVersion() {
    const releaseConfig = JSON.parse(fs.readFileSync('release-version.json', 'utf8'));
    assert.match(
        releaseConfig.releaseVersion,
        /^\d{4}-\d{2}-\d{2}-\d+$/,
        'release-version.json should define a valid releaseVersion'
    );
    return releaseConfig.releaseVersion;
}

function getReleaseVersionFromServiceWorker() {
    const sw = fs.readFileSync('sw.js', 'utf8');
    const match = sw.match(/const CACHE_VERSION = '([^']+)';/);
    assert.ok(match, 'sw.js should define CACHE_VERSION');
    return match[1];
}

runTest('release-version.json is the canonical release token', () => {
    assert.equal(getReleaseVersionFromServiceWorker(), getCanonicalReleaseVersion());
});

runTest('release version stays synchronized across service worker entry points', () => {
    const releaseVersion = getCanonicalReleaseVersion();
    const registerServiceWorkerJs = fs.readFileSync('js/registerServiceWorker.js', 'utf8');

    assert.equal(
        registerServiceWorkerJs.includes(`/sw.js?v=${releaseVersion}`),
        true,
        'js/registerServiceWorker.js should register the current service worker version'
    );
});

runTest('release version stays synchronized across public HTML entry points', () => {
    const releaseVersion = getCanonicalReleaseVersion();

    htmlFiles.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');

        assert.equal(
            html.includes(`Static deployment release token: ${releaseVersion}`),
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

runTest('release version stays synchronized inside generated SW precache arrays', () => {
    const releaseVersion = getCanonicalReleaseVersion();
    const swSource = fs.readFileSync('sw.js', 'utf8');

    const criticalMatch = swSource.match(/const CRITICAL_PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
    const optionalMatch = swSource.match(/const OPTIONAL_PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
    assert.ok(criticalMatch, 'sw.js must define CRITICAL_PRECACHE_URLS');
    assert.ok(optionalMatch, 'sw.js must define OPTIONAL_PRECACHE_URLS');

    const versionedUrls = `${criticalMatch[1]}\n${optionalMatch[1]}`.match(/[^\s'"]+\?v=[^'"\s]+/g) || [];
    assert.ok(versionedUrls.length > 0, 'generated precache arrays should contain versioned assets');

    versionedUrls.forEach((url) => {
        assert.ok(
            url.endsWith(`?v=${releaseVersion}`),
            `generated precache has stale asset version: ${url} (expected ?v=${releaseVersion})`
        );
    });
});

console.log('Release version tests completed.');
