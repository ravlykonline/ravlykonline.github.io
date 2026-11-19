// Равлик зверху: кінчик олівця в (0, 0), голова дивиться вгору (heading 0).
// Це валідний XML: кожен атрибут має значення (A1).
const SNAIL_PARTS = `
  <g data-snail-body="body">
    <ellipse cx="0" cy="39" rx="10" ry="17" fill="#7DC953"/>
    <ellipse cx="0" cy="45" rx="7" ry="9" fill="#5DA030" opacity=".35"/>
    <circle cx="0" cy="19" r="8.5" fill="#8FD860"/>
    <line x1="-4.5" y1="13" x2="-9" y2="6" stroke="#7DC953" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="-9.5" cy="5" r="3.6" fill="#6BBF45"/>
    <circle cx="-9.5" cy="4.2" r="2" fill="#1A1A2E"/>
    <line x1="4.5" y1="13" x2="9" y2="6" stroke="#7DC953" stroke-width="2.6" stroke-linecap="round"/>
    <circle cx="9.5" cy="5" r="3.6" fill="#6BBF45"/>
    <circle cx="9.5" cy="4.2" r="2" fill="#1A1A2E"/>
    <circle cx="0" cy="40" r="14" fill="#D4822A"/>
    <circle cx="0" cy="40" r="10" fill="#E8A050" opacity=".7"/>
    <path d="M-1.5 40 a1.5 1.5 0 1 1 3 0 a4 4 0 1 1 -8 0 a6.5 6.5 0 1 1 13 0" fill="none" stroke="#B06020" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="-5" cy="33" r="3" fill="#FFFFFF" opacity=".18"/>
  </g>
  <g data-pencil="pencil">
    <rect x="-3.2" y="6" width="6.4" height="13" rx="1" fill="#FFD34D" stroke="#4A2500" stroke-width="1"/>
    <path data-pen-tip="tip" d="M-3.2 6 L3.2 6 L0 0 Z" fill="#FF8C1A" stroke="#4A2500" stroke-width="1" stroke-linejoin="round"/>
  </g>
`;

export const snailSvg = `<svg viewBox="-20 -3 40 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${SNAIL_PARTS}</svg>`;

/** Аватар у «Завданні» — той самий равлик. */
export const avatarSvg = snailSvg;
