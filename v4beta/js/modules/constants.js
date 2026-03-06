// js/modules/constants.js
export const COLOR_MAP = {
    червоний: "#FF0000",
    зелений: "#00FF00",
    синій: "#0000FF",
    чорний: "#000000",
    жовтий: "#FFFF00",
    жовтогарячий: "#FFA500",
    оранжевий: "#FFA500", // Alias
    фіолетовий: "#800080",
    рожевий: "#FFC0CB",
    коричневий: "#A52A2A",
    білий: "#FFFFFF",
    веселка: "RAINBOW",
    rainbow: "RAINBOW",
    // English aliases
    red: "#FF0000",
    green: "#00FF00",
    blue: "#0000FF",
    black: "#000000",
    yellow: "#FFFF00",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    brown: "#A52A2A",
    white: "#FFFFFF",
};

export const UKRAINIAN_COLOR_NAMES = {
    "#FF0000": "червоний",
    "#00FF00": "зелений",
    "#0000FF": "синій",
    "#000000": "чорний",
    "#FFFF00": "жовтий",
    "#FFA500": "жовтогарячий",
    "#800080": "фіолетовий",
    "#FFC0CB": "рожевий",
    "#A52A2A": "коричневий",
    "#FFFFFF": "білий",
};

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
