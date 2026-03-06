export const ACCESSIBILITY_STORAGE_KEY = 'ravlyk_accessibility_settings_v2';

export const ACCESSIBILITY_OPTIONS = {
    'high-contrast': { className: 'a11y-high-contrast', defaultValue: false, label: '\u0412\u0438\u0441\u043e\u043a\u0438\u0439 \u043a\u043e\u043d\u0442\u0440\u0430\u0441\u0442' },
    'larger-text': { className: 'a11y-larger-text', defaultValue: false, label: '\u0417\u0431\u0456\u043b\u044c\u0448\u0435\u043d\u0438\u0439 \u0442\u0435\u043a\u0441\u0442' },
    'reduce-animations': { className: 'a11y-reduce-animations', defaultValue: false, label: '\u0417\u043c\u0435\u043d\u0448\u0435\u043d\u043d\u044f \u0430\u043d\u0456\u043c\u0430\u0446\u0456\u0457' },
    'sans-serif-font': { className: 'a11y-sans-serif-font', defaultValue: false, label: '\u041f\u0440\u043e\u0441\u0442\u0438\u0439 \u0448\u0440\u0438\u0444\u0442' },
    'increased-spacing': { className: 'a11y-increased-spacing', defaultValue: false, label: '\u0417\u0431\u0456\u043b\u044c\u0448\u0435\u043d\u0456 \u0456\u043d\u0442\u0435\u0440\u0432\u0430\u043b\u0438' },
};

export function getDefaultAccessibilitySettings(options = {}) {
    const {
        accessibilityOptions = ACCESSIBILITY_OPTIONS,
        matchMediaFn = null,
        onError = null,
    } = options;

    const defaults = {};
    Object.keys(accessibilityOptions).forEach((key) => {
        defaults[key] = accessibilityOptions[key].defaultValue;
    });

    try {
        if (typeof matchMediaFn === 'function' && matchMediaFn('(prefers-reduced-motion: reduce)').matches) {
            defaults['reduce-animations'] = true;
        }
    } catch (error) {
        if (typeof onError === 'function') onError(error);
    }

    return defaults;
}

export function loadAccessibilitySettings(options = {}) {
    const {
        storage = null,
        storageKey = ACCESSIBILITY_STORAGE_KEY,
        getDefaults = () => getDefaultAccessibilitySettings(),
        onError = null,
    } = options;

    try {
        const stored = storage?.getItem?.(storageKey);
        if (stored) return JSON.parse(stored);
    } catch (error) {
        if (typeof onError === 'function') onError(error);
    }

    return getDefaults();
}

export function saveAccessibilitySettings(settings, options = {}) {
    const {
        storage = null,
        storageKey = ACCESSIBILITY_STORAGE_KEY,
        onError = null,
    } = options;

    try {
        storage?.setItem?.(storageKey, JSON.stringify(settings));
    } catch (error) {
        if (typeof onError === 'function') onError(error);
    }
}

export function applyAccessibilitySettings(settings, options = {}) {
    const {
        htmlElement = null,
        accessibilityOptions = ACCESSIBILITY_OPTIONS,
        interpreter = null,
    } = options;

    if (htmlElement?.classList) {
        Object.keys(accessibilityOptions).forEach((key) => {
            if (settings[key]) htmlElement.classList.add(accessibilityOptions[key].className);
            else htmlElement.classList.remove(accessibilityOptions[key].className);
        });
    }

    if (interpreter && typeof interpreter.setAnimationEnabled === 'function') {
        interpreter.setAnimationEnabled(!settings['reduce-animations']);
    }
}

export function updateAccessibilityCheckboxes(settings, options = {}) {
    const { queryCheckbox = null } = options;
    if (typeof queryCheckbox !== 'function') return;

    Object.keys(settings).forEach((key) => {
        const checkbox = queryCheckbox(key);
        if (checkbox) checkbox.checked = settings[key];
    });
}
