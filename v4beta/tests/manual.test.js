import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
    findManualSectionIndexById,
    getInitialManualSectionIndex,
    getManualSectionIds,
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

runTest('manual controller updates paging state and indicators', () => {
    const sections = [0, 1, 2].map(() => ({
        attrs: {},
        classList: {
            classes: new Set(),
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
