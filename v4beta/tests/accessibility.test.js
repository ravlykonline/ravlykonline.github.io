import assert from 'node:assert/strict';
import {
    ACCESSIBILITY_OPTIONS,
    getDefaultAccessibilitySettings,
    applyAccessibilitySettings,
} from '../js/modules/accessibilitySettings.js';
import { getAccessibilityNotificationIconClass } from '../js/modules/accessibilityNotifications.js';
import { runTest } from './testUtils.js';

runTest('accessibility settings defaults honor prefers-reduced-motion', () => {
    const defaults = getDefaultAccessibilitySettings({
        matchMediaFn: () => ({ matches: true }),
    });

    assert.equal(defaults['reduce-animations'], true);
    assert.equal(defaults['high-contrast'], ACCESSIBILITY_OPTIONS['high-contrast'].defaultValue);
});

runTest('applyAccessibilitySettings toggles classes and interpreter animation preference', () => {
    const classNames = new Set();
    let animationEnabled = null;
    const htmlElement = {
        classList: {
            add(className) {
                classNames.add(className);
            },
            remove(className) {
                classNames.delete(className);
            },
        },
    };
    const interpreter = {
        setAnimationEnabled(value) {
            animationEnabled = value;
        },
    };

    applyAccessibilitySettings({
        'high-contrast': true,
        'larger-text': false,
        'reduce-animations': true,
        'sans-serif-font': false,
        'increased-spacing': true,
    }, {
        htmlElement,
        interpreter,
    });

    assert.equal(classNames.has('a11y-high-contrast'), true);
    assert.equal(classNames.has('a11y-larger-text'), false);
    assert.equal(classNames.has('a11y-reduce-animations'), true);
    assert.equal(classNames.has('a11y-increased-spacing'), true);
    assert.equal(animationEnabled, false);
});

runTest('accessibility notifications choose icon class by message meaning', () => {
    assert.equal(getAccessibilityNotificationIconClass('Високий контраст увімкнено'), 'universal-access');
    assert.equal(getAccessibilityNotificationIconClass('Збільшений текст увімкнено'), 'universal-access');
    assert.equal(getAccessibilityNotificationIconClass('Налаштування доступності скинуто'), 'check-circle');
    assert.equal(getAccessibilityNotificationIconClass('Інший статус'), 'universal-access');
});

console.log('Accessibility tests completed.');
