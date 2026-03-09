// js/modules/constants.js
export const COLOR_REGISTRY = [
    { name: "білий", hex: "#FFFFFF", group: "Ахроматичні", core: true, aliases: ["white"] },
    { name: "світло-сірий", hex: "#D0D3DC", group: "Ахроматичні", core: false, aliases: ["light-gray", "light-grey"] },
    { name: "сірий", hex: "#8A8F9E", group: "Ахроматичні", core: false, aliases: ["gray", "grey"] },
    { name: "темно-сірий", hex: "#4A4E5C", group: "Ахроматичні", core: false, aliases: ["dark-gray", "dark-grey"] },
    { name: "чорний", hex: "#1A1A1A", group: "Ахроматичні", core: true, aliases: ["black"] },

    { name: "рожевий", hex: "#FF82AC", group: "Червоні", core: true, aliases: ["pink"] },
    { name: "кораловий", hex: "#FF6B5B", group: "Червоні", core: false, aliases: ["coral"] },
    { name: "червоний", hex: "#E8302A", group: "Червоні", core: true, aliases: ["red"] },
    { name: "малиновий", hex: "#C0183A", group: "Червоні", core: false, aliases: ["crimson"] },
    { name: "бордовий", hex: "#7A1030", group: "Червоні", core: false, aliases: ["burgundy", "maroon"] },
    { name: "вишневий", hex: "#5C0E28", group: "Червоні", core: false, aliases: ["cherry"] },

    { name: "персиковий", hex: "#FFBD9B", group: "Помаранчеві", core: false, aliases: ["peach"] },
    { name: "жовтогарячий", hex: "#FF8C00", group: "Помаранчеві", core: true, aliases: ["помаранчевий", "оранжевий", "orange"] },
    { name: "теракотовий", hex: "#C45830", group: "Помаранчеві", core: false, aliases: ["terracotta"] },

    { name: "кремовий", hex: "#FFF8DC", group: "Жовті", core: false, aliases: ["cream"] },
    { name: "лимонний", hex: "#FFF44F", group: "Жовті", core: false, aliases: ["lemon"] },
    { name: "жовтий", hex: "#FFD600", group: "Жовті", core: true, aliases: ["yellow"] },
    { name: "золотий", hex: "#D4AF37", group: "Жовті", core: false, aliases: ["gold", "golden"] },
    { name: "гірчичний", hex: "#C8900A", group: "Жовті", core: false, aliases: ["mustard"] },

    { name: "салатовий", hex: "#A8E063", group: "Зелені", core: false, aliases: ["lime"] },
    { name: "зелений", hex: "#2ECC40", group: "Зелені", core: true, aliases: ["green"] },
    { name: "смарагдовий", hex: "#00A878", group: "Зелені", core: false, aliases: ["emerald"] },
    { name: "темно-зелений", hex: "#1A7A3C", group: "Зелені", core: false, aliases: ["dark-green"] },
    { name: "оливковий", hex: "#6B7C3A", group: "Зелені", core: false, aliases: ["olive"] },
    { name: "хакі", hex: "#8B8B4E", group: "Зелені", core: false, aliases: ["khaki"] },

    { name: "блакитний", hex: "#87CEEB", group: "Блакитні та сині", core: false, aliases: ["голубий", "sky-blue", "light-blue"] },
    { name: "небесний", hex: "#4FC3F7", group: "Блакитні та сині", core: false, aliases: ["azure", "sky"] },
    { name: "синій", hex: "#1A56DB", group: "Блакитні та сині", core: true, aliases: ["blue"] },
    { name: "темно-синій", hex: "#0A2472", group: "Блакитні та сині", core: false, aliases: ["dark-blue", "navy"] },
    { name: "індиго", hex: "#3F0080", group: "Блакитні та сині", core: false, aliases: ["indigo"] },
    { name: "морський", hex: "#006994", group: "Блакитні та сині", core: false, aliases: ["sea-blue", "teal-blue"] },

    { name: "бузковий", hex: "#DDA0DD", group: "Фіолетові", core: false, aliases: ["lavender"] },
    { name: "ліловий", hex: "#B57BDC", group: "Фіолетові", core: false, aliases: ["lilac"] },
    { name: "фіолетовий", hex: "#7B2FBE", group: "Фіолетові", core: true, aliases: ["purple", "violet"] },
    { name: "пурпуровий", hex: "#9B0060", group: "Фіолетові", core: false, aliases: ["magenta"] },
    { name: "сливовий", hex: "#5C0F5C", group: "Фіолетові", core: false, aliases: ["plum"] },

    { name: "бежевий", hex: "#F5DEB3", group: "Коричневі та земляні", core: false, aliases: ["beige", "кремово-бежевий"] },
    { name: "пісочний", hex: "#D4A855", group: "Коричневі та земляні", core: false, aliases: ["sand", "sandy"] },
    { name: "коричневий", hex: "#8B4513", group: "Коричневі та земляні", core: true, aliases: ["brown"] },
    { name: "шоколадний", hex: "#5C2C0A", group: "Коричневі та земляні", core: false, aliases: ["chocolate"] },
    { name: "каштановий", hex: "#954535", group: "Коричневі та земляні", core: false, aliases: ["chestnut"] },

    { name: "веселка", hex: "RAINBOW", group: "Спеціальні", core: true, aliases: ["rainbow"] },
];

function buildColorMap(registry) {
    const colorMap = {};
    for (const entry of registry) {
        colorMap[entry.name.toLowerCase()] = entry.hex;
        for (const alias of entry.aliases || []) {
            colorMap[String(alias).toLowerCase()] = entry.hex;
        }
    }
    return colorMap;
}

function buildUkrainianColorNames(registry) {
    const namesByHex = {};
    for (const entry of registry) {
        if (entry.hex === "RAINBOW") continue;
        if (!namesByHex[entry.hex]) {
            namesByHex[entry.hex] = entry.name;
        }
    }
    return namesByHex;
}

export const COLOR_MAP = buildColorMap(COLOR_REGISTRY);

export const UKRAINIAN_COLOR_NAMES = buildUkrainianColorNames(COLOR_REGISTRY);

export const CORE_COLOR_NAMES = COLOR_REGISTRY
    .filter((entry) => entry.core)
    .map((entry) => entry.name);

export const DEFAULT_PEN_COLOR = "#000000";
export const DEFAULT_PEN_SIZE = 3;
export const RAVLYK_INITIAL_ANGLE = -90; // Upwards

export const MAX_RECURSION_DEPTH = 20;
export const MAX_REPEATS_IN_LOOP = 500;
export const MAX_CANVAS_SIZE_PX = 3000; // Не використовується активно в поточній логіці
export const EXECUTION_TIMEOUT_MS = 180000; // 180 секунд, як зазначено в документації
export const MAX_CODE_LENGTH_CHARS = 10000;
export const CANVAS_BOUNDARY_PADDING = 5; // Зменшено, бо равлик тепер не виходить за межі

export const DEFAULT_ANIMATION_FRAME_DURATION_MS = 16; // Приблизно 60 FPS
export const DEFAULT_MOVE_PIXELS_PER_SECOND = 200; // Швидкість руху
export const DEFAULT_TURN_DEGREES_PER_SECOND = 360; // Швидкість повороту
// Grid/canvas alignment calibration.
// Small fixed offsets keep axes/labels aligned with the actual drawing origin
// on zoom levels and DPR combinations that introduce half-pixel layout shifts.
export const GRID_ALIGN_OFFSET_X = -3;
export const GRID_ALIGN_OFFSET_Y = -3;

export const ERROR_MESSAGES = {
    EXECUTION_IN_PROGRESS: 'Зачекай трішки: попередній запуск ще триває.',
    NO_DISTANCE: (command) => 'Після команди "' + command + '" треба вказати число кроків.',
    INVALID_DISTANCE: (command, value) => 'Після "' + command + '" має бути число, а не "' + value + '".',
    NO_ANGLE: (command) => 'Після команди "' + command + '" треба вказати кут у градусах.',
    INVALID_ANGLE: (command, value) => 'Для "' + command + '" потрібне число, а не "' + value + '".',
    NO_COLOR_NAME: (command) => 'Після команди "' + command + '" треба написати назву кольору.',
    NO_POSITION_X: (command) => 'Після команди "' + command + '" не вистачає X-координати.',
    NO_POSITION_Y: (command) => 'Після команди "' + command + '" не вистачає Y-координати.',
    INVALID_POSITION_X: (command, value) => 'X-координата для "' + command + '" має бути числом, а не "' + value + '".',
    INVALID_POSITION_Y: (command, value) => 'Y-координата для "' + command + '" має бути числом, а не "' + value + '".',
    UNKNOWN_COMMAND: (command) => 'Я не знаю команди: ' + command + '. Перевір написання.',
    UNKNOWN_COLOR: (colorName) => 'Я не знаю кольору "' + colorName + '". Спробуй іншу назву.',
    REPEAT_EXPECT_NUMBER: 'Після "повторити" треба вказати, скільки разів повторювати.',
    INVALID_REPEAT_COUNT: (value) => 'Кількість повторень "' + value + '" некоректна. Тут має бути ціле число.',
    REPEAT_EXPECT_OPEN_PAREN: 'Після числа в команді "повторити" потрібна дужка "(".',
    REPEAT_EXPECT_CLOSE_PAREN: 'У команді "повторити" бракує закриваючої дужки ")".',
    TOO_MANY_NESTED_REPEATS: 'Забагато вкладених "повторити". Максимум ' + MAX_RECURSION_DEPTH + ' рівнів.',
    TOO_MANY_REPEATS_IN_LOOP: 'У цьому циклі забагато повторень. Максимум ' + MAX_REPEATS_IN_LOOP + '. Спробуй зменшити N або збільшити крок руху.',
    EXECUTION_TIMEOUT: 'Програма виконувалась занадто довго (більше ' + (EXECUTION_TIMEOUT_MS / 1000) + ' секунд).',
    EXECUTION_STOPPED_BY_USER: 'Виконання зупинено.',
    CODE_TOO_LONG: 'Код завеликий. Максимальна довжина — ' + MAX_CODE_LENGTH_CHARS + ' символів.',
    CANVAS_OUT_OF_BOUNDS: 'Равлик намагається вийти за межі полотна!',
    SAVE_IMAGE_ERROR: (msg) => 'Не вдалося зберегти малюнок: ' + msg,
    SAVE_IMAGE_SECURITY_ERROR: 'Браузер не дозволив зберегти малюнок (обмеження безпеки). Спробуй зробити скріншот.',
    CANVAS_NOT_SUPPORTED: 'Твій браузер не підтримує полотно для малювання (Canvas). Спробуй інший браузер.',
    CANVAS_CONTEXT_ERROR: 'Не вдалося підготувати полотно для малювання. Онови сторінку або спробуй інший браузер.',
    FUNCTION_NAME_RESERVED: (name) => 'Назва "' + name + '" вже зайнята командою. Обери іншу.',
    FUNCTION_NAME_INVALID: (name) => 'Назва функції "' + name + '" не підходить. Використовуй літери, цифри, _ або -.',
    FUNCTION_NAME_CONFLICT_VARIABLE: (name) => 'Назва "' + name + '" вже використовується як змінна.',
    FUNCTION_PARAM_INVALID: (name) => 'Назва параметра "' + name + '" не підходить.',
    FUNCTION_PARAM_RESERVED: (name) => 'Параметр "' + name + '" не може мати назву вбудованої команди.',
    FUNCTION_DECLARATION_SYNTAX: 'Я не зрозумів, як створити функцію. Використай формат: створити назва(параметр) ( ... ).',
    FUNCTION_BODY_EMPTY: (name) => 'Функція "' + name + '" порожня. Додай хоча б одну команду.',
    FUNCTION_ALREADY_EXISTS: (name) => 'Функція "' + name + '" вже існує.',
    FUNCTION_CALL_SYNTAX: (name) => 'Виклик "' + name + '" записано неправильно. Має бути так: ' + name + '(число).',
    FUNCTION_ARGUMENT_INVALID: (name, value) => 'У виклику "' + name + '" аргумент "' + value + '" має бути числом.',
    VARIABLE_DECLARATION_SYNTAX: 'Я не зрозумів створення змінної. Використай формат: створити назва = число.',
    VARIABLE_NAME_INVALID: (name) => 'Назва змінної "' + name + '" не підходить. Використовуй літери, цифри, _ або -.',
    VARIABLE_NAME_RESERVED: (name) => 'Назва "' + name + '" вже зайнята командою. Обери іншу.',
    VARIABLE_NAME_CONFLICT_FUNCTION: (name) => 'Назва "' + name + '" вже використовується як функція.',
    VARIABLE_VALUE_INVALID: (name, value) => 'Для змінної "' + name + '" потрібне число, а не "' + value + '".',
    UNDEFINED_VARIABLE: (name) => 'Я не знайшов змінну "' + name + '". Спочатку створи її: створити ' + name + ' = число.',
    GAME_NOT_SUPPORTED_HERE: 'Команда "грати" не підтримується в цьому режимі запуску.',
    GAME_MODE_TOP_LEVEL_ONLY: 'Якщо у програмі є "грати (...)", на верхньому рівні дозволені лише "створити ... = ..." та оголошення функцій. Перемісти інші команди всередину блоку "грати".',
    GAME_MODE_SINGLE_BLOCK: 'У програмі має бути лише один блок "грати (...)".',
    GAME_MODE_NESTED_BLOCK: 'Блок "грати (...)" не можна вкладати всередину інших блоків або функцій. Розмісти його на верхньому рівні програми.',
    LEGACY_PARSE_PATH_REMOVED: 'Старий шлях parseTokens вимкнено. Використовуй AST-шлях: parseTokensToAst / parseCodeToAst.',
};

export const SUCCESS_MESSAGES = {
    IMAGE_SAVED: 'Малюнок збережено!',
    CODE_EXECUTED: 'Код виконано успішно!',
};

export const INFO_MESSAGES = {
    EXECUTION_STOPPED: "Виконання зупинено."
};

export const RAVLYK_SVG_DATA_URL = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,0 15,85 85,85" fill="%234a6fa5"/></svg>'; // Носик у (50,0)



export const CURRENT_YEAR = new Date().getFullYear(); // Для футера
