// Fallback-варіанти для задачі «Магічний квадрат».
// grid: 9 клітинок (3×3), одна null — порожня.
// Правило: кожен рядок і кожен стовпець містять усі три символи рівно по одному разу.
// choices: рівно 3 варіанти; correctChoiceId — той що стоїть у null-позиції.
export const magicSquareVariants = [
    // ── Сад ──────────────────────────────────────────────────────
    {
        id: 'garden',
        grid: ['🌼', '🍄', '🍃',
               '🍄', '🍃', '🌼',
               '🍃', null, '🍄'],
        choices: [
            { id: 'flower',   label: '🌼' },
            { id: 'mushroom', label: '🍄' },
            { id: 'leaf',     label: '🍃' }
        ],
        correctChoiceId: 'flower'
    },

    // ── Тварини ───────────────────────────────────────────────────
    {
        id: 'animals',
        grid: ['🐶', '🐱', '🐰',
               '🐱', '🐰', '🐶',
               '🐰', '🐶', null],
        choices: [
            { id: 'dog',    label: '🐶' },
            { id: 'cat',    label: '🐱' },
            { id: 'rabbit', label: '🐰' }
        ],
        correctChoiceId: 'cat'
    },

    // ── Фрукти ───────────────────────────────────────────────────
    {
        id: 'fruits',
        grid: ['🍎', '🍊', '🍋',
               '🍊', '🍋', '🍎',
               null, '🍎', '🍊'],
        choices: [
            { id: 'apple',  label: '🍎' },
            { id: 'orange', label: '🍊' },
            { id: 'lemon',  label: '🍋' }
        ],
        correctChoiceId: 'lemon'
    },

    // ── Зірки/місяць/сонце ───────────────────────────────────────
    {
        id: 'sky',
        grid: ['⭐', '🌙', '☀️',
               '🌙', '☀️', '⭐',
               '☀️', null, '🌙'],
        choices: [
            { id: 'star', label: '⭐' },
            { id: 'moon', label: '🌙' },
            { id: 'sun',  label: '☀️' }
        ],
        correctChoiceId: 'star'
    },

    // ── Погода ───────────────────────────────────────────────────
    {
        id: 'weather',
        grid: ['🌈', '⛅', '🌧️',
               null, '🌧️', '🌈',
               '🌧️', '🌈', '⛅'],
        choices: [
            { id: 'rainbow', label: '🌈' },
            { id: 'cloudy',  label: '⛅' },
            { id: 'rain',    label: '🌧️' }
        ],
        correctChoiceId: 'cloudy'
    },

    // ── Транспорт ─────────────────────────────────────────────────
    {
        id: 'transport',
        grid: ['🚗', '🚂', '✈️',
               '✈️', '🚗', '🚂',
               '🚂', null, '🚗'],
        choices: [
            { id: 'car',   label: '🚗' },
            { id: 'train', label: '🚂' },
            { id: 'plane', label: '✈️' }
        ],
        correctChoiceId: 'plane'
    },

    // ── Морські ───────────────────────────────────────────────────
    {
        id: 'sea',
        grid: ['🐟', '🐙', '🦀',
               '🦀', '🐟', '🐙',
               '🐙', null, '🐟'],
        choices: [
            { id: 'fish',     label: '🐟' },
            { id: 'octopus',  label: '🐙' },
            { id: 'crab',     label: '🦀' }
        ],
        correctChoiceId: 'crab'
    },

    // ── Форми ─────────────────────────────────────────────────────
    {
        id: 'shapes',
        grid: ['○', '△', '□',
               '△', '□', '○',
               '□', '○', null],
        choices: [
            { id: 'circle',   label: '○' },
            { id: 'triangle', label: '△' },
            { id: 'square',   label: '□' }
        ],
        correctChoiceId: 'triangle'
    },

    // ── Овочі ─────────────────────────────────────────────────────
    {
        id: 'vegetables',
        grid: ['🥕', '🌽', '🥦',
               '🌽', '🥦', '🥕',
               '🥦', null, '🌽'],
        choices: [
            { id: 'carrot',   label: '🥕' },
            { id: 'corn',     label: '🌽' },
            { id: 'broccoli', label: '🥦' }
        ],
        correctChoiceId: 'carrot'
    },

    // ── Пори року ─────────────────────────────────────────────────
    {
        id: 'seasons',
        grid: ['🌸', '☀️', '🍂',
               '☀️', '🍂', '🌸',
               null, '🌸', '☀️'],
        choices: [
            { id: 'spring', label: '🌸' },
            { id: 'summer', label: '☀️' },
            { id: 'autumn', label: '🍂' }
        ],
        correctChoiceId: 'autumn'
    }
];
