# PWA — Пригоди Равлика

Гра публікується за адресою:

```text
https://ravlyk.org/go
```

PWA має працювати offline після першого успішного завантаження й не має робити зовнішніх запитів.

## Шляхи Для `/go`

Усі внутрішні шляхи мають бути відносними:

```html
<link rel="manifest" href="./manifest.json">
<script type="module" src="./js/main.js"></script>
```

Service worker реєструється так:

```js
navigator.serviceWorker.register('./sw.js');
```

Не використовувати:

```text
/js/main.js
/css/game.css
/assets/snail.svg
/sw.js
```

## Manifest

`manifest.json` має лишатися сумісним із `/go`:

- `start_url: "./"`;
- `scope: "./"`;
- icons через `./assets/...`;
- без зовнішніх URL.

## Service Worker

Service worker лежить у корені гри:

```text
/go/sw.js
```

Актуальна стратегія:

- navigation/documents: network-first із fallback на cache/offline page;
- JS/CSS/JSON/HTML: network-first, щоб deployed updates підтягувалися після релізу;
- assets: cache fallback.

## App Shell

`APP_SHELL` має містити тільки реальні файли поточної модульної структури.

Поточний принцип:

- додати `index.html`, `offline.html`, `manifest.json`, CSS, assets;
- додати `js/main.js`, `js/main.module.js`;
- додати всі ES-модулі з `js/core`, `js/engine`, `js/state`, `js/ui`, `js/features`;
- додати тимчасові `js/app/legacy*.js`, доки вони потрібні runtime;
- не додавати видалені classic-файли.

Видалені файли не мають повертатися в `APP_SHELL`:

```text
./js/main.legacy.js
./js/levels.js
./js/texts.uk.js
./js/gameState.js
./js/engineRoute.js
./js/engine.js
./js/renderDrag.js
./js/renderSnail.js
./js/render.js
./js/uiAudio.js
./js/uiModals.js
./js/ui.js
```

## Cache Version

При зміні `APP_SHELL`, JS/CSS/assets або структури модулів потрібно bump-нути:

```js
const STATIC_CACHE = 'ravlyk-static-vXX';
```

Поточний cache version має відповідати `sw.js` і тесту `tests/pwa.test.js`.

## Що PWA Не Має Робити

- push notifications;
- background sync;
- analytics;
- cookies;
- зовнішні запити;
- кешування CDN;
- серверна синхронізація прогресу.

Прогрес гри зберігається тільки в `sessionStorage`, не в service worker cache.

## Перевірки

Автоматичні:

```bash
npm test
```

Тести перевіряють:

- усі файли з `APP_SHELL` існують;
- `APP_SHELL` не містить абсолютних або зовнішніх URL;
- видалені classic-файли не повернулися в кеш;
- `manifest.json` сумісний із `/go`;
- service worker ігнорує non-GET запити.

Ручна перевірка перед релізом:

1. Відкрити гру online.
2. Переконатися, що service worker зареєстрований.
3. Перезавантажити сторінку.
4. У DevTools увімкнути offline.
5. Перезавантажити сторінку.
6. Перевірити, що гра відкривається, assets видно, рівень запускається.
7. Після нового deploy переконатися, що сторінка оновлюється до нової версії.
