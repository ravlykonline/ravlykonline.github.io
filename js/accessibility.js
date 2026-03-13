import {
    ACCESSIBILITY_OPTIONS,
    getDefaultAccessibilitySettings,
    loadAccessibilitySettings,
    saveAccessibilitySettings,
    applyAccessibilitySettings,
    updateAccessibilityCheckboxes,
} from './modules/accessibilitySettings.js';
import { showAccessibilityNotification } from './modules/accessibilityNotifications.js';

let accessibilityInitialized = false;
let lastFocusedBeforePanel = null;

function getWindowRef() {
    return typeof window !== 'undefined' ? window : null;
}

function getDocumentRef() {
    return typeof document !== 'undefined' ? document : null;
}

function loadSettings() {
    const windowRef = getWindowRef();
    return loadAccessibilitySettings({
        storage: windowRef?.localStorage,
        getDefaults: () => getDefaultAccessibilitySettings({
            matchMediaFn: windowRef?.matchMedia ? windowRef.matchMedia.bind(windowRef) : null,
            onError: (error) => console.error('Error checking prefers-reduced-motion:', error),
        }),
        onError: (error) => console.error('Error loading accessibility settings:', error),
    });
}

function saveSettings(settings) {
    const windowRef = getWindowRef();
    saveAccessibilitySettings(settings, {
        storage: windowRef?.localStorage,
        onError: (error) => console.error('Error saving accessibility settings:', error),
    });
}

function applySettings(settings) {
    const documentRef = getDocumentRef();
    const windowRef = getWindowRef();
    applyAccessibilitySettings(settings, {
        htmlElement: documentRef?.documentElement || null,
        accessibilityOptions: ACCESSIBILITY_OPTIONS,
        interpreter: windowRef?.ravlykInterpreterInstance || null,
    });
}

function syncAccessibilityCheckboxes(settings) {
    const documentRef = getDocumentRef();
    updateAccessibilityCheckboxes(settings, {
        queryCheckbox: (key) => documentRef?.querySelector?.(`input[data-setting="${key}"]`) || null,
    });
}

function updateAccessibilitySetting(settingKey, value) {
    const settings = loadSettings();
    settings[settingKey] = value;
    saveSettings(settings);
    applySettings(settings);

    const optionLabel = ACCESSIBILITY_OPTIONS[settingKey]?.label || settingKey;
    showAccessibilityNotification(`${optionLabel} ${value ? '\u0443\u0432\u0456\u043c\u043a\u043d\u0435\u043d\u043e' : '\u0432\u0438\u043c\u043a\u043d\u0435\u043d\u043e'}`);
}

function resetAccessibilitySettings() {
    const defaults = getDefaultAccessibilitySettings({
        matchMediaFn: null,
    });
    saveSettings(defaults);
    applySettings(defaults);
    syncAccessibilityCheckboxes(defaults);
    showAccessibilityNotification('\u041d\u0430\u043b\u0430\u0448\u0442\u0443\u0432\u0430\u043d\u043d\u044f \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e\u0441\u0442\u0456 \u0441\u043a\u0438\u043d\u0443\u0442\u043e \u0434\u043e \u0441\u0442\u0430\u043d\u0434\u0430\u0440\u0442\u043d\u0438\u0445.');
}

function initAccessibilityControls() {
    if (accessibilityInitialized) return;

    const documentRef = getDocumentRef();
    if (!documentRef) return;

    const toggleButton = documentRef.getElementById('accessibility-toggle');
    const panel = documentRef.getElementById('accessibility-panel');
    const closeButton = documentRef.getElementById('close-accessibility-panel-btn');
    const resetButton = documentRef.getElementById('reset-accessibility-btn');

    if (!toggleButton || !panel) {
        console.warn('Accessibility toggle or panel not found. Controls will not be initialized.');
        return;
    }

    if (!panel.hasAttribute('tabindex')) {
        panel.setAttribute('tabindex', '-1');
    }

    accessibilityInitialized = true;

    const savedSettings = loadSettings();
    applySettings(savedSettings);
    syncAccessibilityCheckboxes(savedSettings);

    const getFocusableInPanel = () =>
        Array.from(
            panel.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        ).filter((element) => element.offsetParent !== null);

    const closePanel = () => {
        panel.classList.add('hidden');
        toggleButton.setAttribute('aria-expanded', 'false');
        if (lastFocusedBeforePanel && typeof lastFocusedBeforePanel.focus === 'function') {
            lastFocusedBeforePanel.focus();
        } else {
            toggleButton.focus();
        }
    };

    const openPanel = () => {
        lastFocusedBeforePanel = documentRef.activeElement;
        panel.classList.remove('hidden');
        toggleButton.setAttribute('aria-expanded', 'true');
        const focusable = getFocusableInPanel();
        (focusable[0] || panel).focus();
    };

    toggleButton.addEventListener('click', () => {
        if (panel.classList.contains('hidden')) openPanel();
        else closePanel();
    });

    if (closeButton) {
        closeButton.addEventListener('click', closePanel);
    }

    if (resetButton) {
        resetButton.addEventListener('click', () => {
            resetAccessibilitySettings();
            panel.querySelector('input[data-setting], button')?.focus();
        });
    }

    documentRef.querySelectorAll('.accessibility-setting-input').forEach((input) => {
        input.addEventListener('change', function onAccessibilityChange() {
            updateAccessibilitySetting(this.dataset.setting, this.checked);
        });
    });

    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Tab' && !panel.classList.contains('hidden')) {
            const focusable = getFocusableInPanel();
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && documentRef.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && documentRef.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
            closePanel();
        }
    });

    documentRef.addEventListener('click', (event) => {
        if (!panel.classList.contains('hidden') && !panel.contains(event.target) && !toggleButton.contains(event.target)) {
            closePanel();
        }
    });
}

const windowRef = getWindowRef();
if (windowRef) {
    windowRef.ravlykAccessibility = {
        init: initAccessibilityControls,
        load: loadSettings,
        apply: applySettings,
    };
}

const documentRef = getDocumentRef();
if (documentRef) {
    if (documentRef.readyState === 'loading') {
        documentRef.addEventListener('DOMContentLoaded', initAccessibilityControls, { once: true });
    } else {
        initAccessibilityControls();
    }
}
