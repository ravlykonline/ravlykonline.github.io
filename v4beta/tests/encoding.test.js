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

const htmlFilesToValidateTargetRel = [
    'index.html',
    'manual.html',
    'lessons.html',
    'resources.html',
    'teacher_guidelines.html',
    'advice_for_parents.html',
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

runTest('all target="_blank" links explicitly declare rel="noopener noreferrer"', () => {
    htmlFilesToValidateTargetRel.forEach((path) => {
        const html = fs.readFileSync(path, 'utf8');
        const anchorTagPattern = /<a\b[^>]*>/gi;
        const anchorTags = html.match(anchorTagPattern) || [];

        anchorTags.forEach((tag) => {
            if (!/target\s*=\s*"_blank"/i.test(tag)) return;
            const relMatch = tag.match(/rel\s*=\s*"([^"]*)"/i);
            assert.ok(relMatch, `${path} has target="_blank" without rel: ${tag}`);
            const relValue = relMatch[1].toLowerCase();
            assert.ok(relValue.includes('noopener'), `${path} target="_blank" link misses noopener: ${tag}`);
            assert.ok(relValue.includes('noreferrer'), `${path} target="_blank" link misses noreferrer: ${tag}`);
        });
    });
});

runTest('editor toolbar keeps unified download button and no legacy save buttons', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const mainJs = fs.readFileSync('js/main.js', 'utf8');

    assert.equal(indexHtml.includes('id="download-btn"'), true, 'index.html must contain #download-btn');
    assert.equal(indexHtml.includes('id="save-btn"'), false, 'index.html should not contain legacy #save-btn');
    assert.equal(indexHtml.includes('id="save-code-btn"'), false, 'index.html should not contain legacy #save-code-btn');

    assert.equal(mainJs.includes('getElementById("download-btn")'), true, 'main.js must bind #download-btn');
    assert.equal(mainJs.includes('getElementById("save-btn")'), false, 'main.js should not bind legacy #save-btn');
    assert.equal(mainJs.includes('getElementById("save-code-btn")'), false, 'main.js should not bind legacy #save-code-btn');
});

console.log('Encoding tests completed.');
