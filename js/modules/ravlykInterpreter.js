// js/modules/ravlykInterpreter.js
import {
    COLOR_MAP, DEFAULT_PEN_COLOR, DEFAULT_PEN_SIZE, RAVLYK_INITIAL_ANGLE,
    MAX_RECURSION_DEPTH, MAX_REPEATS_IN_LOOP, CANVAS_BOUNDARY_PADDING,
    ERROR_MESSAGES, DEFAULT_MOVE_PIXELS_PER_SECOND, DEFAULT_TURN_DEGREES_PER_SECOND,
    DEFAULT_ANIMATION_FRAME_DURATION_MS // Ця константа може не використовуватися прямо, але залишаємо імпорт
} from './constants.js';

// Спеціальний клас для помилок інтерпретатора
class RavlykError extends Error {
    constructor(messageKey, ...params) {
        const messageTemplate = ERROR_MESSAGES[messageKey] || "Невідома помилка інтерпретатора";
        // Обробка випадку, коли messageTemplate - функція
        const message = typeof messageTemplate === 'function'
            ? messageTemplate(...params)
            : messageTemplate;
        super(message);
        this.name = "RavlykError";
    }
}

export class RavlykInterpreter {
    constructor(context, canvas, ravlykVisualUpdater, commandIndicatorUpdater) {
        this.ctx = context;
        this.canvas = canvas;
        // Функція для оновлення візуального стану спрайта (приймає state, canvas)
        this.ravlykVisualUpdater = ravlykVisualUpdater;
        // Функція для оновлення індикатора команди (приймає text, index)
        this.commandIndicatorUpdater = commandIndicatorUpdater;

        // Внутрішній стан равлика
        this.state = {
            x: 0,
            y: 0,
            angle: RAVLYK_INITIAL_ANGLE,
            isPenDown: true,
            color: DEFAULT_PEN_COLOR,
            penSize: DEFAULT_PEN_SIZE,
            isRainbow: false,
            rainbowHue: 0,
        };

        // Конфігурація інтерпретатора
        this.config = {
            animationEnabled: true,
            moveSpeed: DEFAULT_MOVE_PIXELS_PER_SECOND, // пікселів на секунду
            turnSpeed: DEFAULT_TURN_DEGREES_PER_SECOND, // градусів на секунду
        };

        // Стан виконання
        this.isExecuting = false;      // Чи виконується зараз код?
        this.shouldStop = false;       // Чи надійшов запит на зупинку?
        this.animationFrameId = null;  // ID для cancelAnimationFrame
        this.commandQueue = [];        // Черга команд для виконання
        this.currentCommandIndex = 0;  // Індекс поточної команди в черзі

        this.reset(); // Встановлюємо початковий стан
    }

    // Скидання стану равлика та очищення полотна
    reset() {
        this.state.x = this.canvas.width / 2;
        this.state.y = this.canvas.height / 2;
        this.state.angle = RAVLYK_INITIAL_ANGLE;
        this.state.isPenDown = true;
        this.state.color = DEFAULT_PEN_COLOR;
        this.state.penSize = DEFAULT_PEN_SIZE;
        this.state.isRainbow = false;
        this.state.rainbowHue = 0;

        // Зупиняємо будь-яку поточну анімацію, якщо вона є
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.isExecuting = false; // Переконуємося, що стан не "виконується"
        this.shouldStop = false;
        this.commandQueue = [];
        this.currentCommandIndex = 0;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.applyContextSettings();      // Застосовуємо налаштування (товщина, колір)
        this.updateRavlykVisualState(true); // Примусово оновлюємо спрайт
        this.commandIndicatorUpdater(null, -1); // Ховаємо індикатор
    }

    // Застосування поточних налаштувань до контексту Canvas
    applyContextSettings() {
        this.ctx.strokeStyle = this.state.isRainbow ? `hsl(${this.state.rainbowHue}, 100%, 50%)` : this.state.color;
        this.ctx.lineWidth = this.state.penSize;
        this.ctx.lineCap = "round";
        this.ctx.lineJoin = "round";
    }

    // Оновлення візуального стану спрайта Равлика (через колбек)
    updateRavlykVisualState(force = false) {
        // Оновлюємо тільки якщо анімація ввімкнена або якщо це примусове оновлення (напр., після reset)
        if (this.ravlykVisualUpdater && (this.config.animationEnabled || force)) {
            this.ravlykVisualUpdater(
                { x: this.state.x, y: this.state.y, angle: this.state.angle },
                this.canvas
            );
        }
    }

    // Ввімкнути/вимкнути анімацію
    setAnimationEnabled(enabled) {
        this.config.animationEnabled = !!enabled;
    }

    // Встановити швидкість руху та повороту
    setSpeed(moveSpeed, turnSpeed) {
        this.config.moveSpeed = moveSpeed > 0 ? moveSpeed : DEFAULT_MOVE_PIXELS_PER_SECOND;
        this.config.turnSpeed = turnSpeed > 0 ? turnSpeed : DEFAULT_TURN_DEGREES_PER_SECOND;
    }

    // Розбиття коду на токени (слова, числа, дужки)
    tokenize(codeStr) {
        const lines = codeStr.split(/[\n\r]+/)
            .map(line => line.replace(/#.*/, '').trim()) // Видалення коментарів та пробілів по краях
            .filter(line => line.length > 0);
        const combinedCode = lines.join(' ');
        const tokens = combinedCode.match(/\S+|\(|\)/g) || []; // Знаходить слова, числа або дужки
        return tokens.filter(token => token.trim() !== ""); // Видалення порожніх токенів
    }

    // Головний метод для запуску виконання коду
    async executeCommands(commandsString) {
        if (this.isExecuting) {
            // Замість помилки можна повертати Promise.reject або обробляти інакше
            throw new RavlykError("EXECUTION_IN_PROGRESS");
        }
        this.isExecuting = true;
        this.shouldStop = false;
        this.currentCommandIndex = 0;

        try {
            const tokens = this.tokenize(commandsString);
            // Перетворюємо токени на структуровану чергу команд
            this.commandQueue = this.parseTokens(tokens);
            // Запускаємо виконання черги команд
            return await this.runCommandQueue();
        } catch (error) {
            // Якщо помилка сталася на етапі парсингу або виконання
            this.isExecuting = false;
            this.commandIndicatorUpdater(null, -1); // Сховати індикатор
            throw error; // Перекидаємо помилку далі для обробки в main.js
        } finally {
            // Цей блок виконається незалежно від того, була помилка чи ні
            this.isExecuting = false; // Гарантовано знімаємо прапорець виконання
            this.commandIndicatorUpdater(null, -1); // Гарантовано ховаємо індикатор
        }
    }

    // Рекурсивний парсер токенів у структуровані команди
    parseTokens(tokens, depth = 0) {
        if (depth > MAX_RECURSION_DEPTH) {
            throw new RavlykError("TOO_MANY_NESTED_REPEATS");
        }

        const queue = []; // Черга команд
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i].toLowerCase(); // Команди нечутливі до регістру
            const originalToken = tokens[i]; // Зберігаємо оригінал для повідомлень

            switch (token) {
                case "вперед": case "forward":
                case "назад": case "backward":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_DISTANCE", originalToken);
                    const distance = parseFloat(tokens[i + 1]);
                    if (isNaN(distance)) throw new RavlykError("INVALID_DISTANCE", originalToken, tokens[i+1]);
                    queue.push({
                        type: (token === "вперед" || token === "forward") ? "MOVE" : "MOVE_BACK",
                        value: distance,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2; // Пропускаємо команду та її аргумент
                    break;

                case "праворуч": case "right":
                case "ліворуч": case "left":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_ANGLE", originalToken);
                    const angle = parseFloat(tokens[i + 1]);
                    if (isNaN(angle)) throw new RavlykError("INVALID_ANGLE", originalToken, tokens[i+1]);
                     queue.push({
                        type: (token === "праворуч" || token === "right") ? "TURN" : "TURN_LEFT",
                        value: angle,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2;
                    break;

                case "колір": case "color":
                    if (i + 1 >= tokens.length) throw new RavlykError("NO_COLOR_NAME", originalToken);
                    const colorName = tokens[i + 1].toLowerCase(); // Назви кольорів теж нечутливі
                    if (!COLOR_MAP[colorName]) throw new RavlykError("UNKNOWN_COLOR", tokens[i + 1]);
                     queue.push({
                        type: "COLOR",
                        value: colorName,
                        original: `${originalToken} ${tokens[i+1]}`
                    });
                    i += 2;
                    break;

                case "підняти": case "penup":
                    queue.push({ type: "PEN_UP", original: originalToken });
                    i += 1;
                    break;
                case "опустити": case "pendown":
                    queue.push({ type: "PEN_DOWN", original: originalToken });
                    i += 1;
                    break;
                case "очистити": case "clear":
                    queue.push({ type: "CLEAR", original: originalToken });
                    i += 1;
                    break;

                case "повторити": case "повтори": case "repeat":
                    if (i + 1 >= tokens.length) throw new RavlykError("REPEAT_EXPECT_NUMBER");
                    const repeatCount = parseInt(tokens[i + 1], 10); // Важливо вказувати базу 10
                    if (isNaN(repeatCount) || repeatCount < 0) throw new RavlykError("INVALID_REPEAT_COUNT", tokens[i+1]);
                    if (repeatCount > MAX_REPEATS_IN_LOOP) {
                        console.warn(`Warning: Repeat count ${repeatCount} exceeds maximum ${MAX_REPEATS_IN_LOOP}. Clamping to max.`);
                        // Можна або кидати помилку, або обмежувати:
                        // throw new RavlykError("TOO_MANY_REPEATS_IN_LOOP");
                    }
                    const actualRepeatCount = Math.min(repeatCount, MAX_REPEATS_IN_LOOP); // Обмеження

                    if (i + 2 >= tokens.length || tokens[i + 2] !== "(") {
                        throw new RavlykError("REPEAT_EXPECT_OPEN_PAREN");
                    }

                    // Пошук відповідної закриваючої дужки
                    let parenBalance = 1;
                    let subTokensStart = i + 3;
                    let subTokensEnd = subTokensStart;
                    while (subTokensEnd < tokens.length) {
                        if (tokens[subTokensEnd] === "(") parenBalance++;
                        else if (tokens[subTokensEnd] === ")") parenBalance--;
                        if (parenBalance === 0) break;
                        subTokensEnd++;
                    }

                    if (parenBalance !== 0) { // Дужка не знайдена
                        throw new RavlykError("REPEAT_EXPECT_CLOSE_PAREN");
                    }

                    // Рекурсивно парсимо команди всередині дужок
                    const commandsToRepeatTokens = tokens.slice(subTokensStart, subTokensEnd);
                    const nestedCommands = this.parseTokens(commandsToRepeatTokens, depth + 1);

                    // Якщо тіло циклу порожнє або кількість повторень 0, просто пропускаємо
                    if (actualRepeatCount > 0 && nestedCommands.length > 0) {
                         queue.push({
                            type: "REPEAT",
                            count: actualRepeatCount,
                            commands: nestedCommands,
                            original: `${originalToken} ${tokens[i+1]} (...)` // Скорочений оригінал
                        });
                    }
                    i = subTokensEnd + 1; // Переходимо до токена після ')'
                    break;

                case "(": case ")": // Дужки поза командою 'повторити' є помилкою
                    throw new RavlykError("UNKNOWN_COMMAND", `${originalToken} (неочікувана дужка)`);

                default: // Невідома команда
                    throw new RavlykError("UNKNOWN_COMMAND", originalToken);
            }
        }
        return queue; // Повертаємо зібрану чергу команд
    }

    // Асинхронний цикл виконання команд з черги
    async runCommandQueue() {
        return new Promise((resolve, reject) => {
            let lastTimestamp = performance.now(); // Час попереднього кадру

            const processNextCommand = (timestamp) => {
                // Перевірка на запит зупинки
                if (this.shouldStop) {
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    console.log("Execution stopped by request.");
                    reject(new RavlykError("EXECUTION_STOPPED_BY_USER"));
                    return;
                }

                // Перевірка завершення черги
                if (this.currentCommandIndex >= this.commandQueue.length) {
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    console.log("Command queue finished.");
                    resolve(); // Успішне завершення
                    return;
                }

                // Отримуємо поточну команду
                const currentCommandObject = this.commandQueue[this.currentCommandIndex];
                // Оновлюємо індикатор
                this.commandIndicatorUpdater(currentCommandObject.original, this.currentCommandIndex);

                try {
                    // Розрахунок часу, що минув з попереднього кадру (в секундах)
                    // Якщо анімація вимкнена, deltaTime = Infinity для миттєвого виконання
                    const deltaTime = this.config.animationEnabled ? (timestamp - lastTimestamp) / 1000 : Infinity;
                    lastTimestamp = timestamp;

                    let commandDone = true; // Прапорець: чи завершено виконання поточної команди?

                    // Обробка типу команди
                    switch (currentCommandObject.type) {
                        case "MOVE":
                            commandDone = this.animateMove(currentCommandObject, currentCommandObject.value, deltaTime);
                            break;
                        case "MOVE_BACK":
                            commandDone = this.animateMove(currentCommandObject, -currentCommandObject.value, deltaTime);
                            break;
                        case "TURN":
                            commandDone = this.animateTurn(currentCommandObject, currentCommandObject.value, deltaTime);
                            break;
                        case "TURN_LEFT":
                            commandDone = this.animateTurn(currentCommandObject, -currentCommandObject.value, deltaTime);
                            break;
                        case "COLOR":
                            this.setColor(currentCommandObject.value); // Миттєва дія
                            break;
                        case "PEN_UP":
                            this.state.isPenDown = false; // Миттєва дія
                            break;
                        case "PEN_DOWN":
                            this.state.isPenDown = true; // Миттєва дія
                            break;
                        case "CLEAR":
                            this.clearScreen(); // Миттєва дія
                            break;
                        case "REPEAT":
                            // Розгортаємо команди циклу в основну чергу
                            const expandedCommands = [];
                            for (let k = 0; k < currentCommandObject.count; k++) {
                                // Важливо: копіюємо команди, щоб кожна ітерація мала свій стан анімації
                                expandedCommands.push(...JSON.parse(JSON.stringify(currentCommandObject.commands)));
                            }
                            // Замінюємо команду REPEAT на розгорнуті команди
                            this.commandQueue.splice(this.currentCommandIndex, 1, ...expandedCommands);
                            commandDone = false; // Команда REPEAT сама по собі не виконується, обробка переходить до першої розгорнутої
                            // Не інкрементуємо індекс, наступний крок обробить першу команду з expandedCommands
                            break;
                        default:
                            // Це не мало б статись, якщо парсер працює вірно
                            console.error("Unknown command type in queue:", currentCommandObject);
                            commandDone = true; // Пропускаємо невідому команду
                    }

                    // Оновлюємо візуальний стан Равлика (позиція, кут)
                    this.updateRavlykVisualState();

                    // Якщо команда завершила свою дію (або була миттєвою)
                    if (commandDone) {
                         // Переходимо до наступної команди в черзі
                        this.currentCommandIndex++;
                    }

                    // Плануємо обробку наступного кадру
                    this.animationFrameId = requestAnimationFrame(processNextCommand);

                } catch (err) {
                    // Обробка помилок під час виконання
                    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
                    this.isExecuting = false;
                    this.commandIndicatorUpdater(null, -1);
                    console.error("Error during command execution:", err);
                    reject(err); // Перекидаємо помилку в main.js
                }
            };
            // Запускаємо перший кадр анімації/виконання
            this.animationFrameId = requestAnimationFrame(processNextCommand);
        });
    }

    // Анімація руху
    animateMove(commandObject, totalDistance, deltaTime) {
        // Якщо анімація вимкнена або час нескінченний, виконуємо миттєво
        if (!this.config.animationEnabled || deltaTime === Infinity || this.config.moveSpeed <= 0) {
            this._performMove(totalDistance);
            delete commandObject.remainingDistance; // Очищення стану
            return true; // Завершено
        }

        // Ініціалізація стану анімації для цієї команди
        if (typeof commandObject.remainingDistance === 'undefined') {
            commandObject.remainingDistance = totalDistance;
        }

        const direction = Math.sign(commandObject.remainingDistance);
        // Відстань для поточного кадру, обмежена максимальною швидкістю
        const distanceThisFrame = Math.min(
            Math.abs(commandObject.remainingDistance), // Не більше, ніж залишилося
            this.config.moveSpeed * deltaTime          // Не швидше, ніж дозволено
        ) * direction;

        this._performMove(distanceThisFrame);
        commandObject.remainingDistance -= distanceThisFrame;

        // Перевірка, чи залишилась ще відстань (з урахуванням можливої похибки float)
        if (Math.abs(commandObject.remainingDistance) < 1e-6) {
            delete commandObject.remainingDistance; // Очищення стану
            return true; // Завершено
        } else {
            return false; // Ще рухаємось
        }
    }

    // Внутрішній метод для фактичного переміщення та малювання
    _performMove(distance) {
        const oldX = this.state.x;
        const oldY = this.state.y;
        const radians = (this.state.angle * Math.PI) / 180;

        let newX = oldX + distance * Math.cos(radians);
        let newY = oldY + distance * Math.sin(radians);

        // Перевірка та обмеження межами полотна
        const boundedX = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(newX, this.canvas.width - CANVAS_BOUNDARY_PADDING));
        const boundedY = Math.max(CANVAS_BOUNDARY_PADDING, Math.min(newY, this.canvas.height - CANVAS_BOUNDARY_PADDING));

        // Якщо позиція намагається вийти за межі полотна
        if (newX !== boundedX || newY !== boundedY) {
            // Зупиняємо виконання і виводимо повідомлення про помилку
            throw new RavlykError("CANVAS_OUT_OF_BOUNDS");
        }

        this.state.x = newX;
        this.state.y = newY;


        // Малювання, якщо олівець опущено
        if (this.state.isPenDown) {
            this.ctx.beginPath();
            this.ctx.moveTo(oldX, oldY);
            if (this.state.isRainbow) {
                // Зміна відтінку веселки залежно від пройденої відстані
                this.state.rainbowHue = (this.state.rainbowHue + Math.abs(distance) * 0.5) % 360;
                if (this.state.rainbowHue < 0) this.state.rainbowHue += 360;
                this.applyContextSettings(); // Оновлюємо колір лінії
            }
            this.ctx.lineTo(this.state.x, this.state.y);
            this.ctx.stroke();
        }
    }

    // Анімація повороту
    animateTurn(commandObject, totalAngle, deltaTime) {
        if (!this.config.animationEnabled || deltaTime === Infinity || this.config.turnSpeed <= 0) {
            this._performTurn(totalAngle);
            delete commandObject.remainingAngle;
            return true; // Завершено
        }

        if (typeof commandObject.remainingAngle === 'undefined') {
            commandObject.remainingAngle = totalAngle;
        }

        const direction = Math.sign(commandObject.remainingAngle);
        const angleThisFrame = Math.min(
            Math.abs(commandObject.remainingAngle),
            this.config.turnSpeed * deltaTime
        ) * direction;

        this._performTurn(angleThisFrame);
        commandObject.remainingAngle -= angleThisFrame;

        if (Math.abs(commandObject.remainingAngle) < 1e-6) {
            delete commandObject.remainingAngle;
            return true; // Завершено
        } else {
            return false; // Ще повертаємось
        }
    }

    // Внутрішній метод для фактичного повороту
    _performTurn(angle) {
        this.state.angle = (this.state.angle + angle) % 360;
        // Нормалізація кута до діапазону [0, 360)
        if (this.state.angle < 0) this.state.angle += 360;
    }

    // Встановлення кольору
    setColor(colorName) {
        // colorName вже має бути перевірений та в нижньому регістрі з parseTokens
        if (COLOR_MAP[colorName] === "RAINBOW") {
            this.state.isRainbow = true;
            // Можна встановити початковий відтінок веселки, якщо потрібно
            // this.state.rainbowHue = 0;
        } else {
            this.state.isRainbow = false;
            this.state.color = COLOR_MAP[colorName];
        }
        this.applyContextSettings(); // Застосовуємо новий колір до контексту
    }

    // Очищення полотна
    clearScreen() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Обробка зміни розміру полотна (викликається ззовні)
    handleCanvasResize() {
        // Просто оновлюємо візуальний стан, щоб спрайт був на правильному місці
        // відносно нового розміру/положення canvas
        this.updateRavlykVisualState(true);
    }

    // Метод для запиту на зупинку виконання
    stopExecution() {
        this.shouldStop = true; // Встановлюємо прапорець
        // Фактична зупинка відбудеться в циклі processNextCommand
        console.log("Stop execution requested.");
    }
}