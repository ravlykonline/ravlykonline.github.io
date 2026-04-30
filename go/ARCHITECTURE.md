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

`js/main.module.js` збирає composition, встановлює тимчасові compatibility-адаптери й запускає UI.

## Поточна Структура

```text
js/
  main.js
  main.module.js

  app/
    composition.js
    legacyEngine.js
    legacyGlobals.js
    legacyRender.js
    legacyRenderDrag.js
    legacyRenderSnail.js
    legacyState.js
    legacyUi.js
    legacyUiAudio.js
    legacyUiModals.js

  core/
    config.js
    constants.js
    levels.js
    texts.uk.js

  engine/
    levelRules.js
    route.js
    simulator.js
    validation.js

  features/
    audio.js
    confetti.js
    pwaRegister.js
    speech.js

  state/
    gameState.js
    sessionStore.js

  ui/
    assets.js
    dom.js
    focus.js
    modals.js
    renderBoard.js
    renderLevelMap.js
    renderPalette.js
    renderProgress.js
```

Старі файли `js/levels.js`, `js/gameState.js`, `js/engine.js`, `js/render.js`, `js/ui.js` та інші classic-файли видалені.

## Compatibility Шар

`js/app/legacy*.js` — тимчасовий шар сумісності.

Він потрібен, бо частина runtime ще очікує старий контракт `window.SnailGame`, хоча дані й більшість логіки вже винесені в ES-модулі.

Важливо:

- це не нова цільова архітектура;
- ці файли не мають розростатися новою логікою;
- при наступних кроках їх треба розкладати в `ui/*`, `engine/*`, `features/*`, `state/*`;
- фінальна мета — прибрати application state з `window.SnailGame`.

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

- composition;
- тимчасове збирання старого runtime-контракту;
- міст між новими модулями й поки що не демонтованими UI/engine сценаріями.

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

- `js/app/legacyUi.js` розкладено на менші UI-модулі;
- `js/app/legacyEngine.js` розкладено на чисті engine модулі;
- runtime більше не потребує `window.SnailGame` як application state;
- `js/app/legacy*.js` видалено;
- `npm test` проходить;
- PWA offline перевірено після оновлення `APP_SHELL`.
