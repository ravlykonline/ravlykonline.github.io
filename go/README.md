# Пригоди Равлика

**Пригоди Равлика** — статична навчальна PWA-гра з основ алгоритмічного мислення для дітей. Гравець допомагає равлику дістатися яблука, розкладаючи команди-стрілки на полі.

Публічна адреса:

```text
https://ravlyk.org/go
```

Проєкт має залишатися простим: одна гра, рівно 20 відкритих рівнів, GitHub Pages, без бекенду, без реєстрації, без cookies, без аналітики, без CDN і без build-кроку.

## Поточний Стан

- `index.html` підключає один entrypoint: `<script type="module" src="./js/main.js"></script>`.
- Старий ланцюжок classic scripts видалено з кореня `js/`.
- Дані, стан, engine, UI та feature-логіка винесені в ES-модулі.
- Compatibility-шар `js/app/legacy*.js` і legacy script-loader видалено; app object створюється в `js/app/appFactory.js` і підключається через `js/app/composition.js`.
- Service worker кешує тільки актуальні модульні файли й assets.
- Прогрес зберігається тільки в `sessionStorage` у межах поточної вкладки.

## Ключові Правила

- Рівнів завжди рівно 20.
- Усі рівні відкриті одразу.
- Після reload у тій самій вкладці відновлюються поточний рівень, стрілки й пройдені рівні.
- Після закриття вкладки наступний візит починається з нуля.
- `localStorage` не використовується.
- Зовнішні скрипти, стилі, шрифти, іконки, CDN та аналітика заборонені.
- Шляхи мають бути відносними й сумісними з `/go`.

## Структура

```text
/
  index.html
  offline.html
  manifest.json
  sw.js
  package.json

  assets/
  css/

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

  tests/
```

`js/app/appFactory.js` створює app object, а `js/app/composition.js` явно підключає `engine/*`, `ui/*`, `features/*` та `state/*`.

## Запуск Локально

Рекомендовано відкривати через локальний HTTP-сервер, особливо для перевірки PWA:

```bash
python -m http.server 8080
```

Потім відкрити:

```text
http://localhost:8080/
```

## Тести

```bash
npm test
```

Поточний тестовий набір перевіряє:

- рівно 20 рівнів;
- валідність і розв'язність рівнів;
- відсутність зовнішніх URL;
- відсутність `localStorage`, `eval`, `new Function`, `document.write`;
- використання `sessionStorage` тільки через `js/state/sessionStore.js`;
- PWA app shell і `/go`-сумісні шляхи;
- ARIA progressbar;
- модульний entrypoint без старого script-chain.

## PWA

Service worker реєструється через:

```js
navigator.serviceWorker.register('./sw.js');
```

`APP_SHELL` у `sw.js` має містити тільки реальні актуальні файли. Після зміни кешованих файлів потрібно bump-нути `STATIC_CACHE`.

## Наступний Рефакторинг

1. Далі зменшувати app facade там, де це спрощує код без зміни UX.
2. Не повертати classic script-chain, `js/app/legacy*.js` або legacy loader у `main.module.js`.
3. Повторно перевірити PWA offline після кожної зміни `APP_SHELL` або service worker.
