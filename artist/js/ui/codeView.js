/**
 * Вкладка «Код»: моноширинний текст із підсвіткою синтаксису. Лише createElement /
 * textContent — без innerHTML. Рядки підготовки приглушені.
 */
import { tokenizeLine } from '../core/codeHighlight.js';

function buildLine(text, index, isSetup) {
  const line = document.createElement('div');
  line.className = isSetup ? 'code-line is-setup' : 'code-line';
  line.dataset.line = String(index);

  const number = document.createElement('span');
  number.className = 'code-ln';
  number.setAttribute('aria-hidden', 'true');
  number.textContent = String(index + 1);

  const content = document.createElement('span');
  content.className = 'code-src';
  for (const token of tokenizeLine(text)) {
    if (token.type === 'plain') {
      content.appendChild(document.createTextNode(token.text));
    } else {
      const span = document.createElement('span');
      span.className = `tok-${token.type}`;
      span.textContent = token.text;
      content.appendChild(span);
    }
  }
  if (text === '') content.appendChild(document.createTextNode('​'));

  line.append(number, content);
  return line;
}

export function renderCodeView(dom, { setup, body }) {
  const fragment = document.createDocumentFragment();
  setup.forEach((text, index) => fragment.appendChild(buildLine(text, index, true)));
  body.forEach((text, index) => fragment.appendChild(buildLine(text, setup.length + index, false)));
  dom.codeText.replaceChildren(fragment);
}

/** Підсвічує поточний рядок (index або null) і за потреби прокручує до нього. */
export function highlightCodeLine(dom, index) {
  dom.codeText.querySelector('.is-active')?.classList.remove('is-active');
  if (index === null || index === undefined) return;
  const line = dom.codeText.querySelector(`[data-line="${index}"]`);
  if (!line) return;
  line.classList.add('is-active');
  if (dom.codeView && !dom.codeView.hidden) line.scrollIntoView({ block: 'nearest' });
}

export function setEditorView(dom, view) {
  const isCode = view === 'code';
  dom.editorPanels.classList.toggle('show-code', isCode);
  dom.codeView.hidden = !isCode;
  dom.tabBlocks.setAttribute('aria-selected', String(!isCode));
  dom.tabCode.setAttribute('aria-selected', String(isCode));
  dom.tabBlocks.tabIndex = isCode ? -1 : 0;
  dom.tabCode.tabIndex = isCode ? 0 : -1;
}
