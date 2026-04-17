import { uk } from './uk.js';

const dictionary = uk;

function resolveKey(key) {
    return key.split('.').reduce((value, part) => value?.[part], dictionary);
}

export function t(key, params = {}) {
    const template = resolveKey(key);

    if (typeof template !== 'string') {
        return key;
    }

    return template.replace(/\{(\w+)\}/g, (_, param) => `${params[param] ?? ''}`);
}

export function applyDocumentTranslations(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((element) => {
        element.textContent = t(element.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
        element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
    });

    root.querySelectorAll('[data-i18n-title]').forEach((element) => {
        element.textContent = t(element.dataset.i18nTitle);
    });

    const themeColor = root.querySelector('meta[name="theme-color"]');
    if (themeColor) {
        themeColor.setAttribute('content', t('meta.themeColor'));
    }
}
