# ARCHITECTURE.md — архітектура проєкту «Равлик-бродилка»

Цей документ описує поточну архітектуру гри, межі відповідальності модулів, правила розширення й бажаний напрям рефакторингу.

Мета документа — зробити так, щоб людина або AI-агент могли працювати над проєктом без руйнування фундаменту.

---

## 1. Архітектурна позиція

Проєкт є статичною браузерною грою без бекенду.

Цей документ стосується саме гри-бродилки в папці `game`. Рефакторинг цього проєкту не має переносити сюди архітектуру AST/parser/runtime середовища з кореня репозиторію, якщо таке рішення не ухвалене окремо.

Продуктова ціль гри: сесійна дослідницька бродилка для дітей 5-7 років. Дитина керує Равликом, досліджує поле, збирає яблука і зустрічає звірів. Звірі дають короткі візуальні завдання, за які дитина отримує зірочки. Якщо завдання не виходить, дитина може закрити діалог і йти далі без покарання.

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
    taskPoolId: 'observation.beginner'
}
```

Погано:

```js
if (npc.type === 'mouse') {
    showMouseTaskHardcodedInGameScene();
}
```

Для майбутньої моделі світу важливо, щоб кількість і розміщення звірів також ішли через дані й генерацію. Цільовий світ може мати приблизно 20-25 звірів, рівномірно розкиданих по полю, без накладання на перешкоди й без недоступних позицій.

### 2.2 `GameScene` не має бути всесвітом

`GameScene` зараз є головним центром гри, але її не можна безкінечно розширювати.

Нова складна логіка має виноситися в окремі модулі:

- генерація світу;
- колізії;
- spawn rules;
- apple system;
- NPC system;
- camera controller;
- session state;
- task flow.

Пріоритет цього рефакторингу — підготувати світ до випадкової сесійної генерації: окремі модулі мають відповідати за розміщення яблук, звірів, перешкод і перевірку валідності позицій.

### 2.3 Сцени керують екранами, системи керують правилами

Сцена відповідає за життєвий цикл екрана.

Система відповідає за конкретне правило або механіку.

Приклад:

```txt
GameScene
  використовує AppleSystem
  використовує NpcSystem
  використовує CameraController
  використовує CollisionSystem
```

А не:

```txt
GameScene містить усю логіку яблук, NPC, камери, колізій, завдань і UI.
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
  -> js/main.js
    -> bootGame()
      -> applyDocumentTranslations()
      -> Announcer.init()
      -> Input.init()
      -> HUDController.init()
      -> FontModeController.init()
      -> ThemeModeController.init()
      -> ScoreSystem.init()
      -> SceneManager.push(IntroScene)
    -> requestAnimationFrame(gameLoop)
```

`gameLoop`:

```js
function gameLoop() {
    SceneManager.update();
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
```

Відповідальність:

- дані рівнів;
- чисті правила гри;
- вибір задач для NPC;
- допоміжні game-specific функції.

Бажаний розвиток цього шару:

```txt
js/game/session-state.js
js/game/world-generator.js
js/game/spawn-rules.js
js/game/collision-system.js
js/game/apple-system.js
js/game/npc-system.js
js/game/camera-controller.js
```

---

### 4.5 Task layer

```txt
js/tasks/task-registry.js
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
  -> taskPools
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

Для цільової аудиторії 5-7 років task layer має віддавати перевагу коротким візуальним задачам: форми, пари, групи предметів, послідовності, силуети, прості закономірності. Довгі текстові умови й складні математичні розв'язки не є основним напрямом цієї гри.

---

### 4.6 Systems layer

```txt
js/systems/score-system.js
```

Відповідальність:

- лічильники;
- реакція на події;
- оновлення HUD через `HUDController`.

Майбутні системи:

```txt
achievement-system.js
session-summary-system.js
sound-system.js
```

---

### 4.7 UI layer

```txt
js/ui/font-mode.js
js/ui/hud-controller.js
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
sw.js
manifest.json
offline.html
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
- `GameScene.apples`;
- `GameScene.obstacles`;
- `GameScene.npcs`;
- `ScoreSystem.apples`;
- `ScoreSystem.stars`;
- `Input.keys`;
- `Input.mouse`;
- `Input.keyboard`.

Це нормально для раннього етапу, але надалі бажано ввести явний `SessionState`.

Бажаний напрям:

```js
export function createInitialSessionState(levelData) {
    return {
        player: {...},
        camera: {...},
        apples: [],
        obstacles: [],
        npcs: [],
        score: {
            apples: 0,
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
- `update()` не має напряму змінювати глобальні налаштування UI без потреби;
- `render()` має бути максимально передбачуваним і не створювати нові listeners.

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

Правила для нових подій:

- назва у форматі `domain:action`;
- payload документується тут;
- подія не повинна передавати DOM-вузли;
- подія не повинна передавати персональні дані дитини;
- подія має бути стабільною для тестів.

---

## 9. Поточна проблема `EventBus`

Зараз `EventBus` має `on()` і `emit()`, але не має:

- `off()`;
- `once()`;
- `reset()`;
- захисту від повторної ініціалізації.

Це може створити дублювання подій, якщо `bootGame()` викличеться повторно в тестах або dev-сценаріях.

Рекомендоване покращення:

```js
export const EventBus = {
    listeners: {},

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = new Set();
        this.listeners[event].add(callback);
        return () => this.off(event, callback);
    },

    off(event, callback) {
        this.listeners[event]?.delete(callback);
    },

    emit(event, data) {
        this.listeners[event]?.forEach((callback) => callback(data));
    },

    reset() {
        this.listeners = {};
    }
};
```

---

## 10. Поточна проблема `Input`

`Input.init()` додає глобальні listeners на `window`. Якщо викликати `Input.init()` більше одного разу, listeners можуть дублюватися.

Рекомендовані рішення:

1. Зробити `Input.init()` ідемпотентним:

```js
if (this.initialized) return;
this.initialized = true;
```

2. Або додати `Input.destroy()` для тестів і перезапуску.

Перший варіант простіший і достатній для цього проєкту.

---

## 11. Поточна проблема `GameScene`

`GameScene` зараз відповідає за надто багато. Це головний архітектурний ризик.

Поточні відповідальності:

- створення перешкод;
- створення яблук;
- рендер перешкод;
- рендер яблук;
- рендер NPC;
- рух Равлика;
- камера;
- колізії;
- збір яблук;
- визначення найближчого NPC;
- відкриття діалогу;
- оновлення HUD;
- accessibility announcements.

Бажаний рефакторинг:

```txt
js/game/world-generator.js
js/game/spawn-rules.js
js/game/collision-system.js
js/game/apple-system.js
js/game/npc-system.js
js/game/camera-controller.js
js/game/player-controller.js
```

Після рефакторингу `GameScene` має координувати системи, а не містити всю логіку.

---

## 12. Бажана майбутня структура `GameScene`

```js
export class GameScene {
    constructor(deps) {
        this.deps = deps;
        this.session = createSessionState(LevelData.level1);
    }

    init() {
        WorldRenderer.mount(this.session, this.deps.dom);
        HUDController.setObjective(...);
    }

    update() {
        PlayerController.update(this.session, this.deps.input);
        CollisionSystem.resolve(this.session);
        AppleSystem.update(this.session, this.deps.eventBus);
        NpcSystem.update(this.session, this.deps);
        CameraController.update(this.session);
    }

    render() {
        WorldRenderer.render(this.session);
        CameraController.render(this.session, this.deps.dom);
    }

    destroy() {
        WorldRenderer.unmount(this.deps.dom);
    }
}
```

---

## 13. World generation rules

Світ має бути валідним при будь-якому seed/random.

Майбутні інваріанти:

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
- розмір світу;
- кількість яблук;
- кількість перешкод;
- радіус взаємодії;
- параметри камери.

Не можна розкидати magic numbers по різних файлах без потреби.

---

## 19. CSS architecture

Поточні глобальні стилі:

```txt
tokens.css
style.css
```

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

1. Додати `EventBus.reset()` або idempotent subscriptions.
2. Зробити `Input.init()` ідемпотентним.
3. Додати `SessionState`.
4. Винести генерацію світу з `GameScene`.
5. Додати `spawn-rules` і тести на валідність світу.
6. Підготувати модель випадкового розміщення яблук і 20-25 NPC.
7. Винести apple logic.
8. Винести NPC interaction logic.
9. Винести camera logic.
10. Спростити onboarding і HUD навколо поля гри.
11. Додати `task-contracts` і `task-validator`.
12. Додати `task-evaluators` для візуальних задач.
13. Додавати нові типи задач лише як короткі візуальні взаємодії, без монолітного math-module.

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
