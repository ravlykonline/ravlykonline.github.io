import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    buildManualEditorLink,
    findManualSectionIndexById,
    getAvailableManualSectionIndexes,
    getManualExampleCodeText,
    getInitialManualSectionIndex,
    getManualSectionIds,
    matchesManualSectionFilters,
    normalizeManualSearchQuery,
    resolveManualSectionId,
    updateManualPagingState,
} from '../js/modules/manualPageController.js';
import { runTest } from './testUtils.js';

runTest('manual controller derives section ids and resolves hash index', () => {
    const sectionIds = getManualSectionIds([{ id: 'intro' }, { id: 'syntax' }, { id: 'games' }]);
    assert.deepEqual(sectionIds, ['intro', 'syntax', 'games']);
    assert.equal(findManualSectionIndexById(sectionIds, 'syntax'), 1);
    assert.equal(getInitialManualSectionIndex(sectionIds, '#games'), 2);
    assert.equal(getInitialManualSectionIndex(sectionIds, '#missing'), 0);
});

runTest('manual controller resolves lessons deep-link aliases to current sections', () => {
    const sectionIds = ['intro', 'basic-commands', 'variables-functions', 'pen-control', 'conditions', 'game-mode'];

    assert.equal(resolveManualSectionId(sectionIds, 'movement'), 'basic-commands');
    assert.equal(resolveManualSectionId(sectionIds, 'rotation'), 'basic-commands');
    assert.equal(resolveManualSectionId(sectionIds, 'variables'), 'variables-functions');
    assert.equal(resolveManualSectionId(sectionIds, 'functions'), 'variables-functions');
    assert.equal(resolveManualSectionId(sectionIds, 'pen'), 'pen-control');
    assert.equal(getInitialManualSectionIndex(sectionIds, '#movement'), 1);
    assert.equal(getInitialManualSectionIndex(sectionIds, '#functions'), 2);
    assert.equal(getInitialManualSectionIndex(sectionIds, '#pen'), 3);
});

runTest('manual controller normalizes queries and applies beginner/search filters', () => {
    assert.equal(normalizeManualSearchQuery('  КоЛІР  '), 'колір');

    const makeSection = ({ keywords = '', text = '', advanced = false }) => ({
        dataset: { keywords },
        textContent: text,
        classList: {
            contains(className) {
                return advanced && className === 'advanced-only';
            },
        },
        querySelector() {
            return null;
        },
    });

    const beginnerSection = makeSection({
        keywords: 'кольори колір веселка',
        text: 'Можна змінювати колір і фон.',
    });
    const advancedSection = makeSection({
        keywords: 'змінні функції',
        text: 'Створюй власні команди.',
        advanced: true,
    });

    assert.equal(matchesManualSectionFilters({ section: beginnerSection, query: 'колір', mode: 'beginner' }), true);
    assert.equal(matchesManualSectionFilters({ section: advancedSection, query: '', mode: 'beginner' }), false);
    assert.equal(matchesManualSectionFilters({ section: advancedSection, query: 'функції', mode: 'full' }), true);

    const availableIndexes = getAvailableManualSectionIndexes({
        sections: [beginnerSection, advancedSection],
        query: 'колір',
        mode: 'full',
    });
    assert.deepEqual(availableIndexes, [0]);
});

runTest('manual code example helpers normalize code and build editor links', () => {
    const code = getManualExampleCodeText('вперед 50\r\nправоруч 90\r\n\r\n');
    assert.equal(code, 'вперед 50\nправоруч 90');

    const editorLink = buildManualEditorLink(
        code,
        'index.html',
        'https://ravlyk.org/v4beta/manual_v2.html'
    );

    assert.match(editorLink, /^https:\/\/ravlyk\.org\/v4beta\/index\.html#code=/);
});

runTest('manual documents all public runtime error messages except developer-only legacy path', () => {
    const constantsSource = fs.readFileSync('js/modules/constants.js', 'utf8');
    const manualHtml = fs.readFileSync('manual.html', 'utf8');

    const constantKeys = [...constantsSource.matchAll(/^\s{4}([A-Z_]+):/gm)].map((match) => match[1]);
    const manualKeys = new Set(
        [...manualHtml.matchAll(/<!--\s*([A-Z_]+(?:\s*\/\s*[A-Z_]+)*)\s*-->/g)]
            .flatMap((match) => match[1].split('/'))
            .map((item) => item.trim())
    );

    const excludedKeys = new Set([
        'LEGACY_PARSE_PATH_REMOVED',
        'IMAGE_SAVED',
        'CODE_EXECUTED',
        'EXECUTION_STOPPED',
    ]);

    const missingKeys = constantKeys.filter((key) => !excludedKeys.has(key) && !manualKeys.has(key));
    assert.deepEqual(missingKeys, []);
});

runTest('manual_v2 keeps reading mode controls, toc search, and searchable section metadata', () => {
    const manualV2Html = fs.readFileSync('manual_v2.html', 'utf8');

    assert.match(manualV2Html, /class="manual-mode-strip"/);
    assert.match(manualV2Html, /id="manual-search-input"/);
    assert.match(manualV2Html, /class="manual-toc-search"/);
    assert.match(manualV2Html, /placeholder="вперед, якщо, колір"/);
    assert.match(manualV2Html, /id="manual-usage-title">Як користуватися посібником</);
    assert.match(manualV2Html, /data-manual-mode="beginner"/);
    assert.match(manualV2Html, /data-manual-mode="full"/);

    const sectionKeywordMatches = [...manualV2Html.matchAll(/<article[^>]+data-keywords="[^"]+"/g)];
    assert.ok(sectionKeywordMatches.length >= 10);
});

runTest('manual_v2 keeps top area compact without duplicated top navigation', () => {
    const manualV2Html = fs.readFileSync('manual_v2.html', 'utf8');

    assert.doesNotMatch(manualV2Html, /id="manual-back-to-editor"/);
    assert.doesNotMatch(manualV2Html, /id="manual-to-lessons"/);
    assert.doesNotMatch(manualV2Html, /Твоя перша текстова мова програмування!/);
    assert.match(manualV2Html, /id="manual-back-to-editor-footer"/);
    assert.match(manualV2Html, /id="manual-to-lessons-footer"/);
});

runTest('manual_v2 keeps advanced-only sections for full mode', () => {
    const manualV2Html = fs.readFileSync('manual_v2.html', 'utf8');

    assert.match(manualV2Html, /<article id="variables-functions" class="guide-section advanced-only"/);
    assert.match(manualV2Html, /<article id="conditions" class="guide-section advanced-only"/);
    assert.match(manualV2Html, /<article id="game-mode" class="guide-section advanced-only"/);
    assert.match(manualV2Html, /<article id="challenges" class="guide-section advanced-only"/);
    assert.match(manualV2Html, /<article id="projects" class="guide-section advanced-only"/);
});

runTest('manual_v2 separates basic and advanced commands in the basic-commands section', () => {
    const manualV2Html = fs.readFileSync('manual_v2.html', 'utf8');

    assert.match(manualV2Html, /Базові команди для старту/);
    assert.match(manualV2Html, /повторити N \(\s*\.\.\.\s*\)/);
    assert.match(manualV2Html, /<section class="manual-subsection advanced-only" aria-labelledby="manual-basic-advanced-title">/);
    assert.match(manualV2Html, /Просунуті команди/);
});

runTest('manual_v2 uses a neutral loading placeholder for pagination indicators', () => {
    const manualV2Html = fs.readFileSync('manual_v2.html', 'utf8');

    assert.match(manualV2Html, /id="manual-section-indicator">Завантаження розділів\.\.\.</);
    assert.match(manualV2Html, /id="manual-section-indicator-bottom">Завантаження розділів\.\.\.</);
    assert.doesNotMatch(manualV2Html, /id="manual-section-indicator">Розділ 1 з 1</);
});

runTest('manual controller updates paging state and indicators', () => {
    const sections = [0, 1, 2].map(() => ({
        attrs: {},
        hidden: false,
        classList: {
            classes: new Set(),
            contains(className) {
                return this.classes.has(className);
            },
            toggle(className, enabled) {
                if (enabled) this.classes.add(className);
                else this.classes.delete(className);
            },
        },
        setAttribute(name, value) {
            this.attrs[name] = value;
        },
    }));
    const links = ['#intro', '#syntax', '#games'].map((href) => ({
        href,
        attrs: {},
        hidden: false,
        classList: {
            classes: new Set(),
            toggle(className, enabled) {
                if (enabled) this.classes.add(className);
                else this.classes.delete(className);
            },
        },
        getAttribute(name) {
            return name === 'href' ? this.href : null;
        },
        setAttribute(name, value) {
            this.attrs[name] = value;
        },
        removeAttribute(name) {
            delete this.attrs[name];
        },
    }));
    const prevBtn = { disabled: false };
    const nextBtn = { disabled: false };
    const indicator = { textContent: '' };

    updateManualPagingState({
        activeIndex: 1,
        sectionIds: ['intro', 'syntax', 'games'],
        sections,
        links,
        prevBtn,
        nextBtn,
        indicator,
    });

    assert.equal(sections[1].classList.classes.has('is-active'), true);
    assert.equal(sections[1].attrs['aria-hidden'], 'false');
    assert.equal(links[1].attrs['aria-current'], 'page');
    assert.equal(indicator.textContent, 'Розділ 2 з 3');
    assert.equal(prevBtn.disabled, false);
    assert.equal(nextBtn.disabled, false);
});

console.log('Manual tests completed.');
