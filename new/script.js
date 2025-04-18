const canvas = document.getElementById("ravlyk-canvas");

// Перевірка підтримки Canvas API
if (!canvas || !canvas.getContext) {
  alert('Ваш браузер не підтримує Canvas. Будь ласка, оновіть браузер або спробуйте інший.');
}

const ctx = canvas.getContext("2d");

// Перевірка контексту
if (!ctx) {
  alert('Проблема з ініціалізацією Canvas. Будь ласка, оновіть браузер або спробуйте інший.');
}

const codeEditor = document.getElementById("code-editor");
const runBtn = document.getElementById("run-btn");
const clearBtn = document.getElementById("clear-btn");
const exampleBlocks = document.querySelectorAll(".example-block");
const colorButtons = document.querySelectorAll(".color-btn");

// Глобальна карта кольорів для уникнення дублювання
const COLOR_MAP = {
  червоний: "#FF0000",
  зелений: "#00FF00",
  синій: "#0000FF",
  чорний: "#000000",
  жовтий: "#FFFF00",
  жовтогарячий: "#FFA500",
  оранжевий: "#FFA500",
  фіолетовий: "#800080",
  рожевий: "#FFC0CB",
  коричневий: "#A52A2A",
  білий: "#FFFFFF",
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

// Зворотня карта кольорів для отримання українських назв
const COLOR_NAMES = {
  black: "чорний",
  red: "червоний",
  blue: "синій",
  green: "зелений",
  orange: "жовтогарячий",
  purple: "фіолетовий", 
  pink: "рожевий",
  yellow: "жовтий",
};

// Функція для правильного розміру полотна та переналаштування позиції равлика
function resizeCanvas() {
  const canvasBox = canvas.parentElement;
  canvas.width = canvasBox.clientWidth;
  canvas.height = canvasBox.clientHeight;
  if (canvas.height < 200) {
    canvas.height = 200;
  }
  if (window.interpreter) {
    window.interpreter.reset();
  }
}

// Викликаємо resizeCanvas при завантаженні та зміні розміру вікна
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);

// Функція для показу повідомлень про помилки
function showError(message) {
  // Видаляємо попередні повідомлення про помилки
  const existingErrors = document.querySelectorAll(".error-message");
  existingErrors.forEach((err) => err.remove());

  const errorDiv = document.createElement("div");
  errorDiv.className = "error-message";
  
  // Додаємо кнопку закриття і текст помилки
  errorDiv.innerHTML = `
    <span class="error-text">❗️ ${message}</span>
    <button class="error-close-btn">✖</button>
  `;
  
  const canvasContainer = document.querySelector(".canvas-box");
  canvasContainer.prepend(errorDiv);
  
  // Додаємо звуковий сигнал для кращого зворотного зв'язку
  const audio = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
  audio.play().catch(e => {});
  
  // Додаємо обробник події для кнопки закриття
  const closeBtn = errorDiv.querySelector(".error-close-btn");
  closeBtn.addEventListener("click", () => {
    errorDiv.remove();
  });
}

// Довідка-команди (модальне вікно)
function showHelpModal() {
  if (document.getElementById('help-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'help-modal';
  modal.className = 'help-modal';
  modal.innerHTML = `
    <div class="help-content">
      <h2>Довідка: Команди Равлика</h2>
      <ul>
        <li><b>вперед N</b> — рух вперед на N кроків</li>
        <li><b>назад N</b> — рух назад на N кроків</li>
        <li><b>ліворуч N</b> — повернути ліворуч на N градусів</li>
        <li><b>праворуч N</b> — повернути праворуч на N градусів</li>
        <li><b>колір [назва]</b> — змінити колір</li>
        <li><b>підняти</b> — підняти равлика</li>
        <li><b>опустити</b> — опустити равлика</li>
        <li><b>очистити</b> — очистити малюнок</li>
        <li><b>повторити N ( ... )</b> — повторити команди N разів</li>
      </ul>
      <button id="close-help" class="main-btn">Закрити</button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-help').onclick = () => modal.remove();
}

class RavlykInterpreter {
  constructor(context, canvas) {
    this.ctx = context;
    this.canvas = canvas;
    this.createRavlyk();
    this.reset();
  }

  // Створення елемента равлика
  createRavlyk() {
    // Видалити попередній равлик, якщо він існує
    if (this.ravlyk) {
      this.ravlyk.remove();
    }

    this.ravlyk = document.createElement("div");
    this.ravlyk.className = "ravlyk";
    document.body.appendChild(this.ravlyk); // Додаємо до body для уникнення проблем з позиціонуванням

    // Явно встановлюємо стилі для равлика
    this.ravlyk.style.position = "absolute";
    this.ravlyk.style.width = "40px";
    this.ravlyk.style.height = "40px";
    this.ravlyk.style.backgroundColor = "transparent";
    this.ravlyk.style.backgroundImage =
      'url(\'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><polygon points="50,15 15,85 85,85" fill="%234a6fa5"/></svg>\')';
    this.ravlyk.style.backgroundSize = "contain";
    this.ravlyk.style.backgroundRepeat = "no-repeat";
    this.ravlyk.style.transformOrigin = "center center";
    this.ravlyk.style.zIndex = "10000000";
    this.ravlyk.style.pointerEvents = "none";

    this.updateRavlykPosition();
  }

  // Токенізація команд
  tokenize(str) {
    // Покращена токенізація з урахуванням дужок
    const rawTokens = str.match(/\S+|\(|\)/g) || [];
    return rawTokens.filter((token) => token.trim() !== "");
  }

  // Виконання токенів команд
  executeTokens(tokens, depth = 0) {
    // Обмеження глибини рекурсії для запобігання переповнення стеку
    const MAX_RECURSION_DEPTH = 20;
    if (depth > MAX_RECURSION_DEPTH) {
      showError(`Занадто багато вкладених команд "повторити" (максимум ${MAX_RECURSION_DEPTH}).`);
      return;
    }

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i].toLowerCase();

      try {
        if (token === "повторити" || token === "повтори" || token === "repeat") {
          // Перевірка, чи наступний токен - число
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError("Помилка в повторі: очікується число");
            return;
          }

          // Обмеження кількості повторень для запобігання зависання
          const MAX_REPEATS = 1000;
          const count = Math.min(parseInt(tokens[i + 1]), MAX_REPEATS);
          if (parseInt(tokens[i + 1]) > MAX_REPEATS) {
            showError(`Занадто багато повторень (максимум ${MAX_REPEATS}). Буде виконано ${MAX_REPEATS} повторень.`);
          }
          i += 2;

          // Перевірка відкриваючої дужки
          if (i >= tokens.length || tokens[i] !== "(") {
            showError('Помилка в повторі: очікується "("');
            return;
          }
          i++;

          // Збір команд всередині дужок
          let subTokens = [];
          let openParenCount = 1;

          while (i < tokens.length) {
            if (tokens[i] === "(") {
              openParenCount++;
            } else if (tokens[i] === ")") {
              openParenCount--;
              if (openParenCount === 0) break;
            }
            subTokens.push(tokens[i]);
            i++;
          }

          // Перевірка закриваючої дужки
          if (i >= tokens.length || tokens[i] !== ")") {
            showError('Помилка в повторі: не знайдено ")"');
            return;
          }
          i++;

          // Виконання команд всередині повторення
          for (let j = 0; j < count; j++) {
            this.executeTokens(subTokens, depth + 1);
          }
        } else if (token === "вперед" || token === "forward") {
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError(`Не вказано відстань для команди "${token}"`);
            i++;
            continue;
          }
          const distance = parseInt(tokens[i + 1]);
          this.forward(distance);
          i += 2;
        } else if (token === "назад" || token === "backward") {
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError(`Не вказано відстань для команди "${token}"`);
            i++;
            continue;
          }
          const distance = parseInt(tokens[i + 1]);
          this.backward(distance);
          i += 2;
        } else if (token === "праворуч" || token === "right") {
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError(`Не вказано кут для команди "${token}"`);
            i++;
            continue;
          }
          const angle = parseInt(tokens[i + 1]);
          this.right(angle);
          i += 2;
        } else if (token === "ліворуч" || token === "left") {
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError(`Не вказано кут для команди "${token}"`);
            i++;
            continue;
          }
          const angle = parseInt(tokens[i + 1]);
          this.left(angle);
          i += 2;
        } else if (token === "колір" || token === "color") {
          if (i + 1 >= tokens.length) {
            showError(`Не вказано колір для команди "${token}"`);
            i++;
            continue;
          }
          const colorName = tokens[i + 1];
          this.setColor(colorName);
          i += 2;
        } else if (token === "підняти" || token === "penup") {
          this.penUp();
          i++;
        } else if (token === "опустити" || token === "pendown") {
          this.penDown();
          i++;
        } else if (token === "очистити" || token === "clear") {
          this.clear();
          i++;
        } else {
          showError(`Не розумію команду: ${tokens[i]}`);
          i++;
        }
      } catch (error) {
        showError(`Помилка виконання: ${error.message}`);
        i++;
      }
    }
  }

  // Виконання рядка команд
  executeCommands(commands) {
    const tokens = this.tokenize(commands);
    this.executeTokens(tokens);
  }

  // Скидання стану равлика та полотна
  reset() {
    this.x = this.canvas.width / 2;
    this.y = this.canvas.height / 2;
    this.angle = -90; // Початковий кут - вгору
    this.isPenDown = true;
    this.color = "#000000";
    this.penSize = 3;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = this.color;
    this.ctx.lineWidth = this.penSize;
    this.ctx.lineCap = "round";
    this.updateRavlykPosition();
  }

  // Оновлення позиції равлика на екрані
  updateRavlykPosition() {
    if (!this.ravlyk) return;

    const canvasRect = this.canvas.getBoundingClientRect();
    const ravlykSize = 40;

    // Позиціонування равлика відносно вікна (абсолютні координати)
    this.ravlyk.style.left =
      canvasRect.left + window.scrollX + this.x - ravlykSize / 2 + "px";
    this.ravlyk.style.top =
      canvasRect.top + window.scrollY + this.y - ravlykSize / 2 + "px";
    this.ravlyk.style.transform = `rotate(${this.angle + 90}deg)`;
  }

  // Рух вперед
  forward(distance) {
    const radians = (this.angle * Math.PI) / 180;
    const newX = this.x + distance * Math.cos(radians);
    const newY = this.y + distance * Math.sin(radians);

    // Перевірка, чи нова позиція знаходиться в межах полотна
    const padding = 10; // Відступ від краю
    if (newX < padding || newX > this.canvas.width - padding || 
        newY < padding || newY > this.canvas.height - padding) {
      // Варіант 1: Зупиняти равлика і показувати повідомлення
      showError("Равлик не може вийти за межі поля!");
      return; // Зупиняємо рух

      // Варіант 2: Розширити полотно
      // this.expandCanvas(newX, newY);
    }

    if (this.isPenDown) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.x, this.y);
      this.ctx.lineTo(newX, newY);
      this.ctx.stroke();
    }

    this.x = newX;
    this.y = newY;
    this.updateRavlykPosition();
  }

  // Рух назад
  backward(distance) {
    this.forward(-distance);
  }

  // Поворот праворуч
  right(angle) {
    this.angle += angle;
    this.updateRavlykPosition();
  }

  // Поворот ліворуч
  left(angle) {
    this.angle -= angle;
    this.updateRavlykPosition();
  }

  // Встановлення кольору лінії
  setColor(colorStr) {
    const color = COLOR_MAP[colorStr.toLowerCase()];
    if (color) {
      this.color = color;
      this.ctx.strokeStyle = color;
    } else {
      showError(`Невідомий колір: ${colorStr}`);
    }
  }
  
  // Підняти олівець
  penUp() {
    this.isPenDown = false;
  }
  
  // Опустити олівець
  penDown() {
    this.isPenDown = true;
  }
  
  // Очистити полотно
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Розширення полотна при досягненні равликом меж
  expandCanvas(newX, newY) {
    // Обмеження максимального розміру для запобігання проблем з продуктивністю
    const MAX_CANVAS_SIZE = 3000; // пікселів
    const padding = 50; // Додатковий простір
    let newWidth = this.canvas.width;
    let newHeight = this.canvas.height;
    let needResize = false;
    let needRepositioning = false;

    // Перевірка і розширення по горизонталі
    if (newX < padding) {
      const diff = padding - newX;
      newWidth += diff + padding;
      this.x += diff + padding;
      needResize = true;
      needRepositioning = true;
    } else if (newX > this.canvas.width - padding) {
      newWidth = Math.min(newX + padding * 2, MAX_CANVAS_SIZE);
      needResize = true;
    }

    // Перевірка і розширення по вертикалі
    if (newY < padding) {
      const diff = padding - newY;
      newHeight += diff + padding;
      this.y += diff + padding;
      needResize = true;
      needRepositioning = true;
    } else if (newY > this.canvas.height - padding) {
      newHeight = Math.min(newY + padding * 2, MAX_CANVAS_SIZE);
      needResize = true;
    }

    // Якщо потрібно розширити полотно
    if (needResize) {
      // Перевірка обмежень розміру
      if (newWidth >= MAX_CANVAS_SIZE || newHeight >= MAX_CANVAS_SIZE) {
        showError(`Досягнуто максимального розміру полотна (${MAX_CANVAS_SIZE}x${MAX_CANVAS_SIZE} пікселів).`);
        return false;
      }
      
      try {
        // Зберігаємо поточне зображення
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Змінюємо розмір полотна
        this.canvas.width = newWidth;
        this.canvas.height = newHeight;
        
        // Відновлюємо налаштування контексту, які скидаються при зміні розміру
        this.ctx.strokeStyle = this.color;
        this.ctx.lineWidth = this.penSize;
        this.ctx.lineCap = "round";

        // Відновлюємо зображення
        this.ctx.putImageData(imageData, needRepositioning ? padding : 0, needRepositioning ? padding : 0);
        
        return true;
      } catch (error) {
        showError('Помилка при розширенні полотна: ' + error.message);
        return false;
      }
    }
    
    return true; // Розширення не потрібне або успішно виконане
  }
}

// Ініціалізація інтерпретатора
let interpreter;
let appInitialized = false;

// Функція для збереження малюнка
function saveDrawing() {
  try {
    // Створюємо тимчасовий канвас, щоб зберегти малюнок без равлика
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    // Копіюємо зображення з основного канвасу
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    try {
      tempCtx.drawImage(canvas, 0, 0);
    } catch (e) {
      showError('Помилка при копіюванні малюнка: ' + e.message);
      return;
    }
    
    // Створюємо посилання для скачування
    const link = document.createElement('a');
    link.download = 'ravlyk-малюнок.png';
    
    // Конвертуємо канвас в URL даних (може спричинити помилки CORS)
    try {
      link.href = tempCanvas.toDataURL('image/png');
    } catch (e) {
      if (e.name === 'SecurityError') {
        showError('Помилка безпеки: неможливо зберегти малюнок через обмеження браузера.');
      } else {
        showError('Помилка при збереженні: ' + e.message);
      }
      return;
    }
    
    // Додаємо посилання до документа, клікаємо по ньому і видаляємо
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Показуємо повідомлення про успішне збереження
    showSuccessMessage('Малюнок збережено!');
  } catch (error) {
    // Якщо виникла помилка, показуємо повідомлення про це
    showError('Не вдалося зберегти малюнок: ' + error.message);
  }
}

// Функція для показу повідомлення про успіх
function showSuccessMessage(message) {
  // Видаляємо попередні повідомлення
  const existingMessages = document.querySelectorAll(".success-message");
  existingMessages.forEach((msg) => msg.remove());

  const messageDiv = document.createElement("div");
  messageDiv.className = "success-message";
  
  // Додаємо текст повідомлення і кнопку закриття
  messageDiv.innerHTML = `
    <span class="success-text">✅ ${message}</span>
    <button class="success-close-btn">✖</button>
  `;
  
  const canvasContainer = document.querySelector(".canvas-box");
  canvasContainer.prepend(messageDiv);
  
  // Додаємо обробник події для кнопки закриття
  const closeBtn = messageDiv.querySelector(".success-close-btn");
  closeBtn.addEventListener("click", () => {
    messageDiv.remove();
  });
}

// Функція для ініціалізації після завантаження DOM
function initializeApp() {
  if (appInitialized) return;
  appInitialized = true;
  
  interpreter = new RavlykInterpreter(ctx, canvas);
  window.interpreter = interpreter;

  // Запуск коду
  function runCode() {
    try {
      const code = codeEditor.value;
      
      // Перевірка на занадто довгий код
      if (code.length > 10000) {
        showError("Код занадто довгий. Максимальна довжина - 10000 символів.");
        return;
      }
      
      // Захист від зависання - встановлюємо таймаут виконання
      let executionTimeout;
      const maxExecutionTime = 5000; // 5 секунд
      
      const timeoutPromise = new Promise((_, reject) => {
        executionTimeout = setTimeout(() => {
          reject(new Error("Виконання програми зайняло занадто багато часу (більше 5 секунд)"));
        }, maxExecutionTime);
      });
      
      const executionPromise = new Promise((resolve) => {
        interpreter.reset();
        const commands = code
          .split("\n")
          .filter((line) => line.trim() !== "")
          .join(" ");
        interpreter.executeCommands(commands);
        resolve();
      });
      
      // Використовуємо Promise.race для обмеження часу виконання
      Promise.race([executionPromise, timeoutPromise])
        .then(() => {
          clearTimeout(executionTimeout);
        })
        .catch((error) => {
          clearTimeout(executionTimeout);
          interpreter.reset();
          showError(error.message);
        });
    } catch (error) {
      showError("Помилка при запуску коду: " + error.message);
    }
  }

  // Встановлення обробників подій
  runBtn.addEventListener("click", runCode);

  // Додаємо можливість запуску коду по натисненню Enter з Ctrl/Shift
  codeEditor.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && (e.ctrlKey || e.shiftKey)) {
      e.preventDefault(); // Запобігаємо стандартній дії (новий рядок)
      runCode();
    }
  });

  clearBtn.addEventListener("click", () => {
    codeEditor.value = "";
    interpreter.reset();
  });

  // Додаємо обробник події для кнопки збереження
  const saveBtn = document.getElementById('save-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveDrawing);
  }

  // Визначаємо, чи є кнопка допомоги
  const helpBtn = document.getElementById('help-btn');
  if (helpBtn) {
    helpBtn.addEventListener('click', showHelpModal);
  }

  // Обробники подій для прикладів
  exampleBlocks.forEach((block) => {
    // Додаємо візуальну підказку, що приклад клікабельний
    block.style.cursor = "pointer";
    block.title = "Натисни, щоб спробувати цей приклад";
    
    block.addEventListener("click", () => {
      codeEditor.value = block.getAttribute("data-code");
      runCode();
    });
  });

  colorButtons.forEach((btn) => {
    // Додаємо заголовки (tooltips) для кнопок кольорів
    const color = btn.getAttribute("data-color");
    if (COLOR_NAMES[color]) {
      btn.title = COLOR_NAMES[color];
    }
    
    btn.addEventListener("click", () => {
      colorButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      const color = btn.getAttribute("data-color");
      const colorName = COLOR_NAMES[color];

      interpreter.setColor(color);

      // Додавання команди кольору до редактора, якщо там є код
      if (codeEditor.value.trim() !== "") {
        // Перевіряємо, чи код уже починається з команди зміни кольору
        if (
          !codeEditor.value.trim().toLowerCase().startsWith("колір") &&
          !codeEditor.value.trim().toLowerCase().startsWith("color")
        ) {
          codeEditor.value = `колір ${colorName}\n` + codeEditor.value;
        }
      }
    });
  });

  // Ресайз полотна при ініціалізації
  resizeCanvas();
}

// Запуск ініціалізації після завантаження сторінки
document.addEventListener("DOMContentLoaded", initializeApp);

// Безпосередній запуск ініціалізації додатково, для гарантії
// якщо DOMContentLoaded вже відбувся
if (
  document.readyState === "complete" ||
  document.readyState === "interactive"
) {
  setTimeout(initializeApp, 1);
}