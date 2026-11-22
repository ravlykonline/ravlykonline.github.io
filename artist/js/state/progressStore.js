/**
 * Прогрес дитини (пройдені рівні й найкращі зірки) у sessionStorage вкладки.
 * Зникає після закриття вкладки. Код дитини НЕ зберігається ніколи.
 * Модуль не торкається DOM; сховище передається ззовні (або береться глобальне, якщо воно доступне).
 */
const STORAGE_KEY = 'ravlyk-artist-progress-v1';

/** sessionStorage може бути недоступним (приватний режим, sandbox) — тоді null. */
export function getSessionStorage() {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} lessonIds id рівнів у поточному порядку (прогрес зберігається за id, не за номером)
 * @returns {{ done: Set<number>, stars: Map<number, number> }} індекси рівнів
 */
export function loadProgress(lessonIds, storage = getSessionStorage()) {
  const done = new Set();
  const stars = new Map();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { done, stars };
    const data = JSON.parse(raw);
    for (const id of Array.isArray(data?.done) ? data.done : []) {
      const index = lessonIds.indexOf(id);
      if (index !== -1) done.add(index);
    }
    for (const [id, value] of Object.entries(data?.stars && typeof data.stars === 'object' ? data.stars : {})) {
      const index = lessonIds.indexOf(id);
      if (index !== -1 && Number.isInteger(value) && value >= 1 && value <= 3) stars.set(index, value);
    }
  } catch {
    return { done: new Set(), stars: new Map() };
  }
  return { done, stars };
}

export function saveProgress({ done, stars }, lessonIds, storage = getSessionStorage()) {
  if (!storage) return false;
  try {
    const data = {
      done: [...done].map((index) => lessonIds[index]).filter(Boolean),
      stars: Object.fromEntries([...stars].filter(([index]) => lessonIds[index]).map(([index, value]) => [lessonIds[index], value])),
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
