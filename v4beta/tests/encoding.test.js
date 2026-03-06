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

runTest('index modals keep required ARIA dialog contract', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const overlays = [
        { overlayId: 'help-modal-overlay', contentId: 'help-modal-content', titleId: 'help-modal-title-static' },
        { overlayId: 'clear-confirm-modal-overlay', contentId: 'clear-confirm-modal-content', titleId: 'clear-modal-title-static' },
        { overlayId: 'stop-confirm-modal-overlay', contentId: 'stop-confirm-modal-content', titleId: 'stop-modal-title-static' },
        { overlayId: 'download-modal-overlay', contentId: 'download-modal-content', titleId: 'download-modal-title-static' },
    ];

    overlays.forEach(({ overlayId, contentId, titleId }) => {
        const overlayPattern = new RegExp(`<div[^>]*id="${overlayId}"[^>]*>`, 'i');
        const overlayMatch = indexHtml.match(overlayPattern);
        assert.ok(overlayMatch, `Missing modal overlay: ${overlayId}`);

        const overlayTag = overlayMatch[0];
        assert.ok(/role\s*=\s*"dialog"/i.test(overlayTag), `${overlayId} misses role="dialog"`);
        assert.ok(/aria-modal\s*=\s*"true"/i.test(overlayTag), `${overlayId} misses aria-modal="true"`);
        assert.ok(
            new RegExp(`aria-labelledby\\s*=\\s*"${titleId}"`, 'i').test(overlayTag),
            `${overlayId} should reference ${titleId} via aria-labelledby`
        );

        assert.ok(indexHtml.includes(`id="${contentId}"`), `Missing modal content container: ${contentId}`);
        assert.ok(indexHtml.includes(`id="${titleId}"`), `Missing modal title element: ${titleId}`);
    });
});

runTest('accessibility stylesheet keeps legacy cleanup constraints', () => {
    const accessibilityCss = fs.readFileSync('css/accessibility.css', 'utf8');
    const forbiddenSnippets = [
        '--link-color:',
        '--link-hover-color:',
        '--btn-success-bg:',
        '--btn-warning-bg:',
        '--btn-danger-bg:',
        '--btn-info-bg:',
        '.error-message-global',
        '.success-message-global',
    ];

    forbiddenSnippets.forEach((snippet) => {
        assert.equal(
            accessibilityCss.includes(snippet),
            false,
            `css/accessibility.css should not include legacy snippet: ${snippet}`
        );
    });
});

runTest('main script keeps canonical modal helper usage', () => {
    const mainJs = fs.readFileSync('js/main.js', 'utf8');

    const requiredSnippets = [
        "isModalOpen('help-modal-overlay')",
        "isModalOpen('clear-confirm-modal-overlay')",
        "isModalOpen('stop-confirm-modal-overlay')",
        "bindModalOverlayClose('help-modal-overlay', hideHelpModal)",
        "bindModalOverlayClose('clear-confirm-modal-overlay', hideClearConfirmModal)",
        "bindModalOverlayClose('stop-confirm-modal-overlay', () => closeStopConfirmDialog(true))",
        "bindModalOverlayClose('download-modal-overlay', hideDownloadModal)",
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            mainJs.includes(snippet),
            true,
            `js/main.js should contain canonical modal helper usage: ${snippet}`
        );
    });

    const forbiddenSnippets = [
        "document.getElementById('help-modal-overlay')?.addEventListener('click'",
        "document.getElementById('clear-confirm-modal-overlay')?.addEventListener('click'",
        "document.getElementById('stop-confirm-modal-overlay')?.addEventListener('click'",
        "document.getElementById('download-modal-overlay')?.addEventListener('click'",
        "document.getElementById('help-modal-overlay').classList.contains('hidden')",
        "document.getElementById('clear-confirm-modal-overlay').classList.contains('hidden')",
        "document.getElementById('stop-confirm-modal-overlay').classList.contains('hidden')",
        "document.getElementById('download-modal-overlay').classList.contains('hidden')",
    ];

    forbiddenSnippets.forEach((snippet) => {
        assert.equal(
            mainJs.includes(snippet),
            false,
            `js/main.js should not include legacy modal handling snippet: ${snippet}`
        );
    });
});

runTest('ui module keeps canonical global message system usage', () => {
    const uiJs = fs.readFileSync('js/modules/ui.js', 'utf8');

    const requiredSnippets = [
        "document.getElementById('global-message-display')",
        "messageDiv.id = 'global-message-display'",
        'message-global message-${type}-global',
        "messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status')",
        "const closeBtn = messageDiv.querySelector('.message-close-btn-global')",
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            uiJs.includes(snippet),
            true,
            `js/modules/ui.js should contain canonical message usage snippet: ${snippet}`
        );
    });

    const forbiddenSnippets = [
        'error-message-global',
        'success-message-global',
        "messageDiv.id = 'error-message-global'",
        "messageDiv.id = 'success-message-global'",
    ];

    forbiddenSnippets.forEach((snippet) => {
        assert.equal(
            uiJs.includes(snippet),
            false,
            `js/modules/ui.js should not include legacy message snippet: ${snippet}`
        );
    });
});

runTest('ui module keeps canonical modal content mapping', () => {
    const uiJs = fs.readFileSync('js/modules/ui.js', 'utf8');

    const requiredSnippets = [
        "const modalContentByOverlayId = {",
        "'help-modal-overlay': 'help-modal-content'",
        "'clear-confirm-modal-overlay': 'clear-confirm-modal-content'",
        "'stop-confirm-modal-overlay': 'stop-confirm-modal-content'",
        "'download-modal-overlay': 'download-modal-content'",
        'const modalContentId = modalContentByOverlayId[modalId] || `${modalId}-content`;',
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            uiJs.includes(snippet),
            true,
            `js/modules/ui.js should contain canonical modal mapping snippet: ${snippet}`
        );
    });
});

console.log('Encoding tests completed.');
