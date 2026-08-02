import assert from 'node:assert/strict';
import { setupPrintPageButtons } from '../js/printPage.js';
import { buildZenRulePayload, setupZenCopyButtons } from '../js/zenPage.js';
import { runAsyncTest, runTest } from './testUtils.js';

function createClassList(initialClasses = []) {
    const classes = new Set(initialClasses);
    return {
        contains(className) {
            return classes.has(className);
        },
        toggle(className, enabled) {
            if (enabled) classes.add(className);
            else classes.delete(className);
        },
    };
}

function createEventTarget(properties = {}) {
    const listeners = new Map();
    return {
        ...properties,
        addEventListener(type, listener) {
            listeners.set(type, listener);
        },
        async dispatch(type) {
            return listeners.get(type)?.();
        },
    };
}

runTest('print page action wires all declarative print buttons', () => {
    const buttons = [createEventTarget(), createEventTarget()];
    let printCalls = 0;
    const count = setupPrintPageButtons({
        documentRef: { querySelectorAll: () => buttons },
        printPage: () => { printCalls += 1; },
    });

    assert.equal(count, 2);
    buttons[0].dispatch('click');
    buttons[1].dispatch('click');
    assert.equal(printCalls, 2);
});

runTest('zen rule payload keeps the visible rule content and attribution', () => {
    const principle = {
        dataset: { ruleNumber: '7' },
        querySelector(selector) {
            if (selector === '.zen-principle-text') return { textContent: '  Роби один крок.  ' };
            if (selector === '.zen-principle-comment') return { textContent: '  Потім перевір.  ' };
            return null;
        },
    };

    assert.equal(
        buildZenRulePayload(principle),
        'Правило 7\nРоби один крок.\nПотім перевір.\nДзен Равлика 🐌'
    );
});

await runAsyncTest('zen copy action reports success and resets its visual state', async () => {
    const icon = { className: 'ui-icon icon-copy' };
    const classList = createClassList();
    const principle = {
        dataset: { ruleNumber: '1' },
        querySelector(selector) {
            if (selector === '.zen-principle-text') return { textContent: 'Назва' };
            if (selector === '.zen-principle-comment') return { textContent: 'Коментар' };
            return null;
        },
    };
    const button = createEventTarget({
        classList,
        closest: () => principle,
        querySelector: () => icon,
    });
    const copied = [];
    let resetCallback;

    setupZenCopyButtons({
        documentRef: { querySelectorAll: () => [button] },
        copyText: async (payload) => { copied.push(payload); },
        scheduleReset: (callback) => { resetCallback = callback; },
    });

    await button.dispatch('click');
    assert.deepEqual(copied, ['Правило 1\nНазва\nКоментар\nДзен Равлика 🐌']);
    assert.equal(icon.className, 'ui-icon icon-check');
    assert.equal(classList.contains('copied'), true);

    resetCallback();
    assert.equal(icon.className, 'ui-icon icon-copy');
    assert.equal(classList.contains('copied'), false);
});

await runAsyncTest('zen copy action reports failure without leaving a stale success state', async () => {
    const icon = { className: 'ui-icon icon-copy' };
    const classList = createClassList(['copied']);
    const principle = {
        dataset: { ruleNumber: '2' },
        querySelector: () => ({ textContent: 'Текст' }),
    };
    const button = createEventTarget({
        classList,
        closest: () => principle,
        querySelector: () => icon,
    });
    let resetCallback;

    setupZenCopyButtons({
        documentRef: { querySelectorAll: () => [button] },
        copyText: async () => { throw new Error('clipboard unavailable'); },
        scheduleReset: (callback) => { resetCallback = callback; },
    });

    await button.dispatch('click');
    assert.equal(icon.className, 'ui-icon icon-times');
    assert.equal(classList.contains('copied'), false);

    resetCallback();
    assert.equal(icon.className, 'ui-icon icon-copy');
});
