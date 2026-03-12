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
    'lessons.html',
    'js/main.js',
    'js/modules/fileActionsController.js',
    'js/modules/uiMessages.js',
    'js/modules/accessibilityNotifications.js',
    'css/global.css',
    'css/lessons.css',
    'css/main-editor.css',
    'css/about-project.css',
    'README.md',
    'TECHNICAL_GUIDE.md',
    'about.html',
];

const htmlFilesToValidateTargetRel = [
    'index.html',
    'manual.html',
    'lessons.html',
    'resources.html',
        'teacher_guidelines.html',
        'advice_for_parents.html',
        'about.html',
    ];

runTest('repository defines editor and git encoding/line-ending policy files', () => {
    const editorConfig = fs.readFileSync('.editorconfig', 'utf8');
    const gitAttributes = fs.readFileSync('.gitattributes', 'utf8');

    const editorRequired = [
        'root = true',
        'charset = utf-8',
        'end_of_line = lf',
        'insert_final_newline = true',
    ];
    editorRequired.forEach((snippet) => {
        assert.equal(editorConfig.includes(snippet), true, `.editorconfig missing: ${snippet}`);
    });

    const attributesRequired = [
        '* text=auto eol=lf',
        '*.png binary',
        '*.woff2 binary',
    ];
    attributesRequired.forEach((snippet) => {
        assert.equal(gitAttributes.includes(snippet), true, `.gitattributes missing: ${snippet}`);
    });
});

runTest('critical files are valid UTF-8 text without replacement characters', () => {
    filesToValidate.forEach((path) => {
        const content = fs.readFileSync(path, 'utf8');
        assert.equal(content.includes('\uFFFD'), false, `${path} contains replacement character U+FFFD`);
    });
});

runTest('critical text files are saved without UTF-8 BOM', () => {
    const allowUtf8Bom = new Set([
        'manual.html',
        'js/main.js',
    ]);

    filesToValidate.forEach((path) => {
        const contentBytes = fs.readFileSync(path);
        const hasUtf8Bom = contentBytes.length >= 3
            && contentBytes[0] === 0xef
            && contentBytes[1] === 0xbb
            && contentBytes[2] === 0xbf;

        if (allowUtf8Bom.has(path)) {
            return;
        }

        assert.equal(hasUtf8Bom, false, `${path} should not contain UTF-8 BOM`);
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

runTest('sitemap includes published public support pages', () => {
    const sitemapXml = fs.readFileSync('sitemap.xml', 'utf8');

    const requiredSnippets = [
        'https://ravlyk.org/resources.html',
        'https://ravlyk.org/about.html',
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            sitemapXml.includes(snippet),
            true,
            `sitemap.xml should include published page: ${snippet}`
        );
    });
});

runTest('public pages and client scripts do not hardcode the temporary /v4beta path', () => {
    const files = [
        'index.html',
        'manual.html',
        'lessons.html',
        'resources.html',
        'quiz.html',
        'teacher_guidelines.html',
        'advice_for_parents.html',
        'zen.html',
        'about.html',
        'README.md',
        'js/main.js',
        'js/manualPage.js',
        'js/lessonsPage.js',
        'js/quizPage.js',
        'js/modules/manualPageController.js',
        'js/modules/navigationPrefetch.js',
    ];

    files.forEach((path) => {
        const content = fs.readFileSync(path, 'utf8');
        assert.equal(
            /\/v4beta\//.test(content),
            false,
            `${path} should not hardcode the temporary /v4beta path`
        );
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

runTest('index page keeps a single module bootstrap entry and no duplicate direct module loads', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    assert.equal(
        /<script type="module" src="js\/main\.js(?:\?v=[^"]+)?"><\/script>/.test(indexHtml),
        true,
        'index.html must bootstrap through js/main.js'
    );
    assert.equal(
        indexHtml.includes('<script type="module" src="js/modules/constants.js"></script>'),
        false,
        'index.html should not directly load js/modules/constants.js'
    );
    assert.equal(
        indexHtml.includes('<script type="module" src="js/modules/ui.js"></script>'),
        false,
        'index.html should not directly load js/modules/ui.js'
    );
    assert.equal(
        indexHtml.includes('<script type="module" src="js/modules/ravlykInterpreter.js"></script>'),
        false,
        'index.html should not directly load js/modules/ravlykInterpreter.js'
    );
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

runTest('lessons stylesheet no longer contains archive-only selectors', () => {
    const lessonsCss = fs.readFileSync('css/lessons.css', 'utf8');
    const forbiddenSnippets = [
        '.lesson-content .why-important h4',
        '.task h4',
        'Archive-only: remove after deleting lessons_old.html.',
    ];

    forbiddenSnippets.forEach((snippet) => {
        assert.equal(
            lessonsCss.includes(snippet),
            false,
            `css/lessons.css should not include archive-only lessons snippet: ${snippet}`
        );
    });
});

runTest('modal controller keeps canonical modal helper usage', () => {
    const mainJs = fs.readFileSync('js/main.js', 'utf8');
    const modalControllerJs = fs.readFileSync('js/modules/modalController.js', 'utf8');

    const mainRequiredSnippets = [
        "createModalController",
        "modalController.setupModalInteractions({",
        "modalController.requestClearConfirmation",
    ];

    mainRequiredSnippets.forEach((snippet) => {
        assert.equal(
            mainJs.includes(snippet),
            true,
            `js/main.js should contain modal controller wiring: ${snippet}`
        );
    });

    const requiredSnippets = [
        'function closeModalIfOpen(overlayId, closeFn) {',
        'if (!isModalOpen(overlayId)) return;',
        "isModalOpen('stop-confirm-modal-overlay')",
        "closeModalIfOpen('help-modal-overlay', hideHelpModal)",
        "closeModalIfOpen('clear-confirm-modal-overlay', hideClearConfirmModal)",
        "bindModalOverlayClose('help-modal-overlay', hideHelpModal)",
        "bindModalOverlayClose('clear-confirm-modal-overlay', hideClearConfirmModal)",
        "bindModalOverlayClose('stop-confirm-modal-overlay', () => executionController.closeStopConfirmDialog(true))",
        "bindModalOverlayClose('download-modal-overlay', hideDownloadModal)",
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            modalControllerJs.includes(snippet),
            true,
            `js/modules/modalController.js should contain canonical modal helper usage: ${snippet}`
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

runTest('main script uses centralized navigation controller for external tabs', () => {
    const mainJs = fs.readFileSync('js/main.js', 'utf8');
    const navigationJs = fs.readFileSync('js/modules/navigationPrefetch.js', 'utf8');

    const mainRequiredSnippets = [
        "createNavigationPrefetchController",
        "navigationPrefetch.openInNewTab('manual.html')",
        "navigationPrefetch.openInNewTab('lessons.html')",
        "navigationPrefetch.scheduleSecondaryPagesPrefetch()",
    ];

    mainRequiredSnippets.forEach((snippet) => {
        assert.equal(
            mainJs.includes(snippet),
            true,
            `js/main.js should contain navigation controller usage: ${snippet}`
        );
    });

    const navigationRequiredSnippets = [
        'function openInNewTab(url) {',
        "window.open(url, '_blank', 'noopener,noreferrer');",
    ];

    navigationRequiredSnippets.forEach((snippet) => {
        assert.equal(
            navigationJs.includes(snippet),
            true,
            `js/modules/navigationPrefetch.js should contain canonical new-tab helper usage: ${snippet}`
        );
    });

    const forbiddenSnippets = [
        "window.open('manual.html', '_blank', 'noopener,noreferrer')",
        "window.open('lessons.html', '_blank', 'noopener,noreferrer')",
    ];

    forbiddenSnippets.forEach((snippet) => {
        assert.equal(
            mainJs.includes(snippet),
            false,
            `js/main.js should not keep duplicated direct new-tab call: ${snippet}`
        );
    });
});

runTest('ui message module keeps canonical global message system usage', () => {
    const uiMessagesJs = fs.readFileSync('js/modules/uiMessages.js', 'utf8');

    const requiredSnippets = [
        "document.getElementById('global-message-display')",
        "messageDiv.id = 'global-message-display'",
        'message-global message-${type}-global',
        "messageDiv.setAttribute('role', type === 'error' ? 'alert' : 'status')",
        "const closeBtn = messageDiv.querySelector('.message-close-btn-global')",
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            uiMessagesJs.includes(snippet),
            true,
            `js/modules/uiMessages.js should contain canonical message usage snippet: ${snippet}`
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
            uiMessagesJs.includes(snippet),
            false,
            `js/modules/uiMessages.js should not include legacy message snippet: ${snippet}`
        );
    });
});

runTest('ui modal module keeps canonical modal content mapping', () => {
    const uiModalsJs = fs.readFileSync('js/modules/uiModals.js', 'utf8');

    const requiredSnippets = [
        "const MODAL_CONTENT_BY_OVERLAY_ID = {",
        "'help-modal-overlay': 'help-modal-content'",
        "'clear-confirm-modal-overlay': 'clear-confirm-modal-content'",
        "'stop-confirm-modal-overlay': 'stop-confirm-modal-content'",
        "'download-modal-overlay': 'download-modal-content'",
        'const modalContentId = MODAL_CONTENT_BY_OVERLAY_ID[modalId] || `${modalId}-content`;',
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            uiModalsJs.includes(snippet),
            true,
            `js/modules/uiModals.js should contain canonical modal mapping snippet: ${snippet}`
        );
    });
});

runTest('ui facade re-exports canonical message and modal helpers', () => {
    const uiJs = fs.readFileSync('js/modules/ui.js', 'utf8');

    const requiredSnippets = [
        "from './uiMessages.js'",
        "from './uiModals.js'",
        'showError',
        'showHelpModal',
        'hideDownloadModal',
    ];

    requiredSnippets.forEach((snippet) => {
        assert.equal(
            uiJs.includes(snippet),
            true,
            `js/modules/ui.js should re-export canonical helper via facade: ${snippet}`
        );
    });
});

runTest('javascript _blank window.open calls include noopener,noreferrer', () => {
    const jsFiles = ['js/main.js', 'js/modules/navigationPrefetch.js'];

    jsFiles.forEach((path) => {
        const source = fs.readFileSync(path, 'utf8');
        const openCalls = source.match(/window\.open\(([^;]+)\);/g) || [];

        openCalls.forEach((call) => {
            if (!call.includes("'_blank'")) return;
            assert.equal(
                call.includes("'noopener,noreferrer'"),
                true,
                `${path} has _blank window.open without noopener,noreferrer: ${call}`
            );
        });
    });
});

console.log('Encoding tests completed.');
