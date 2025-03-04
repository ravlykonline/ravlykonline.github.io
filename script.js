const canvas = document.getElementById("ravlyk-canvas");
const ctx = canvas.getContext("2d");
const codeEditor = document.getElementById("code-editor");
const runBtn = document.getElementById("run-btn");
const clearBtn = document.getElementById("clear-btn");
const exampleBlocks = document.querySelectorAll(".example-block");
const colorButtons = document.querySelectorAll(".color-btn");

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
  errorDiv.textContent = message;
  const canvasContainer = document.querySelector(".canvas-box");
  canvasContainer.prepend(errorDiv);
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
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
  executeTokens(tokens) {
    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i].toLowerCase();

      try {
        if (token === "повтори" || token === "repeat") {
          // Перевірка, чи наступний токен - число
          if (i + 1 >= tokens.length || isNaN(parseInt(tokens[i + 1]))) {
            showError("Помилка в повторі: очікується число");
            return;
          }

          const count = parseInt(tokens[i + 1]);
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
            this.executeTokens(subTokens);
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
    const colorMap = {
      червоний: "#FF0000",
      зелений: "#00FF00",
      синій: "#0000FF",
      чорний: "#000000",
      жовтий: "#FFFF00",
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

    const color = colorMap[colorStr.toLowerCase()];
    if (color) {
      this.color = color;
      this.ctx.strokeStyle = color;
    } else {
      showError(`Невідомий колір: ${colorStr}`);
    }
  }
}

// Ініціалізація інтерпретатора
let interpreter;

// Функція для ініціалізації після завантаження DOM
function initializeApp() {
  interpreter = new RavlykInterpreter(ctx, canvas);
  window.interpreter = interpreter;

  // Запуск коду
  function runCode() {
    const code = codeEditor.value;
    interpreter.reset();
    const commands = code
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join(" ");
    interpreter.executeCommands(commands);
  }

  // Встановлення обробників подій
  runBtn.addEventListener("click", runCode);

  clearBtn.addEventListener("click", () => {
    codeEditor.value = "";
    interpreter.reset();
  });

  exampleBlocks.forEach((block) => {
    block.addEventListener("click", () => {
      codeEditor.value = block.getAttribute("data-code");
      runCode();
    });
  });

  colorButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      colorButtons.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      const color = btn.getAttribute("data-color");
      const colorNames = {
        black: "чорний",
        red: "червоний",
        blue: "синій",
        green: "зелений",
        orange: "оранжевий",
        purple: "фіолетовий",
        pink: "рожевий",
        yellow: "жовтий",
      };

      interpreter.setColor(color);

      // Додавання команди кольору до редактора, якщо там є код
      if (codeEditor.value.trim() !== "") {
        const colorName = colorNames[color];
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
