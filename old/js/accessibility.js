// js/accessibility.js
// import { DEFAULT_ANIMATION_FRAME_DURATION_MS } from './modules/constants.js'; // Not directly used, speed is now boolean

const ACCESSIBILITY_STORAGE_KEY = 'ravlyk_accessibility_settings_v2'; // v2 to avoid conflicts

const ACCESSIBILITY_OPTIONS = {
  'high-contrast': { className: 'a11y-high-contrast', defaultValue: false, label: 'Високий контраст' },
  'larger-text': { className: 'a11y-larger-text', defaultValue: false, label: 'Збільшений текст' },
  'reduce-animations': { className: 'a11y-reduce-animations', defaultValue: false, label: 'Зменшення анімації' },
  'sans-serif-font': { className: 'a11y-sans-serif-font', defaultValue: false, label: 'Простий шрифт' },
  'increased-spacing': { className: 'a11y-increased-spacing', defaultValue: false, label: 'Збільшені інтервали' }
};

function showAccessibilityNotification(message) {
    // Очищаємо будь-які існуючі повідомлення про доступність
    const existing = document.getElementById('global-message-display');
    if (existing) existing.remove();
    
    // Створюємо нове повідомлення з іконкою
    const messageDiv = document.createElement('div');
    messageDiv.id = 'global-message-display';
    messageDiv.className = 'message-global message-a11y-global'; // Спеціальний клас для повідомлень доступності
    messageDiv.setAttribute('role', 'status');
    
    // Вибираємо відповідну іконку на основі змісту повідомлення
    let iconClass = 'fa-universal-access'; // Стандартна іконка доступності
    
    if (message.includes('контраст')) {
        iconClass = 'fa-adjust'; // Контраст
    } else if (message.includes('текст')) {
        iconClass = 'fa-font'; // Розмір тексту
    } else if (message.includes('анімації')) {
        iconClass = 'fa-film'; // Анімації
    } else if (message.includes('шрифт')) {
        iconClass = 'fa-text-width'; // Шрифт
    } else if (message.includes('інтервали')) {
        iconClass = 'fa-expand'; // Інтервали
    } else if (message.includes('скинуто')) {
        iconClass = 'fa-undo'; // Скидання налаштувань
    }
    
    // Генеруємо HTML для повідомлення з іконкою
    messageDiv.innerHTML = `
        <span class="message-text-global"><i class="fas ${iconClass}"></i> ${message}</span>
        <button class="message-close-btn-global" aria-label="Закрити повідомлення"><i class="fas fa-times"></i></button>
    `;
    
    // Вставляємо повідомлення у body
    document.body.appendChild(messageDiv);
    
    // Автоматично закриваємо повідомлення через 2 секунди
    const closeTimeout = setTimeout(() => messageDiv.remove(), 2000);
    
    // Додаємо функціональність кнопки закриття
    const closeBtn = messageDiv.querySelector('.message-close-btn-global');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            clearTimeout(closeTimeout);
            messageDiv.remove();
        }, { once: true });
    }
}

function loadAccessibilitySettings() {
  try {
    const stored = localStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (error) {
    console.error('Error loading accessibility settings:', error);
  }
  const defaults = {};
  for (const key in ACCESSIBILITY_OPTIONS) {
    defaults[key] = ACCESSIBILITY_OPTIONS[key].defaultValue;
  }
  return defaults;
}

function saveAccessibilitySettings(settings) {
  try {
    localStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving accessibility settings:', error);
  }
}

function applyAccessibilitySettings(settings) {
  const htmlElement = document.documentElement;
  for (const key in ACCESSIBILITY_OPTIONS) {
    if (settings[key]) {
      htmlElement.classList.add(ACCESSIBILITY_OPTIONS[key].className);
    } else {
      htmlElement.classList.remove(ACCESSIBILITY_OPTIONS[key].className);
    }
  }

  // Inform the interpreter about animation preference
  if (window.ravlykInterpreterInstance && typeof window.ravlykInterpreterInstance.setAnimationEnabled === 'function') {
    window.ravlykInterpreterInstance.setAnimationEnabled(!settings['reduce-animations']);
  }
}

function updateAccessibilityCheckboxes(settings) {
  for (const key in settings) {
    const checkbox = document.querySelector(`input[data-setting="${key}"]`);
    if (checkbox) checkbox.checked = settings[key];
  }
}

function updateAccessibilitySetting(settingKey, value) {
  const settings = loadAccessibilitySettings();
  settings[settingKey] = value;
  saveAccessibilitySettings(settings);
  applyAccessibilitySettings(settings);

  const optionLabel = ACCESSIBILITY_OPTIONS[settingKey]?.label || settingKey;
  showAccessibilityNotification(`${optionLabel} ${value ? 'увімкнено' : 'вимкнено'}`);
}

function resetAccessibilitySettings() {
  const defaults = {};
  for (const key in ACCESSIBILITY_OPTIONS) {
    defaults[key] = ACCESSIBILITY_OPTIONS[key].defaultValue;
  }
  saveAccessibilitySettings(defaults);
  applyAccessibilitySettings(defaults);
  updateAccessibilityCheckboxes(defaults);
  showAccessibilityNotification('Налаштування доступності скинуто до стандартних.');
}

function initAccessibilityControls() {
  const toggleButton = document.getElementById('accessibility-toggle');
  const panel = document.getElementById('accessibility-panel');
  const closeButton = document.getElementById('close-accessibility-panel-btn'); // Updated ID
  const resetButton = document.getElementById('reset-accessibility-btn'); // Updated ID
  
  if (!toggleButton || !panel) {
      console.warn("Accessibility toggle or panel not found. Controls will not be initialized.");
      return;
  }

  const savedSettings = loadAccessibilitySettings();
  applyAccessibilitySettings(savedSettings);
  updateAccessibilityCheckboxes(savedSettings);

  toggleButton.addEventListener('click', () => {
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden', !isHidden);
    toggleButton.setAttribute('aria-expanded', isHidden.toString());
    if (isHidden) {
        panel.querySelector('input[data-setting], button')?.focus();
    }
  });

  if (closeButton) {
    closeButton.addEventListener('click', () => {
        panel.classList.add('hidden');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.focus();
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
        resetAccessibilitySettings();
        panel.querySelector('input[data-setting], button')?.focus();
    });
  }

  document.querySelectorAll('.accessibility-setting-input').forEach(input => { // Updated class
    input.addEventListener('change', function() {
      updateAccessibilitySetting(this.dataset.setting, this.checked);
    });
  });

  // Close panel on Escape key
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.classList.contains('hidden')) {
        panel.classList.add('hidden');
        toggleButton.setAttribute('aria-expanded', 'false');
        toggleButton.focus();
    }
  });
  
  // Close on outside click
  document.addEventListener('click', (event) => {
    if (!panel.classList.contains('hidden') && !panel.contains(event.target) && !toggleButton.contains(event.target)) {
        panel.classList.add('hidden');
        toggleButton.setAttribute('aria-expanded', 'false');
    }
  });
}
// Expose to global scope for main.js or other modules
window.ravlykAccessibility = {
  init: initAccessibilityControls,
  load: loadAccessibilitySettings,
  apply: applyAccessibilitySettings, // If needed externally
  // interpreterInstance is now set by main.js directly on window
};

document.addEventListener('DOMContentLoaded', initAccessibilityControls);