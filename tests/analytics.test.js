import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPagesArtifact } from '../scripts/build-pages-artifact.mjs';

function runTest(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAIL: ${name}`);
        throw error;
    }
}

const publicHtmlFiles = [
    'index.html',
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

const cloudflareBeaconScript = '<!-- Cloudflare Web Analytics --><script type=\'module\' src=\'https://static.cloudflareinsights.com/beacon.min.js\' data-cf-beacon=\'{"token": "46477cad50284d57abdf0b005192f4c0"}\'></script><!-- End Cloudflare Web Analytics -->';

function listHtmlFiles(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listHtmlFiles(entryPath);
        return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
    });
}

runTest('public pages load Cloudflare Web Analytics directly', () => {
    publicHtmlFiles.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');
        assert.equal(
            html.includes(cloudflareBeaconScript),
            true,
            `${path} should include the Cloudflare Web Analytics beacon`
        );
        assert.equal(
            (html.match(/static\.cloudflareinsights\.com\/beacon\.min\.js/g) || []).length,
            1,
            `${path} should include exactly one Cloudflare beacon script`
        );
    });
});

runTest('public page CSP allows Cloudflare analytics and no Google analytics hosts', () => {
    publicHtmlFiles.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');
        assert.match(
            html,
            /script-src 'self' https:\/\/static\.cloudflareinsights\.com/,
            `${path} CSP should allow the Cloudflare script host`
        );
        assert.match(
            html,
            /connect-src 'self' https:\/\/cloudflareinsights\.com/,
            `${path} CSP should allow the Cloudflare analytics endpoint`
        );
        assert.equal(
            /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|gtag\(/.test(html),
            false,
            `${path} should not include Google Analytics hosts or gtag calls`
        );
    });
});

runTest('service worker no longer precaches the removed local analytics bootstrap', () => {
    const sw = fs.readFileSync('sw.js', 'utf8');
    assert.equal(sw.includes('/js/analytics.js'), false, 'sw.js should not precache js/analytics.js');
});

runTest('every analytics-enabled page links to the privacy notice', () => {
    const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ravlyk-analytics-'));
    const artifactRoot = path.join(temporaryRoot, 'site');

    try {
        buildPagesArtifact({ outputRoot: artifactRoot });
        const privacyPath = path.join(artifactRoot, 'privacy.html');

        listHtmlFiles(artifactRoot).forEach((htmlPath) => {
            const html = fs.readFileSync(htmlPath, 'utf8');
            if (!html.includes('static.cloudflareinsights.com/beacon.min.js')) return;

            const relativePath = path.relative(artifactRoot, htmlPath);
            const privacyLinks = [
                ...html.matchAll(/<a\b[^>]*\bhref=(['"])([^'"]*privacy\.html(?:[?#][^'"]*)?)\1/gi),
            ];
            assert.ok(privacyLinks.length > 0, `${relativePath} should link to the privacy notice`);

            assert.equal(
                privacyLinks.some((match) => {
                    const linkPath = match[2].split(/[?#]/)[0];
                    return path.resolve(path.dirname(htmlPath), linkPath) === privacyPath;
                }),
                true,
                `${relativePath} should link to the published root privacy.html`
            );
        });
    } finally {
        fs.rmSync(temporaryRoot, { recursive: true, force: true });
    }
});

runTest('privacy page explains the project data flow and analytics provider', () => {
    const html = fs.readFileSync('privacy.html', 'utf8');

    assert.match(html, /без облікових записів/);
    assert.match(html, /виконується локально у браузері/);
    assert.match(html, /Cloudflare Web Analytics/);
    assert.match(html, /не використовує cookies/);
    assert.match(html, /GitHub Pages/);
    assert.match(html, /#code=/);
});

console.log('Analytics tests completed.');
