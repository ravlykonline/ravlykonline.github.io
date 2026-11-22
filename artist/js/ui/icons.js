// Поза праворуч від лінії. Під час гри групу можна віддзеркалити відносно маршруту.
// Олівець торкається поля в (0, 0), а очі спрямовані вгору (heading 0).
const SNAIL_PARTS = `
  <g data-pencil="pencil">
    <path d="M5 -4 L21 -9 L23 -4 L6 1 Z" fill="#FFD34D" stroke="#4A2500" stroke-width="1" stroke-linejoin="round"/>
    <path data-pen-tip="tip" d="M5 -4 L6 1 L0 0 Z" fill="#FF8C1A" stroke="#4A2500" stroke-width="1" stroke-linejoin="round"/>
  </g>
  <g data-snail-wiggle="true">
    <path d="M20 15 Q13 10 16 2 L19 -6 Q20 -13 27 -12 Q34 -11 35 -3 Q39 11 31 17 Q25 20 20 15 Z" fill="#7DC953" stroke="#4F8D35" stroke-width="1.2"/>
    <path d="M22 -8 L18 -14 M30 -8 L32 -15" fill="none" stroke="#4F8D35" stroke-width="2" stroke-linecap="round"/>
    <circle cx="18" cy="-15" r="3.2" fill="#8FD860"/>
    <circle cx="32" cy="-16" r="3.2" fill="#8FD860"/>
    <circle cx="18" cy="-16" r="1.5" fill="#1A1A2E"/>
    <circle cx="32" cy="-17" r="1.5" fill="#1A1A2E"/>
    <path d="M22 -7 Q25 -4 28 -7" fill="none" stroke="#365E28" stroke-linecap="round"/>
    <circle cx="28" cy="7" r="10.5" fill="#E8A050" stroke="#A85418" stroke-width="1.5"/>
    <path d="M24 10 A5 5 0 1 1 31 10 A2.5 2.5 0 1 1 29 6" fill="none" stroke="#A85418" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M19 -4 Q16 -5 15 -3" fill="none" stroke="#4F8D35" stroke-width="3.3" stroke-linecap="round"/>
  </g>
`;

export const snailSvg = `<svg viewBox="-2 -21 43 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${SNAIL_PARTS}</svg>`;

/** Аватар у «Завданні» — той самий равлик. */
export const avatarSvg = snailSvg;
