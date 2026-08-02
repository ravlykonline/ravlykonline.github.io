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
    publicHtmlFiles.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');
        assert.match(
            html,
            /href="privacy\.html"/,
            `${path} should link to privacy.html`
        );
    });
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
