/** Показує виконуваний блок або рядок, не прокручуючи сторінку зі сценою. */
export function revealInside(container, item) {
  if (!container.clientHeight) return;
  const view = container.getBoundingClientRect();
  const rect = item.getBoundingClientRect();
  const top = view.top + container.clientTop;
  const left = view.left + container.clientLeft;
  if (rect.top < top) container.scrollTop += rect.top - top;
  else if (rect.bottom > top + container.clientHeight) container.scrollTop += rect.bottom - top - container.clientHeight;
  if (rect.left < left) container.scrollLeft += rect.left - left;
  else if (rect.right > left + container.clientWidth) container.scrollLeft += rect.right - left - container.clientWidth;
}
