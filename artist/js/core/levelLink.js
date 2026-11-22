/**
 * Посилання на рівень: параметр ?level=N (нумерація з 1). Чисті функції, без DOM.
 */

/** Індекс рівня (з 0) з рядка пошуку; будь-що некоректне — перший рівень. */
export function parseLevelParam(search, total) {
  const raw = new URLSearchParams(search ?? '').get('level');
  if (raw === null || !/^\d+$/.test(raw.trim())) return 0;
  const number = Number.parseInt(raw, 10);
  return number >= 1 && number <= total ? number - 1 : 0;
}

/** Рядок пошуку з оновленим `level`; інші параметри (наприклад, blocks=pastel) зберігаються. */
export function buildLevelSearch(search, index) {
  const params = new URLSearchParams(search ?? '');
  params.set('level', String(index + 1));
  return `?${params.toString()}`;
}
