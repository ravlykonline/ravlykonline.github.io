# ARCHITECTURE.md — архітектура проєкту «Равлик-мандрівник»

Цей документ описує поточну архітектуру гри, межі відповідальності модулів, правила розширення й бажаний напрям рефакторингу.

Мета документа — зробити так, щоб людина або AI-агент могли працювати над проєктом без руйнування фундаменту.

---

## 1. Архітектурна позиція

Проєкт є статичною браузерною грою без бекенду.

Цей документ стосується саме гри-бродилки в папці `game`. Рефакторинг цього проєкту не має переносити сюди архітектуру AST/parser/runtime середовища з кореня репозиторію, якщо таке рішення не ухвалене окремо.

Продуктова ціль гри: сесійна дослідницька бродилка для дітей 5–7 років. Дитина керує Равликом, досліджує поле, збирає яблука і зустрічає звірів. Звірі дають короткі візуальні завдання, за які дитина отримує зірочки. Якщо завдання не виходить, дитина може закрити діалог і йти далі без покарання.

Кожне нове відкриття або reload починає нову сесію: яблука й завдання можуть бути іншими, прогрес не відновлюється між дітьми.

Основний принцип:

```txt
простий DOM-based застосунок + ES-модулі + data-driven задачі + мінімум залежностей
```

Це не canvas engine, не React-застосунок і не Phaser-проєкт.

Поточний підхід обрано свідомо, тому що гра:

- невелика;
- навчальна;
- має бути доступною;
- має працювати без реєстрації;
- має легко хоститися як статичний сайт;
- має бути зрозумілою для аудиту й підтримки.

---

## 2. Архітектурні принципи

### 2.1 Data-driven там, де можливо

Рівні, NPC, задачі, тексти й налаштування мають описуватися даними, а не жорстко пришиватися до логіки сцени.

Добре:

```js
{
    id: 'mouse_1',
    taskPoolIds: ['visual-logic.beginner', 'counting.beginner'],
    distributionGroup: 'observe'
}
```

Погано:

```js
if (npc.type === 'mouse') {
    showMouseTaskHardcodedInGameScene();
}
```

Кількість і розміщення звірів ідуть через дані рівня та генерацію світу. Гра має три рівні (`LevelData.sequence`); кожен рівень описує власний світ у полі `world` (`worldWidth`, `worldHeight`, `obstacleCount`, `appleCount`, `pearCount`), власний набір NPC і власні банки завдань. Поточна ціль після тестування з дітьми — приблизно 26–30 звірів на рівень: `level1` — 28 звірів, 42 яблука, 88 перешкод; `level2` — 26 звірів, 34 яблука, 16 груш, 104 перешкоди; `level3` — 26 звірів, 30 яблук, 24 груші, 118 перешкод. Усе рівномірно розкидане по полю, без накладання на перешкоди й без недоступних позицій. Для розподілу NPC по карті використовується `distributionGroup`, а не лише перший `taskPoolId`, бо кілька різних педагогічних груп можуть починатися з одного й того самого банку завдань.

### 2.2 `GameScene` не має бути всесвітом

`GameScene` зараз є головним центром гри, але її не можна безкінечно розширювати.

Нова складна логіка має виноситися в окремі модулі:

- генерація світу;
- колізії;
- spawn rules;
- collectible system;
- NPC system;
- camera controller;
- session state;
- task flow.

Пріоритет подальшого рефакторингу — не повертати цю логіку назад у `GameScene`: генерація світу, spawn rules, task data і reward effects мають лишатися окремими модулями.

### 2.3 Сцени керують екранами, системи керують правилами

Сцена відповідає за життєвий цикл екрана.

Система відповідає за конкретне правило або механіку.

Приклад:

```txt
GameScene
  використовує CollectibleSystem
  використовує NpcSystem
  використовує CameraController
  використовує CollisionSystem
```

А не:

```txt
GameScene містить усю логіку предметів, NPC, камери, колізій, завдань і UI.
```

### 2.4 DOM-first, не canvas-first

Світ побудований на DOM-елементах. Це важливо для:

- доступності;
- CSS-адаптації;
- простішого debugging;
- простішого інтеграційного тестування.

Canvas можна додавати лише для декоративних ефектів, якщо вони не містять критичної інформації.

### 2.5 Події для міжсистемної взаємодії

`EventBus` використовується для подій типу:

```txt
item:collected
puzzle:completed
```

Це дозволяє `ScoreSystem` не знати деталей `GameScene`.

Але події не мають перетворитися на хаотичну глобальну магію. Кожна нова подія має бути задокументована.

---

## 3. Поточний життєвий цикл застосунку

```txt
index.html
  -> js/frame-guard.js (синхронний — перевірка iframe)
  -> js/main.js
    -> bootGame()
      -> applyDocumentTranslations()
      -> Announcer.init()
      -> Input.init()
      -> HUDController.init({dom, onPause})
      -> FontModeController.init()
      -> ThemeModeController.init()
      -> ScoreSystem.init()
      -> MusicController.init({dom})
      -> Joystick.init()
      -> підписка на level:completed → LevelCompleteScene (є наступний рівень)
                                       → emit game:won (рівнів більше немає)
      -> підписка на game:won → SceneManager.push(WinScene)
      -> SceneManager.push(IntroScene)
    -> requestAnimationFrame(gameLoop)
```

`gameLoop` з delta time:

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

Активна сцена визначається стеком у `SceneManager`.

---

## 4. Поточні шари

### 4.1 Entry layer

```txt
js/main.js
js/app/bootstrap.js
```

Відповідальність:

- запуск застосунку;
- ініціалізація глобальних контролерів;
- старт першої сцени;
- старт game loop;
- реєстрація Service Worker.

Не додавати сюди бізнес-логіку гри.

---

### 4.2 Core layer

```txt
js/core/announcer.js
js/core/audio-context.js
js/core/config.js
js/core/dom.js
js/core/event-bus.js
js/core/input.js
js/core/motion.js
```

Відповідальність:

- базові утиліти;
- конфігурація;
- доступ до DOM-вузлів;
- input handling;
- оголошення для screen reader;
- прості математичні функції руху;
- event bus.

Core layer не має імпортувати сцени, задачі або UI-контролери.

---

### 4.3 Scene layer

```txt
js/scenes/scene-manager.js
js/scenes/intro-scene.js
js/scenes/game-scene.js
js/scenes/modal-scene.js
js/scenes/dialog-scene.js
js/scenes/pause-scene.js
js/scenes/level-complete-scene.js
js/scenes/win-scene.js
```

Відповідальність:

- екрани;
- життєвий цикл `init/update/render/destroy`;
- пауза й повернення між сценами;
- діалог із завданням.

Правило: сцена може координувати системи, але не повинна ставати сховищем усіх правил.

---

### 4.4 Game layer

```txt
js/game/level-data.js
js/game/rules.js
js/game/task-picker.js
js/game/session-state.js
js/game/world-generator.js
js/game/spawn-rules.js
js/game/distribution-rules.js
js/game/collision-system.js
js/game/collectible-system.js
js/game/camera-system.js
js/game/npc-spawner.js
```

Відповідальність:

- дані рівнів;
- чисті правила гри;
- вибір задач для NPC;
- генерація й розміщення об'єктів у світі;
- чисті функції предметів, камери, колізій.

`collectible-system.js`, `camera-system.js` і `collision-system.js` є набором чистих іменованих функцій (без класів, без `this`) і повністю покриті unit-тестами.

`collision-system.js` надає параметр `margin` (за замовчуванням `BORDER_RADIUS_MARGIN = 6px`), який розширює rect перешкоди при перевірці колізії, запобігаючи зоровому ефекту заїзду на заокруглені CSS-кути.

Можливий майбутній розвиток:

```txt
js/game/npc-system.js
js/game/player-controller.js
```

---

### 4.5 Task layer

```txt
js/tasks/task-registry.js
js/tasks/task-catalog.js
js/tasks/task-ui-helpers.js
js/tasks/task-data/
js/tasks/task-types/
```

Відповідальність:

- створення задач;
- рендер задач;
- перевірка відповідей;
- data-driven варіанти.

Поточна модель:

```txt
TaskRegistry
  -> TaskCatalog
  -> JSON category tasks
  -> taskType.createTask()
  -> taskType.render()
```

Бажана наступна модель:

```txt
taskDefinition
  -> taskValidator
  -> taskRenderer
  -> taskEvaluator
```

Детальніше: [TASKS.md](TASKS.md).

Для цільової аудиторії 5–7 років task layer має віддавати перевагу коротким візуальним задачам: форми, пари, групи предметів, послідовності, силуети, прості закономірності. Довгі текстові умови й складні математичні розв'язки не є основним напрямом цієї гри.

---

### 4.6 Systems layer

```txt
js/systems/score-system.js
```

Відповідальність:

- лічильники;
- реакція на події;
- оновлення HUD через `HUDController`.

Можливі майбутні системи:

```txt
achievement-system.js
session-summary-system.js
apple-effects-system.js
```

---

### 4.7 UI layer

```txt
js/ui/font-mode.js
js/ui/hud-controller.js
js/ui/joystick.js
js/ui/music-controller.js
js/ui/theme-mode.js
```

Відповідальність:

- HUD;
- тема;
- режим читабельного шрифту;
- UI-стани, не пов'язані напряму з фізикою світу.

UI layer не має вирішувати ігрові правила.

---

### 4.8 i18n layer

```txt
js/i18n/index.js
js/i18n/uk.js
```

Відповідальність:

- усі тексти інтерфейсу;
- ключі NPC;
- повідомлення;
- aria-тексти;
- статуси.

Нові тексти не слід розкидати по коду. Вони мають потрапляти в i18n, крім тимчасових dev-only повідомлень.

---

### 4.9 PWA layer

```txt
js/pwa/register-sw.js
js/frame-guard.js
sw.js
manifest.json
offline.html
css/offline.css
```

Відповідальність:

- реєстрація Service Worker;
- кешування статичних файлів;
- offline fallback;
- metadata PWA.

Детальніше: [PWA.md](PWA.md).

---

## 5. Dependency rules

Бажаний напрям залежностей:

```txt
main/app
  -> core
  -> scenes
  -> game
  -> tasks
  -> systems
  -> ui
  -> i18n
```

Заборонені або небажані залежності:

```txt
core -> scenes
core -> tasks
core -> ui
core -> systems

task-data -> DOM
task-data -> SceneManager
task-data -> GameScene

task-types -> GameScene
ui -> GameScene
```

`task-types` можуть працювати з DOM контейнером, який їм передали, але не повинні знати, де цей контейнер живе в застосунку.

---

## 6. Game state

Поточний runtime state частково живе в:

- `GameScene.state`;
- `GameScene.collectibles`;
- `GameScene.obstacles`;
- `GameScene.npcs`;
- `ScoreSystem.apples`;
- `ScoreSystem.pears`;
- `ScoreSystem.stars`;
- `Input.keys`;
- `Input.mouse`;
- `Input.keyboard`.

Поточна сесія вже створюється через явний `SessionState`.

Поточний напрям:

```js
export function createInitialSessionState(levelData) {
    return {
        level: { id, index, nameKey },
        player: {...},
        camera: {...},
        collectibles: [],
        obstacles: [],
        npcs: [],
        score: {
            apples: 0,
            pears: 0,
            stars: 0
        },
        flags: {
            completedNpcIds: new Set()
        },
        debug: {
            seed: null
        }
    };
}
```

Важливо: `SessionState` не означає збереження між reload. Це лише явна структура поточного запуску.

---

## 7. Scene contracts

Кожна сцена може мати такі методи:

```js
init()
pause()
resume()
update()
render()
destroy()
```

Правила:

- `init()` створює DOM або підключає scene-specific listeners;
- `destroy()` має прибирати DOM і listeners, якщо вони додані сценою;
- `update(deltaMs)` отримує час кадру в мілісекундах; `scale = deltaMs / 16.667` використовується для frame-rate independent руху;
- `render()` має бути максимально передбачуваним і не створювати нові listeners.

**Особливість ModalScene і спільного DOM.** `ModalScene`, `IntroScene` та `DialogScene` поділяють один набір DOM-елементів через `js/core/dom.js` (`#dialog-title`, `#dialog-text`, `#dialog-content` тощо). DOM-синглтон не оновлюється автоматично: посилання зберігаються з моменту ініціалізації.

- **Ніколи не видаляти** спільні елементи через `.replaceWith()` або `.remove()` — після цього всі наступні сцени отримають stale reference.
- Щоб приховати спільний елемент, додавати клас `sr-only`; у `destroy()` його обов'язково знімати.
- Додаткові DOM-елементи, які потрібні конкретній сцені, мають додаватися в `#dialog-content` окремим вузлом і явно видалятися у `destroy()`.

Детальніше: [TASKS.md §26](TASKS.md).

---

## 8. Event contracts

Поточні події:

### `item:collected`

Коли Равлик збирає предмет.

```js
{
    type: 'apple',
    value: 1
}
```

### `puzzle:completed`

Коли NPC-завдання виконано.

```js
{
    npcId: 'mouse_1',
    stars: 1
}
```

### `level:completed`

Коли на поточному рівні зібрано всі яблука, всі груші та виконано всі завдання. Емітується `ScoreSystem` один раз на рівень після 1400ms затримки.

```js
{
    apples: N,
    pears: N,
    stars: N,
    totalApples: N,
    totalPears: N,
    totalStars: N,
    level: { id, index, nameKey, world, npcs }
}
```

Обробляє `bootstrap.js`: якщо наступний рівень існує — показує `LevelCompleteScene`, інакше емітує `game:won`.

### `game:won`

Коли пройдено останній рівень. Емітується `bootstrap.js` один раз на сесію. Payload — сумарний результат за всі рівні.

```js
{
    apples: N,
    pears: N,
    stars: N
}
```

Правила для нових подій:

- назва у форматі `domain:action`;
- payload документується тут;
- подія не повинна передавати DOM-вузли;
- подія не повинна передавати персональні дані дитини;
- подія має бути стабільною для тестів.

---

## 9. `EventBus` — стан

`EventBus` реалізований і має:

- `on(event, callback)` — повертає функцію відписки;
- `off(event, callback)`;
- `emit(event, data)`;
- `reset()` — очищає всі listeners (використовується в тестах).

`ScoreSystem` підписки є idempotent через `resetSubscriptions()`. Повторний виклик `init()` не дублює події.

---

## 10. `Input` — стан

`Input.init()` захищений від повторного виклику: якщо вже ініціалізований, повторний виклик повертається без дублювання listeners. Ідемпотентність забезпечена.

---

## 11. `GameScene` — поточний стан

`GameScene` рефакторована: camera і apple логіка виокремлені у власні модулі. Розмір зменшився з 552 рядків, нові можливості значно розширили файл.

Поточні відповідальності `GameScene`:

- рендер перешкод і NPC (з кешуванням елементів у `_npcElements` Map);
- рух Равлика з delta time (velocity, corner sliding, rotation);
- визначення найближчого NPC і стану взаємодії;
- click-to-move (`intentTarget`) і joystick intent;
- відкриття `DialogScene`, `PauseScene` (по Escape або кнопці ⏸);
- адаптивний вибір завдань через `TaskPicker.pickAdaptiveTask(..., this._earnedStars)`;
- оновлення HUD;
- accessibility announcements;
- координація `camera-system` і `collectible-system`.

Делеговано у зовнішні модулі:

```txt
js/game/world-generator.js    — генерація світу
js/game/collision-system.js   — колізії
js/game/collectible-system.js — рендер, збір і пошук предметів (яблука, груші)
js/game/camera-system.js      — viewport, snap, scroll-follow
js/game/session-state.js      — початковий стан сесії
```

Залишається бажаним, але ще не зробленим:

```txt
js/game/npc-system.js
js/game/player-controller.js
```

---

## 12. Напрям подальшого рефакторингу `GameScene`

Поточна `GameScene` вже делегує camera і collectible логіку. Наступний бажаний крок — винести player movement і NPC interaction:

```js
// Бажана майбутня структура
update() {
    PlayerController.update(this.session, this.deps.input);
    CollisionSystem.resolve(this.session);
    collectNearbyCollectibles({ items, playerX, playerY, ... }); // вже є
    NpcSystem.update(this.session, this.deps);
    updateCamera(this.state, this.config, getViewportSize(this.dom)); // вже є
}
```

Поточна реальність вже близька до цього патерну для camera та collectibles.

---

## 13. World generation rules

Світ має бути валідним при будь-якому seed/random.

Інваріанти світу:

- Равлик не стартує в перешкоді;
- яблука не з'являються в перешкодах;
- NPC не з'являються в перешкодах;
- яблука не перекривають NPC;
- NPC доступні для гравця;
- кількість яблук відповідає `CONFIG.appleCount` або fallback явно документований;
- кількість NPC відповідає цільовій сесії або явно документованому fallback;
- NPC рівномірно розподілені по світу й не злипаються в одному секторі;
- стартова зона має бути вільною;
- важливі об'єкти не стоять надто близько один до одного.

Для цього потрібен `spawn-rules.js`.

---

## 14. Seeded random

Випадковість потрібна, але баги треба відтворювати.

Бажаний напрям:

```js
const random = createSeededRandom(seed);
```

Seed має використовуватися для:

- генерації перешкод;
- яблук;
- вибору задач;
- декоративних випадкових елементів, якщо вони впливають на гру.

Seed не має зберігатися між сесіями. Він може показуватися лише в dev/debug режимі.

---

## 15. Task architecture direction

Поточна модель достатня для простих задач, але нові математичні задачі стануть складнішими.

Бажана модель:

```txt
task-data
  містить чисті дані

task-contracts
  описує формат

task-validator
  перевіряє задачі

task-renderers
  створюють UI

task-evaluators
  перевіряють відповіді

task-registry
  зв'язує все разом
```

Докладно: [TASKS.md](TASKS.md).

---

## 16. Accessibility architecture

Доступність — не додаткова функція, а частина архітектури.

Обов'язкові принципи:

- усі інтерактивні елементи доступні з клавіатури;
- жодна критична дія не вимагає drag-and-drop;
- `aria-live` використовується для важливих змін;
- `prefers-reduced-motion` поважається;
- focus trap у модальних вікнах не ламається;
- контраст і розмір натискання відповідають дитячому використанню;
- canvas не містить критичного контенту без DOM-альтернативи.

---

## 17. Rendering rules

Бажаний стандарт:

- створювати нові елементи через `document.createElement`;
- тексти вставляти через `textContent`;
- не вставляти педагогічні або змінні тексти через `innerHTML`;
- `innerHTML = ''` дозволено для очищення контейнера;
- якщо `innerHTML` справді потрібен, треба пояснити причину в коментарі й гарантувати sanitization.

---

## 18. Configuration rules

Глобальні числа мають бути в `js/core/config.js`, якщо вони впливають на поведінку гри:

- швидкість;
- радіус взаємодії;
- параметри камери;
- базові (fallback) розмір світу й кількості обʼєктів.

Що саме є на конкретному рівні — розмір світу, кількість перешкод, яблук і груш — задає сам рівень у полі `world`. `createLevelConfig(level)` зливає `CONFIG` з `level.world`, і `GameScene` працює лише з цим результатом (`this.config`), а не з глобальним `CONFIG`.

```js
const level = {
    id: 'level2',
    index: 2,
    nameKey: 'levels.level2Name',
    world: { worldWidth: 4600, worldHeight: 4600, obstacleCount: 104, appleCount: 34, pearCount: 16 },
    playerStart: { x: 2300, y: 2300 },
    npcs: [ /* ... */ ]
};
```

Не можна розкидати magic numbers по різних файлах без потреби.

### 18.1 Як додати рівень

1. Описати рівень у `js/game/level-data.js` і додати його в `LEVEL_SEQUENCE`.
2. Створити (або перевикористати) JSON-категорії завдань потрібної складності.
3. Додати назву рівня в `js/i18n/uk.js` (`levels.*`), а нові типи NPC — у `npc.*` і `entities.*Icon`.
4. Додати нові файли в `sw.js` і підняти версію кеша.

Коду сцен чіпати не треба: `bootstrap.js` сам веде дитину по `LEVEL_SEQUENCE`.

### 18.2 Як керувати складністю

Поріг доступності банку задається полем `unlockAtStars` у самій JSON-категорії — не в коді:

```json
{ "id": "arithmetic.intermediate", "unlockAtStars": 8, "tasks": [] }
```

`TaskPicker` віддає NPC лише ті банки, що вже відкрились за кількістю зірочок цього рівня. Якщо відкритих банків немає, спрацьовує запобіжник і видається завдання з будь-якого банку NPC — дитина ніколи не лишається без завдання.

Правило: у кожного NPC має бути щонайменше один банк з `unlockAtStars: 0` (перевіряється тестом).

---

## 19. CSS architecture

Поточні глобальні стилі:

```txt
tokens.css
style.css
css/entities.css
css/hud.css
css/offline.css
css/tasks.css
```

`style.css` тримає базу сторінки, світ, Равлика, діалог, accessibility і загальні responsive-правила.

Окремі CSS-файли:

- `css/entities.css` — перешкоди, яблука, NPC і їхні touch/high-contrast стани; `.npc.completed` показує ★ і стає неінтерактивним;
- `css/hud.css` — HUD-панель: завжди-видима topbar (`.hud-topbar`) зі статистикою (`.hud-stats`) і кнопками-налаштуваннями (`.hud-actions`), рядок NPC-badge (`.hud-npc-row`), рукоятка згортання (`.hud-toggle-btn`) і колапсний блок деталей (`.hud-details`); responsive для HUD;
- `css/offline.css` — стилі для `offline.html` (раніше були inline в HTML);
- `css/tasks.css` — DOM-стилі навчальних задач у діалозі; включає `.is-correct-reveal` (pulse-анімація для правильної відповіді), `.is-dimmed` (затемнені варіанти), `@media prefers-reduced-motion`.

Правила:

- нові кольори додавати через токени;
- не дублювати кольори напряму, якщо вони вже є в токенах;
- інтерактивні стани мають мати `:focus-visible`;
- mobile/touch перевірка обов'язкова;
- анімації мають поважати `prefers-reduced-motion`.

---

## 20. Коли варто додавати новий модуль

Додавати новий модуль треба, якщо:

- логіка може тестуватися окремо;
- файл перевищує розумну відповідальність;
- код потрібен більше ніж в одному місці;
- це окрема доменна концепція: камера, яблука, NPC, колізії, завдання, seed, spawn.

Не треба створювати модуль лише заради модуля, якщо це 5 рядків одноразового коду.

---

## 21. Заборонені архітектурні зміни без окремого рішення

Не можна без окремого погодження:

- переводити гру на React/Vue/Svelte;
- переводити гру на Phaser;
- робити canvas-only реалізацію;
- додавати бекенд;
- додавати авторизацію;
- додавати профілі дітей;
- додавати збереження прогресу між сесіями;
- додавати сторонні CDN;
- додавати аналітику;
- ламати PWA/offline без альтернативи;
- видаляти accessibility-функції.

---

## 22. Рекомендований порядок фундаментального рефакторингу

1. ✅ Додати `EventBus.reset()` та idempotent subscriptions.
2. ✅ Зробити `Input.init()` ідемпотентним.
3. ✅ Синхронізувати `sw.js` з поточними CSS/JS/JSON файлами (v27).
4. ✅ Винести логіку предметів з `GameScene` → `collectible-system.js`.
5. ✅ Винести camera logic з `GameScene` → `camera-system.js`.
6. ✅ Delta-time game loop: `update(deltaMs)`, `scale` у `motion.js` і `camera-system.js`.
7. ✅ WinScene, PauseScene, MusicController, Joystick реалізовані.
8. ✅ Адаптивна складність через `TaskPicker.pickAdaptiveTask`.
9. ✅ Corner sliding у `resolveMovement`.
10. ✅ Реструктуризація HUD: завжди-видима topbar, NPC-badge row, auto-expand on game start.
11. ✅ Collision margin у `hasWorldCollision` — гравець не заїжджає на заокруглені кути перешкод.
12. Винести NPC interaction logic з `GameScene` → `npc-system.js`.
13. Розширити інтеграційні тести для кількох NPC і кількох task type.
14. Додавати нові типи задач лише як короткі візуальні взаємодії, без монолітного math-module.

---

## 23. Критерій якісної архітектурної зміни

Зміна якісна, якщо після неї:

- код легше тестувати;
- `GameScene` не стає більшим;
- дані задач не змішуються з DOM;
- правила гри не залежать від конкретного UI;
- accessibility не погіршилась;
- session policy не порушена;
- PWA-кеш не приховує зміни;
- новий агент може зрозуміти модуль без читання половини проєкту.
