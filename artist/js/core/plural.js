/**
 * Українська множина за числом. Чиста функція, без DOM.
 * 1, 21, 31… → one (крім 11); 2–4, 22–24… → few (крім 12–14); решта → many.
 */
export function pluralUk(n, [one, few, many]) {
  const value = Math.abs(Math.trunc(Number(n)));
  const lastTwo = value % 100;
  const last = value % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
}
