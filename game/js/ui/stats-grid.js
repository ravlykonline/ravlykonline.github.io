import { t } from '../i18n/index.js';

/**
 * Картка одного показника (яблука / груші / зірочки).
 * @param {string} icon
 * @param {number} value
 * @param {string} label
 * @returns {HTMLElement}
 */
function createStatCard(icon, value, label) {
    const card = document.createElement('div');
    card.className = 'win-stat-card';

    const iconEl = document.createElement('span');
    iconEl.className = 'win-stat-card__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;

    const valueEl = document.createElement('strong');
    valueEl.className = 'win-stat-card__value';
    valueEl.textContent = `${value ?? 0}`;

    const labelEl = document.createElement('span');
    labelEl.className = 'win-stat-card__label';
    labelEl.textContent = label;

    card.append(iconEl, valueEl, labelEl);
    return card;
}

/**
 * Сітка підсумків для екранів «рівень пройдено» і «гру завершено».
 * Груші показуються лише тоді, коли на рівні (чи в грі) вони взагалі були.
 *
 * @param {{apples?: number, pears?: number, stars?: number}} stats
 * @returns {HTMLElement}
 */
export function createStatsGrid(stats = {}) {
    const grid = document.createElement('div');
    grid.className = 'win-stats-grid';

    const cards = [createStatCard('🍎', stats.apples, t('win.applesLabel'))];

    if ((stats.pears ?? 0) > 0) {
        cards.push(createStatCard('🍐', stats.pears, t('win.pearsLabel')));
        grid.classList.add('win-stats-grid--three');
    }

    cards.push(createStatCard('⭐', stats.stars, t('win.starsLabel')));
    grid.append(...cards);

    return grid;
}
