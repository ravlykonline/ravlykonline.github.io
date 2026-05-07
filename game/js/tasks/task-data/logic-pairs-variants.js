// Format: show promptItem as a single emoji card, ask child to pick the matching pair.
// choices must have exactly 4 items; correctChoiceId varies in position across variants.
// Emoji compatibility: only Unicode ≤ 12.1 (2019) to ensure broad device support.
export const logicPairsVariants = [
    {
        id: 'dog-bone',
        promptItem: '🐶',
        choices: [
            { id: 'bone',     label: '🦴' },
            { id: 'carrot',   label: '🥕' },
            { id: 'flower',   label: '🌸' },
            { id: 'mushroom', label: '🍄' }
        ],
        correctChoiceId: 'bone'
    },
    {
        id: 'rabbit-carrot',
        promptItem: '🐰',
        choices: [
            { id: 'bone',     label: '🦴' },
            { id: 'carrot',   label: '🥕' },
            { id: 'star',     label: '⭐' },
            { id: 'gem',      label: '💎' }
        ],
        correctChoiceId: 'carrot'
    },
    {
        id: 'rain-umbrella',
        promptItem: '🌧️',
        choices: [
            { id: 'flower',   label: '🌸' },
            { id: 'apple',    label: '🍎' },
            { id: 'umbrella', label: '☂️' },
            { id: 'bone',     label: '🦴' }
        ],
        correctChoiceId: 'umbrella'
    },
    {
        id: 'key-door',
        promptItem: '🔑',
        choices: [
            { id: 'apple',    label: '🍎' },
            { id: 'cloud',    label: '☁️' },
            { id: 'mushroom', label: '🍄' },
            { id: 'door',     label: '🚪' }
        ],
        correctChoiceId: 'door'
    },
    {
        id: 'chick-hen',
        promptItem: '🐣',
        choices: [
            { id: 'hen',   label: '🐔' },
            { id: 'rain',  label: '🌧️' },
            { id: 'fish',  label: '🐟' },
            { id: 'leaf',  label: '🍃' }
        ],
        correctChoiceId: 'hen'
    },
    {
        id: 'sun-sunglasses',
        promptItem: '☀️',
        choices: [
            { id: 'bone',       label: '🦴' },
            { id: 'sunglasses', label: '🕶️' },
            { id: 'mushroom',   label: '🍄' },
            { id: 'key',        label: '🔑' }
        ],
        correctChoiceId: 'sunglasses'
    },
    {
        id: 'bee-flower',
        promptItem: '🐝',
        choices: [
            { id: 'cloud',    label: '☁️' },
            { id: 'gem',      label: '💎' },
            { id: 'star',     label: '⭐' },
            { id: 'flower',   label: '🌼' }
        ],
        correctChoiceId: 'flower'
    },
    {
        id: 'bird-tree',
        promptItem: '🐦',
        choices: [
            { id: 'apple',  label: '🍎' },
            { id: 'tree',   label: '🌳' },
            { id: 'carrot', label: '🥕' },
            { id: 'bone',   label: '🦴' }
        ],
        correctChoiceId: 'tree'
    },

    // ── Нові варіанти ────────────────────────────────────────────
    {
        id: 'cat-fish',
        promptItem: '🐱',
        choices: [
            { id: 'fish',   label: '🐟' },
            { id: 'carrot', label: '🥕' },
            { id: 'apple',  label: '🍎' },
            { id: 'star',   label: '⭐' }
        ],
        correctChoiceId: 'fish'
    },
    {
        id: 'pencil-paper',
        promptItem: '✏️',
        choices: [
            { id: 'apple', label: '🍎' },
            { id: 'star',  label: '⭐' },
            { id: 'paper', label: '📄' },
            { id: 'fish',  label: '🐟' }
        ],
        correctChoiceId: 'paper'
    },
    {
        id: 'fish-sea',
        promptItem: '🐠',
        choices: [
            { id: 'wave', label: '🌊' },
            { id: 'bone', label: '🦴' },
            { id: 'star', label: '⭐' },
            { id: 'leaf', label: '🍃' }
        ],
        correctChoiceId: 'wave'
    },
    {
        id: 'bee-honey',
        promptItem: '🐝',
        choices: [
            { id: 'cloud',  label: '☁️' },
            { id: 'honey',  label: '🍯' },
            { id: 'gem',    label: '💎' },
            { id: 'star',   label: '⭐' }
        ],
        correctChoiceId: 'honey'
    },
    {
        id: 'snow-snowman',
        promptItem: '❄️',
        choices: [
            { id: 'flower',  label: '🌸' },
            { id: 'apple',   label: '🍎' },
            { id: 'fish',    label: '🐟' },
            { id: 'snowman', label: '⛄' }
        ],
        correctChoiceId: 'snowman'
    },
    {
        id: 'moon-stars',
        promptItem: '🌙',
        choices: [
            { id: 'sun',   label: '☀️' },
            { id: 'fish',  label: '🐟' },
            { id: 'star',  label: '⭐' },
            { id: 'apple', label: '🍎' }
        ],
        correctChoiceId: 'star'
    },
    {
        id: 'cup-tea',
        promptItem: '☕',
        choices: [
            { id: 'bone',  label: '🦴' },
            { id: 'apple', label: '🍎' },
            { id: 'star',  label: '⭐' },
            { id: 'tea',   label: '🍵' }
        ],
        correctChoiceId: 'tea'
    },
    {
        id: 'baby-parent',
        promptItem: '👶',
        choices: [
            { id: 'fish',  label: '🐟' },
            { id: 'adult', label: '👩' },
            { id: 'apple', label: '🍎' },
            { id: 'star',  label: '⭐' }
        ],
        correctChoiceId: 'adult'
    },
    {
        id: 'plant-sun',
        promptItem: '🌱',
        choices: [
            { id: 'bone',   label: '🦴' },
            { id: 'gem',    label: '💎' },
            { id: 'sun',    label: '☀️' },
            { id: 'carrot', label: '🥕' }
        ],
        correctChoiceId: 'sun'
    },
    {
        id: 'butterfly-flower',
        promptItem: '🦋',
        choices: [
            { id: 'bone',    label: '🦴' },
            { id: 'star',    label: '⭐' },
            { id: 'hibiscus', label: '🌺' },
            { id: 'apple',   label: '🍎' }
        ],
        correctChoiceId: 'hibiscus'
    }
];
