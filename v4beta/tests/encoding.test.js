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

const filesToValidate = [
    'index.html',
    'manual.html',
    'js/main.js',
    'css/global.css',
    'css/main-editor.css',
    'README.md',
    'TECHNICAL_GUIDE.md',
];

runTest('critical files are valid UTF-8 text without replacement characters', () => {
    filesToValidate.forEach((path) => {
        const content = fs.readFileSync(path, 'utf8');
        assert.equal(content.includes('\uFFFD'), false, `${path} contains replacement character U+FFFD`);
    });
});

runTest('index page keeps key Ukrainian UI strings intact', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const requiredSnippets = [
        '<meta charset="UTF-8" />',
        '🐌 Малюй з Равликом! 🐌',
        'Завантажити',
        'Поділитися',
        'Свайпни вліво або вправо, щоб побачити більше прикладів →',
    ];
    requiredSnippets.forEach((snippet) => {
        assert.equal(indexHtml.includes(snippet), true, `Missing snippet: ${snippet}`);
    });
});

console.log('Encoding tests completed.');
