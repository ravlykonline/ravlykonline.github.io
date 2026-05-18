# Равлик-мандрівник

Браузерна навчальна гра для дітей молодшої школи. Дитина керує Равликом, збирає яблука, підходить до звірів, виконує короткі завдання й отримує зірочки.

Гра задумана як проста урокова активність: без реєстрації, без серверної частини, без збору персональних даних і без збереження прогресу між відкриттями сторінки.

---

## 1. Коротко про продукт

### Для кого

- Основна аудиторія: діти 5–7 років, зокрема дошкільнята та учні 1 класу.
- Додаткова аудиторія: учні 1–2 класу, вчителі, батьки, діти з різними потребами доступності.
- Середовище використання: шкільні комп'ютери, інтерактивні панелі, планшети, домашній браузер.

### Ігрова ідея

1. Равлик рухається світом.
2. Дитина збирає яблука.
3. Равлик зустрічає звірів.
4. Кожен звір дає навчальне завдання.
5. За виконане завдання Равлик отримує зірочку.
6. Мета сесії — зібрати більше яблук і допомогти більшій кількості звірів.

Поточний баланс після дитячого тестування: **28 звірів**, **42 яблука**, **88 перешкод**, світ `4200×4200px`.

### Важлива політика

Гра є **сесійною**.

Це означає:

- після перезавантаження сторінки починається нова гра;
- після закриття вкладки й відкриття сайту знову гра починається з нуля;
- прогрес дитини не зберігається між сесіями;
- не можна додавати автозбереження прогресу без окремого рішення.

Причина: на одному шкільному комп'ютері можуть грати різні діти. Сайт не має показувати наступній дитині результати попередньої.

---

## 2. Поточний стек

Проєкт навмисно простий:

- HTML;
- CSS;
- vanilla JavaScript;
- ES-модулі;
- DOM-based rendering;
- Service Worker для PWA;
- без фреймворків;
- без обов'язкового build-step;
- без серверної частини.

Цей стек обрано, тому що він:

- легко хоститься на GitHub Pages, Cloudflare Pages або будь-якому статичному хостингу;
- не прив'язує проєкт до конкретного вендора;
- зрозумілий для аудиту;
- добре підходить для невеликої навчальної гри;
- дозволяє підтримувати доступність краще, ніж canvas-only підхід.

---

## 3. Структура проєкту

```txt
.
├── index.html
├── style.css
├── tokens.css
├── manifest.json
├── offline.html
├── sw.js
├── js/
│   └── frame-guard.js
├── css/
│   └── offline.css
├── icons/
├── js/
│   ├── main.js
│   ├── app/
│   │   └── bootstrap.js
│   ├── core/
│   │   ├── announcer.js
│   │   ├── audio-context.js
│   │   ├── config.js
│   │   ├── dom.js
│   │   ├── event-bus.js
│   │   ├── input.js
│   │   └── motion.js
│   ├── game/
│   │   ├── level-data.js
│   │   ├── rules.js
│   │   └── task-picker.js
│   ├── i18n/
│   │   ├── index.js
│   │   └── uk.js
│   ├── pwa/
│   │   └── register-sw.js
│   ├── scenes/
│   │   ├── dialog-scene.js
│   │   ├── game-scene.js
│   │   ├── intro-scene.js
│   │   ├── modal-scene.js
│   │   ├── pause-scene.js
│   │   ├── scene-manager.js
│   │   └── win-scene.js
│   ├── systems/
│   │   └── score-system.js
│   ├── tasks/
│   │   ├── task-catalog.js
│   │   ├── task-registry.js
│   │   ├── task-ui-helpers.js
│   │   ├── task-data/
│   │   └── task-types/
│   └── ui/
│       ├── font-mode.js
│       ├── hud-controller.js
│       ├── joystick.js
│       ├── music-controller.js
│       └── theme-mode.js
└── tests/
```

---

## 4. Як запустити локально

Через ES-модулі сторінку бажано запускати через локальний сервер, а не відкривати `index.html` напряму з файлової системи.

### Варіант 1: Python

```bash
python -m http.server 8080
```

Відкрити:

```txt
http://localhost:8080/
```

### Варіант 2: Node.js

```bash
npx serve .
```

або:

```bash
npx http-server .
```

---

## 5. Як гра запускається

Основний шлях запуску:

```txt
index.html
  -> js/frame-guard.js (синхронний — перевірка iframe)
  -> js/main.js
    -> bootGame() з js/app/bootstrap.js
      -> ініціалізація DOM, Input, HUD, теми, шрифту, ScoreSystem
      -> MusicController.init({dom}), Joystick.init()
      -> підписка на game:won → pushes WinScene
      -> SceneManager.push(IntroScene)
      -> після старту IntroScene: MusicController.start(), потім GameScene
```

Основний цикл із delta time:

```js
let lastTimestamp = 0;
function gameLoop(timestamp) {
    const deltaMs = lastTimestamp === 0 ? 16.667 : Math.min(timestamp - lastTimestamp, 50);
    lastTimestamp = timestamp;
    SceneManager.update(deltaMs);
    SceneManager.render();
    requestAnimationFrame(gameLoop);
}
```

У кожному кадрі активна сцена оновлюється й рендериться через `SceneManager`. `deltaMs` забезпечує незалежність від частоти кадрів.

---

## 6. Основні модулі

### `js/scenes/game-scene.js`

Поточна головна ігрова сцена. Відповідає за світ, рух Равлика, яблука, NPC, камеру, колізії й взаємодію.

Важливо: цей файл уже має тенденцію до розростання. Нову складну логіку бажано виносити в окремі модулі, а не додавати всередину `GameScene`.

### `js/tasks/task-registry.js`

Створює завдання через `TaskCatalog` і делегує рендер конкретному `task-type`.

### `js/tasks/task-catalog.js`

Реєструє JSON-категорії завдань і повертає конкретні task entries для сесії.

### `js/tasks/task-data/`

Data-driven задачі. Поточні категорії лежать у `js/tasks/task-data/categories/*.json`.

### `js/tasks/task-types/`

Окремі модулі типів завдань. Кожен тип зараз має власні `createTask` і `render`; зокрема тут живе `magic-square` для сіток із фігурами або емодзі.

### `js/systems/score-system.js`

Рахує яблука й зірочки на основі подій.

### `js/ui/hud-controller.js`

Керує HUD-панеллю. Завжди-видима topbar містить лічильники яблук і зірочок та кнопки-налаштування (шрифт, тема, музика, пауза). Нижче — рядок NPC-badge (показується тільки коли гравець поруч зі звіром). Деталізована частина (ціль, контекст) розгортається/згортається. `expandTemporarily(ms)` автоматично розгортає панель на старті гри й через 2 секунди згортає — показує гравцеві, що всередині є інформація.

### `js/core/audio-context.js`

Синглтон спільного `AudioContext`. Надає `getSharedAudioContext()` і `resumeSharedAudioContext()`. Усі модулі, що потребують Web Audio API, використовують цей спільний контекст.

### `js/ui/music-controller.js`

Процедурна фонова музика через Web Audio API. Пентатонічний арпеджіо (C D E G A), sine-хвилі, без аудіо-файлів. API: `init({dom})`, `start()`, `toggle()`, `isMuted()`, `destroy()`.

### `js/ui/joystick.js`

Віртуальний джойстик для сенсорних пристроїв (`pointer: coarse`). Активується лише на touch-екранах, з'являється в точці дотику. Dead zone 8px, outer radius 52px. `getIntent()` повертає нормалізований `{x, y}`.

### `js/scenes/win-scene.js`

Екран перемоги. Розширює `ModalScene`. Показує статистику сесії (яблука, зірочки), три хвилі зіркового конфетті та кнопку "Грати знову". Викликається через подію `game:won`.

### `js/scenes/pause-scene.js`

Сцена паузи. Розширює `ModalScene`. Показує оверлей паузи та кнопку "Продовжити", яка робить `SceneManager.pop()`. Відкривається по Escape або кнопці ⏸ у HUD.

### `js/frame-guard.js`

Синхронний скрипт frame-busting (без `defer`/`async`). Якщо сторінка відкрита всередині `<iframe>`, негайно перенаправляє `window.top.location` на повну URL гри. Підключений до `index.html` і `offline.html`.

### `js/core/input.js`

Клавіатура, миша, touch-взаємодія, режим клавіатурного курсора.

### `sw.js`

Service Worker для PWA/offline режиму. Поточна версія: **v27**.

---

## 7. Як додати нового звіра

1. Відкрити `js/game/level-data.js`.
2. Додати NPC у масив `LevelData.level1.npcs`.
3. Дати унікальний `id`.
4. Додати `nameKey` у `js/i18n/uk.js`.
5. Вказати `taskPoolIds`.
6. Вказати `distributionGroup`, якщо NPC належить до окремої педагогічної групи розподілу на карті.
7. Перевірити, що така категорія є в `js/tasks/task-data/categories/*.json`.
8. Перевірити, що NPC не стоїть у перешкоді й не перекриває стартову зону.

Приклад:

```js
{
    id: 'owl_1',
    nameKey: 'npc.owlName',
    taskPoolIds: ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner'],
    distributionGroup: 'logic',
    type: 'owl',
    x: 2300,
    y: 1850,
    w: 56,
    h: 56,
    completed: false
}
```

---

## 8. Як додати новий тип завдання

Детальні правила описані в [TASKS.md](TASKS.md).

Коротко:

1. Створити файл у `js/tasks/task-types/`.
2. Додати `type`, `createTask`, `render`.
3. Додати task entries у відповідний `js/tasks/task-data/categories/*.json`.
4. Додати тип у `TaskRegistry`.
5. Додати або оновити категорію в `TaskCatalog`, якщо це новий JSON-файл.
6. Додати тест.
7. Перевірити keyboard/touch-доступність.

---

## 9. Тестування

Поточні тести лежать у `tests/`.

Основні сторінки:

```txt
tests/index.html
tests/integration.html
tests/gameplay-integration.html
tests/encoding-check.html
```

Перед будь-яким злиттям змін потрібно вручну перевірити:

- старт гри;
- рух мишею;
- рух клавіатурою;
- збір яблук;
- взаємодію з NPC;
- правильну відповідь;
- неправильну відповідь;
- отримання зірочки;
- reload сторінки;
- mobile/touch режим;
- reduced motion;
- світлу й темну тему;
- читабельний шрифт;
- PWA-кеш у production.

Детальніше: [TESTING.md](TESTING.md).

---

## 10. PWA та кеш

Проєкт має `manifest.json`, `offline.html` і `sw.js`.

Важливо: Service Worker може показувати стару версію файлів, якщо кеш не оновлено. Під час розробки це часта причина “дивних” багів.

Перед діагностикою UI або JS-проблем:

1. відкрити DevTools;
2. Application;
3. Service Workers;
4. Unregister;
5. Storage;
6. Clear site data;
7. перезавантажити сторінку.

Детальніше: [PWA.md](PWA.md).

Поточна версія Service Worker: **v27**. Список `STATIC_ASSETS` включає всі JS-модулі, CSS-файли, JSON-категорії та нові файли (`audio-context.js`, `music-controller.js`, `joystick.js`, `win-scene.js`, `pause-scene.js`, `frame-guard.js`, `css/offline.css`).

---

## 11. Безпека й приватність

Гра не повинна збирати персональні дані дітей.

Заборонено без окремого рішення:

- додавати логін;
- додавати імена дітей;
- додавати рейтинги;
- надсилати відповіді на сервер;
- підключати аналітику;
- додавати сторонні CDN;
- вставляти iframe;
- зберігати прогрес дитини між сесіями.

Детальніше: [SECURITY.md](SECURITY.md).

---

## 12. Правила для агентів

Якщо над кодом працює Codex, Claude Code або інший агент, першим файлом для читання має бути:

```txt
AGENTS.md
```

Після нього:

```txt
ARCHITECTURE.md
TASKS.md
SECURITY.md
PWA.md
TESTING.md
PROJECT_STANDARDS.md
PROJECT_STATUS_AND_ROADMAP.md
```

---

## 13. Не робити

Не можна:

- повертати проєкт до одного великого `script.js`;
- змішувати дані задач, рендер і перевірку в одному великому файлі;
- додавати збереження прогресу між сесіями;
- додавати залежності без потреби;
- додавати складний drag-and-drop як єдиний спосіб відповіді;
- ламати keyboard navigation;
- вставляти педагогічні тексти через небезпечний HTML;
- ігнорувати Service Worker під час тестування.

---

## 14. Найближчі рекомендовані роботи

1. Розширити інтеграційні тести: reload reset, кілька NPC, відсутність повторної зірки, WinScene trigger.
2. Винести NPC interaction logic з `GameScene` у `npc-system.js`.
3. Поповнювати JSON-категорії задач короткими візуальними прикладами.
4. Додати автоматичний тест на існування всіх `STATIC_ASSETS`.
5. Розглянути вимкнення SW на localhost для зручності розробки.
