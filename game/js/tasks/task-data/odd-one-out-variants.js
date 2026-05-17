// Fallback-варіанти для задачі «Що зайве?»
// Правило: 3 предмети — різні між собою, але з однієї категорії;
//           4-й — з іншої категорії (зайвий).
// Всі items.label унікальні в межах одного варіанту.
export const oddOneOutVariants = [
    // ── Ссавці / Птах ────────────────────────────────────────────
    {
        id: 'mammals-bird',
        items: [
            { id: 'fox',    label: '🦊' },
            { id: 'wolf',   label: '🐺' },
            { id: 'lion',   label: '🦁' },
            { id: 'eagle',  label: '🦅' }
        ],
        correctChoiceId: 'eagle'
    },
    {
        id: 'pets-wild',
        items: [
            { id: 'dog',    label: '🐶' },
            { id: 'cat',    label: '🐱' },
            { id: 'rabbit', label: '🐇' },
            { id: 'fox2',   label: '🦊' }
        ],
        correctChoiceId: 'fox2'
    },
    {
        id: 'sea-mammals-land',
        items: [
            { id: 'dolphin', label: '🐬' },
            { id: 'whale',   label: '🐋' },
            { id: 'seal',    label: '🦭' },
            { id: 'wolf2',   label: '🐺' }
        ],
        correctChoiceId: 'wolf2'
    },

    // ── Птахи / Комаха ───────────────────────────────────────────
    {
        id: 'birds-butterfly',
        items: [
            { id: 'owl',     label: '🦉' },
            { id: 'penguin', label: '🐧' },
            { id: 'parrot',  label: '🦜' },
            { id: 'butterfly', label: '🦋' }
        ],
        correctChoiceId: 'butterfly'
    },
    {
        id: 'birds-fish',
        items: [
            { id: 'eagle2',  label: '🦅' },
            { id: 'peacock', label: '🦚' },
            { id: 'owl2',    label: '🦉' },
            { id: 'fish',    label: '🐟' }
        ],
        correctChoiceId: 'fish'
    },

    // ── Комахи / Ссавець ─────────────────────────────────────────
    {
        id: 'insects-rabbit',
        items: [
            { id: 'bee',     label: '🐝' },
            { id: 'caterpillar', label: '🐛' },
            { id: 'ladybug', label: '🐞' },
            { id: 'rabbit2', label: '🐰' }
        ],
        correctChoiceId: 'rabbit2'
    },

    // ── Морські / Суходільні ─────────────────────────────────────
    {
        id: 'sea-land',
        items: [
            { id: 'fish2',  label: '🐠' },
            { id: 'octopus', label: '🐙' },
            { id: 'shark',  label: '🦈' },
            { id: 'wolf3',  label: '🐺' }
        ],
        correctChoiceId: 'wolf3'
    },

    // ── Фрукти / Овоч ────────────────────────────────────────────
    {
        id: 'fruits-vegetable',
        items: [
            { id: 'apple',  label: '🍎' },
            { id: 'grapes', label: '🍇' },
            { id: 'banana', label: '🍌' },
            { id: 'broccoli', label: '🥦' }
        ],
        correctChoiceId: 'broccoli'
    },
    {
        id: 'fruits-vegetable-2',
        items: [
            { id: 'peach',  label: '🍑' },
            { id: 'mango',  label: '🥭' },
            { id: 'pear',   label: '🍐' },
            { id: 'carrot', label: '🥕' }
        ],
        correctChoiceId: 'carrot'
    },

    // ── Овочі / Фрукт ────────────────────────────────────────────
    {
        id: 'vegetables-fruit',
        items: [
            { id: 'carrot2', label: '🥕' },
            { id: 'corn',    label: '🌽' },
            { id: 'eggplant', label: '🍆' },
            { id: 'orange',  label: '🍊' }
        ],
        correctChoiceId: 'orange'
    },

    // ── Наземний транспорт / Водний ──────────────────────────────
    {
        id: 'land-transport-sea',
        items: [
            { id: 'car',   label: '🚗' },
            { id: 'bus',   label: '🚌' },
            { id: 'train', label: '🚂' },
            { id: 'ship',  label: '🚢' }
        ],
        correctChoiceId: 'ship'
    },
    {
        id: 'air-transport-land',
        items: [
            { id: 'plane',      label: '✈️' },
            { id: 'helicopter', label: '🚁' },
            { id: 'rocket',     label: '🚀' },
            { id: 'car2',       label: '🚗' }
        ],
        correctChoiceId: 'car2'
    },

    // ── Спорт / Їжа ──────────────────────────────────────────────
    {
        id: 'sports-food',
        items: [
            { id: 'soccer',     label: '⚽' },
            { id: 'basketball', label: '🏀' },
            { id: 'tennis',     label: '🎾' },
            { id: 'apple2',     label: '🍎' }
        ],
        correctChoiceId: 'apple2'
    },

    // ── Музичні інструменти / Тварина ────────────────────────────
    {
        id: 'instruments-animal',
        items: [
            { id: 'guitar', label: '🎸' },
            { id: 'piano',  label: '🎹' },
            { id: 'trumpet', label: '🎺' },
            { id: 'bear',   label: '🐻' }
        ],
        correctChoiceId: 'bear'
    },

    // ── Квіти / Дерево ───────────────────────────────────────────
    {
        id: 'flowers-tree',
        items: [
            { id: 'cherry-blossom', label: '🌸' },
            { id: 'hibiscus',       label: '🌺' },
            { id: 'sunflower',      label: '🌻' },
            { id: 'tree',           label: '🌲' }
        ],
        correctChoiceId: 'tree'
    },

    // ── Живі / Неживий ───────────────────────────────────────────
    {
        id: 'living-nonliving',
        items: [
            { id: 'flower',  label: '🌸' },
            { id: 'sprout',  label: '🌱' },
            { id: 'herb',    label: '🌿' },
            { id: 'gem',     label: '💎' }
        ],
        correctChoiceId: 'gem'
    },

    // ── Зимове / Літнє ───────────────────────────────────────────
    {
        id: 'winter-summer',
        items: [
            { id: 'snowflake', label: '❄️' },
            { id: 'snowman',   label: '⛄' },
            { id: 'mountain',  label: '🏔️' },
            { id: 'sun',       label: '☀️' }
        ],
        correctChoiceId: 'sun'
    },

    // ── Одяг / Тварина ───────────────────────────────────────────
    {
        id: 'clothing-animal',
        items: [
            { id: 'hat',   label: '👒' },
            { id: 'glove', label: '🧤' },
            { id: 'shoe',  label: '👟' },
            { id: 'cat2',  label: '🐱' }
        ],
        correctChoiceId: 'cat2'
    },

    // ── Небесні тіла / Тварина ───────────────────────────────────
    {
        id: 'sky-animal',
        items: [
            { id: 'sun2',   label: '☀️' },
            { id: 'moon',   label: '🌙' },
            { id: 'star',   label: '⭐' },
            { id: 'dolphin2', label: '🐬' }
        ],
        correctChoiceId: 'dolphin2'
    }
];
