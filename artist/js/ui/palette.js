/**
 * Палітра блоків, згрупована за категоріями із заголовками. Показує лише блоки
 * поточного рівня. Клік додає блок; перетягування обробляє ui/dragdrop.js.
 */
import { BLOCK_CATEGORIES, blockDefinitions } from '../data/blocks.js';
import { createBlock } from '../core/workspace.js';
import { buildStaticBlock, syncShapes } from './blockView.js';

/** «Привид» блока палітри (статична копія зі значеннями за замовчуванням). */
export function createPaletteGhostBlock(type) {
  return buildStaticBlock(createBlock(type, 0), 'div');
}

export function renderPalette(dom, lesson, { onAddBlock, shouldSuppressClick }) {
  dom.paletteList.replaceChildren();

  BLOCK_CATEGORIES.forEach((category, categoryIndex) => {
    const types = lesson.toolbox.filter((type) => blockDefinitions[type]?.category === category.id);
    if (types.length === 0) return;

    const group = document.createElement('div');
    group.className = `pal-group cat-${category.id}`;
    group.setAttribute('role', 'group');
    const headingId = `pal-heading-${categoryIndex}`;
    group.setAttribute('aria-labelledby', headingId);

    const heading = document.createElement('h3');
    heading.className = 'pal-heading';
    heading.id = headingId;
    const dot = document.createElement('span');
    dot.className = 'pal-heading-dot';
    dot.setAttribute('aria-hidden', 'true');
    heading.append(dot, document.createTextNode(category.title));
    group.appendChild(heading);

    for (const type of types) {
      const button = buildStaticBlock(createBlock(type, 0), 'button');
      button.addEventListener('click', () => {
        if (shouldSuppressClick()) return;
        onAddBlock(type);
      });
      group.appendChild(button);
    }
    dom.paletteList.appendChild(group);
  });

  syncShapes(dom.paletteList);
}
