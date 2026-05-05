// Format: show promptItem as a single emoji card, ask child to pick the matching pair.
// choices must have exactly 4 items; correctChoiceId varies in position across variants.
export const logicPairsVariants = [
    {
        id: 'dog-bone',
        promptItem: '🐶',
        choices: [
            { id: 'bone', label: '🦴' },
            { id: 'carrot', label: '🥕' },
            { id: 'flower', label: '🌸' },
            { id: 'mushroom', label: '🍄' }
        ],
        correctChoiceId: 'bone'
    },
    {
        id: 'rabbit-carrot',
        promptItem: '🐰',
        choices: [
            { id: 'bone', label: '🦴' },
            { id: 'carrot', label: '🥕' },
            { id: 'star', label: '⭐' },
            { id: 'rock', label: '🪨' }
        ],
        correctChoiceId: 'carrot'
    },
    {
        id: 'rain-umbrella',
        promptItem: '🌧️',
        choices: [
            { id: 'flower', label: '🌸' },
            { id: 'apple', label: '🍎' },
            { id: 'umbrella', label: '☂️' },
            { id: 'bone', label: '🦴' }
        ],
        correctChoiceId: 'umbrella'
    },
    {
        id: 'key-door',
        promptItem: '🔑',
        choices: [
            { id: 'apple', label: '🍎' },
            { id: 'cloud', label: '☁️' },
            { id: 'mushroom', label: '🍄' },
            { id: 'door', label: '🚪' }
        ],
        correctChoiceId: 'door'
    },
    {
        id: 'chick-hen',
        promptItem: '🐣',
        choices: [
            { id: 'hen', label: '🐔' },
            { id: 'rain', label: '🌧️' },
            { id: 'fish', label: '🐟' },
            { id: 'leaf', label: '🍃' }
        ],
        correctChoiceId: 'hen'
    },
    {
        id: 'sun-sunglasses',
        promptItem: '☀️',
        choices: [
            { id: 'bone', label: '🦴' },
            { id: 'sunglasses', label: '🕶️' },
            { id: 'mushroom', label: '🍄' },
            { id: 'key', label: '🔑' }
        ],
        correctChoiceId: 'sunglasses'
    },
    {
        id: 'bee-flower',
        promptItem: '🐝',
        choices: [
            { id: 'cloud', label: '☁️' },
            { id: 'rock', label: '🪨' },
            { id: 'star', label: '⭐' },
            { id: 'flower', label: '🌼' }
        ],
        correctChoiceId: 'flower'
    },
    {
        id: 'bird-nest',
        promptItem: '🐦',
        choices: [
            { id: 'apple', label: '🍎' },
            { id: 'nest', label: '🪺' },
            { id: 'carrot', label: '🥕' },
            { id: 'bone', label: '🦴' }
        ],
        correctChoiceId: 'nest'
    }
];
