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
export const MAX_REPEATS_IN_LOOP = 1000;
export const MAX_CANVAS_SIZE_PX = 3000; // Не використовується активно в поточній логіці
export const EXECUTION_TIMEOUT_MS = 60000; // 60 секунд, як зазначено в документації
export const MAX_CODE_LENGTH_CHARS = 10000;
export const CANVAS_BOUNDARY_PADDING = 5; // Зменшено, бо равлик тепер не виходить за межі

export const DEFAULT_ANIMATION_FRAME_DURATION_MS = 16; // Приблизно 60 FPS
export const DEFAULT_MOVE_PIXELS_PER_SECOND = 200; // Швидкість руху
export const DEFAULT_TURN_DEGREES_PER_SECOND = 360; // Швидкість повороту

export const ERROR_MESSAGES = {
    NO_DISTANCE: (command) => `Не вказано відстань для команди "${command}"`,
    INVALID_DISTANCE: (command, value) => `Некоректна відстань "${value}" для команди "${command}"`,
    NO_ANGLE: (command) => `Не вказано кут для команди "${command}"`,
    INVALID_ANGLE: (command, value) => `Некоректний кут "${value}" для команди "${command}"`,
    NO_COLOR_NAME: (command) => `Не вказано колір для команди "${command}"`,
    UNKNOWN_COMMAND: (command) => `Не розумію команду: ${command}`,
    UNKNOWN_COLOR: (colorName) => `Невідомий колір: ${colorName}`,
    REPEAT_EXPECT_NUMBER: 'Помилка в "повторити": очікується число повторень.',
    INVALID_REPEAT_COUNT: (value) => `Некоректна кількість повторень: "${value}".`,
    REPEAT_EXPECT_OPEN_PAREN: 'Помилка в "повторити": очікується "(".',
    REPEAT_EXPECT_CLOSE_PAREN: 'Помилка в "повторити": не знайдено відповідної ")".',
    TOO_MANY_NESTED_REPEATS: `Занадто багато вкладених "повторити" (максимум ${MAX_RECURSION_DEPTH}).`,
    TOO_MANY_REPEATS_IN_LOOP: `Занадто багато повторень в одному циклі (максимум ${MAX_REPEATS_IN_LOOP}).`,
    EXECUTION_TIMEOUT: `Виконання програми зайняло занадто багато часу (більше ${EXECUTION_TIMEOUT_MS / 1000} секунд).`,
    EXECUTION_STOPPED_BY_USER: "Виконання зупинено користувачем.",
    CODE_TOO_LONG: `Код занадто довгий. Максимальна довжина - ${MAX_CODE_LENGTH_CHARS} символів.`,
    CANVAS_OUT_OF_BOUNDS: "Равлик намагається вийти за межі полотна!", // Це тепер попередження, а не помилка
    SAVE_IMAGE_ERROR: (msg) => `Не вдалося зберегти малюнок: ${msg}`,
    SAVE_IMAGE_SECURITY_ERROR: 'Помилка безпеки: неможливо зберегти малюнок через обмеження браузера (CORS). Спробуйте зробити скріншот.',
    CANVAS_NOT_SUPPORTED: 'Ваш браузер не підтримує Canvas. Будь ласка, оновіть браузер або спробуйте інший.',
    CANVAS_CONTEXT_ERROR: 'Проблема з ініціалізацією Canvas. Будь ласка, оновіть браузер або спробуйте інший.',
};

export const SUCCESS_MESSAGES = {
    IMAGE_SAVED: 'Малюнок збережено!',
    CODE_EXECUTED: 'Код виконано успішно!',
};

export const INFO_MESSAGES = {
    EXECUTION_STOPPED: "Виконання зупинено."
};

export const RAVLYK_SVG_DATA_URL = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,0 15,85 85,85" fill="%234a6fa5"/></svg>'; // Носик у (50,0)

export const HELP_MODAL_CONTENT_ID = 'ravlyk-help-modal-content';
export const CLEAR_CONFIRM_MODAL_ID = 'clear-confirm-modal-content';


export const CURRENT_YEAR = new Date().getFullYear(); // Для футера