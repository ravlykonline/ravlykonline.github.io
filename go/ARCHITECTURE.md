# ARCHITECTURE — Пригоди Равлика

Цей документ описує актуальну архітектуру гри після переходу з classic script-chain на ES-модулі.

## Межі Проєкту

Проєкт залишається:

- однією статичною грою за адресою `https://ravlyk.org/go`;
- без бекенду, бази даних, реєстрації, cookies та аналітики;
- без фреймворку, npm runtime-залежностей і build-кроку;
- PWA, яка має працювати offline після першого успішного завантаження.

## Entry Point

`index.html` підключає тільки один JavaScript entrypoint:

```html
<script type="module" src="./js/main.js"></script>
```

`js/main.js` лише запускає bootstrap:

```js
import { bootstrapApp } from './main.module.js';

bootstrapApp();
```

`js/main.module.js` збирає composition і запускає UI без classic script-loader або legacy runtime bridge.

## Поточна Структура

```text
js/
  main.js
  main.module.js

  app/
    appFactory.js
    composition.js

  core/
    config.js
    constants.js
    levels.js
    texts.uk.js

  engine/
    levelRules.js
    route.js
    runtime.js
    simulator.js
    validation.js

  features/
    audio.js
    confetti.js
    pwaRegister.js
    speech.js

  state/
    appStateFacade.js
    gameState.js
    sessionStore.js

  ui/
    appUi.js
    appUiEffects.js
    appUiEvents.js
    appUiLevelFlow.js
    appUiLayout.js
    appUiState.js
    appUiStartup.js
    appUiStatus.js
    assets.js
    dom.js
    focus.js
    modals.js
    render.js
    renderBoard.js
    renderDrag.js
    renderLevelHeader.js
    renderLevelMap.js
    renderPalette.js
    renderProgress.js
    renderSnail.js
```

Старі файли `js/levels.js`, `js/gameState.js`, `js/engine.js`, `js/render.js`, `js/ui.js` та інші classic-файли видалені.

## Legacy Стан

`js/app/legacy*.js` — видалено. App object створюється в `js/app/appFactory.js` і підключається через `js/app/composition.js`.

Runtime більше не очікує контракт `window.SnailGame`; залежності передаються через ES-модулі та app object. `js/main.module.js` більше не експортує legacy loader для classic scripts.

Важливо:

- не повертати classic script-chain або `js/app/legacy*.js`;
- не додавати нові залежності від `window.SnailGame`;
- `js/ui/appUi.js` лишається тонким composer-модулем, а нову UI-логіку треба класти у focused `js/ui/*` модулі;
- app facade можна далі зменшувати тільки там, де це спрощує код без зміни UX.

## Відповідальності Модулів

`core/*`:

- рівні;
- тексти;
- сталі напрями, tile definitions і конфігурація;
- без DOM і storage.

`state/sessionStore.js`:

- єдине місце, де дозволено звертатися до `sessionStorage`;
- defensive parsing;
- ігнорування битого JSON або невірної схеми;
- без `localStorage`.

`state/gameState.js`:

- створення стану;
- переходи між рівнями;
- стрілки по рівнях;
- restart;
- без DOM.

`engine/*`:

- чистий аналіз маршруту;
- симуляція рівня;
- валідація рівнів;
- без DOM, audio, storage та глобального app state.

`ui/*`:

- DOM refs;
- рендер поля, палітри, карти рівнів, progress;
- модалки та focus helpers;
- не має реалізовувати route simulation або storage internals.

`features/*`:

- audio;
- speech;
- confetti;
- PWA registration;
- деградація без помилок, якщо API недоступні.

`app/*`:

- створення app object;
- composition залежностей між `core`, `engine`, `state`, `ui` та `features`;
- bootstrap-level wiring без DOM-логіки, storage internals або route simulation.

## Стан І Session Payload

Прогрес зберігається тільки в `sessionStorage`:

```js
{
  version: 1,
  currentLevelId: 7,
  arrowsByLevel: {
    "7": {
      "1,2": "right"
    }
  },
  completedLevelIds: [1, 2, 3]
}
```

Поведінка:

- reload у тій самій вкладці відновлює рівень, стрілки й completed highlights;
- перехід між рівнями зберігає стрілки кожного рівня в межах сесії;
- закриття вкладки очищує прогрес природною поведінкою `sessionStorage`;
- restart очищує session state і повертає на рівень 1.

## PWA І Шляхи

Усі шляхи мають бути відносними:

```html
<link rel="manifest" href="./manifest.json">
<script type="module" src="./js/main.js"></script>
```

Service worker:

```js
navigator.serviceWorker.register('./sw.js');
```

`APP_SHELL` має містити тільки реальні файли поточної модульної структури. Старі classic-файли не мають повертатися в кеш.

## Заборони

Не використовувати:

- `eval`;
- `new Function`;
- `document.write`;
- `localStorage`;
- external scripts/styles/assets/CDN;
- analytics;
- cookies;
- backend/API;
- framework/build tool.

## Критерії Готовності Наступного Етапу

Наступний етап буде завершеним, коли:

- entrypoint лишається модульним і без legacy loader;
- `js/app/appFactory.js` та `js/app/composition.js` не нарощують UI/engine деталі;
- `js/ui/appUi.js` лишається composer-модулем, а нова поведінка живе в малих UI-модулях;
- app facade зменшується поступово там, де це не змінює UX;
- `npm test` проходить;
- PWA offline перевірено після оновлення `APP_SHELL`.
