import { uk } from '../js/i18n/uk.js';

const summary = document.getElementById('encoding-summary');
const results = document.getElementById('encoding-results');

const suspiciousPatterns = [
    '\u00D0',
    '\u00D1',
    '\u00E2',
    '\uFFFD'
];

const expectedTexts = [
    uk.meta.title,
    uk.app.skipLink,
    uk.score.display.replace('{apples}', '0').replace('{stars}', '0'),
    uk.app.keyboardMode,
    uk.intro.title,
    uk.intro.button,
    uk.app.controlsLabel
];

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function addResult(message, ok) {
    const item = document.createElement('li');
    item.className = ok ? 'pass' : 'fail';
    item.textContent = `${ok ? 'PASS' : 'FAIL'}: ${message}`;
    results.appendChild(item);
}

async function fetchText(url) {
    const response = await fetch(url);
    return response.text();
}

function hasSuspiciousEncodingArtifacts(text) {
    return suspiciousPatterns.some((pattern) => text.includes(pattern));
}

async function run() {
    const filesToCheck = [
        '../index.html',
        '../js/i18n/uk.js',
        '../js/i18n/index.js',
        '../js/app/bootstrap.js',
        '../js/scenes/intro-scene.js',
        '../js/scenes/dialog-scene.js',
        '../js/scenes/game-scene.js',
        './integration-test.js',
        './gameplay-integration-test.js'
    ];

    for (const file of filesToCheck) {
        const content = await fetchText(file);
        assert(!hasSuspiciousEncodingArtifacts(content), `${file} contains suspicious encoding artifacts.`);
        addResult(`${file} has no suspicious encoding artifacts`, true);
    }

    expectedTexts.forEach((text) => {
        assert(!hasSuspiciousEncodingArtifacts(text), `Reference string "${text}" looks corrupted.`);
        addResult(`Reference string "${text}" looks correct`, true);
    });

    summary.textContent = 'PASS: no encoding artifacts found';
    summary.className = 'pass';
}

run().catch((error) => {
    addResult(error.message, false);
    summary.textContent = `FAIL: ${error.message}`;
    summary.className = 'fail';
});
