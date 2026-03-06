import assert from 'node:assert/strict';
import {
    findManualSectionIndexById,
    getInitialManualSectionIndex,
    getManualSectionIds,
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
