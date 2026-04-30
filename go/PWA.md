# PWA — Пригоди Равлика

Цей документ описує, як має працювати PWA/offline-режим гри **«Пригоди Равлика»** на GitHub Pages за адресою `ravlyk.org/go`.

Головна вимога: після першого відкриття гра має працювати офлайн.

---

## Цілі PWA

PWA потрібна для:

- роботи без інтернету після першого відкриття;
- використання на планшетах і інтерактивних дошках;
- встановлення на головний екран, якщо пристрій це підтримує;
- стабільної роботи в класі, де інтернет може бути нестабільним.

PWA не має додавати:

- серверне збереження;
- push-повідомлення;
- фонову синхронізацію;
- збір аналітики;
- зовнішні запити.

---

## GitHub Pages і шлях `/go`

Гра публікується за адресою:

```text
https://ravlyk.org/go
```

Тому всі шляхи мають бути відносними.

Правильно:

```html
<link rel="manifest" href="./manifest.json">
<script type="module" src="./js/main.js"></script>
```

Правильно:

```js
navigator.serviceWorker.register('./sw.js');
```

Небажано:

```html
<script src="/js/main.js"></script>
```

Небажано:

```js
navigator.serviceWorker.register('/sw.js');
```

Абсолютний шлях `/sw.js` вказує на корінь домену, а не на `/go/sw.js`.

---

## Manifest

`manifest.json` має бути сумісним з `/go`.

Рекомендовано:

```json
{
  "name": "Пригоди Равлика",
  "short_name": "Равлик",
  "description": "Навчальна гра з алгоритмами для молодших школярів.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#e8f2dc",
  "theme_color": "#e8f2dc",
  "lang": "uk",
  "icons": [
    {
      "src": "./assets/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "./assets/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

Поточне `start_url: "./index.html"` теж може працювати, але `"./"` краще відповідає сценарію підтеки `/go`.

---

## Service worker

Service worker має бути у корені гри:

```text
/go/sw.js
```

Реєстрація:

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

Реєстрацію бажано винести в:

```text
js/features/pwaRegister.js
```

---

## App shell

`APP_SHELL` має містити мінімальний набір файлів, потрібний для офлайн-запуску.

Після ES-модульного рефакторингу список має бути оновлений.

Приклад:

```js
const STATIC_CACHE = 'ravlyk-static-v2';

const APP_SHELL = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './ravlyk.png',

  './css/tokens.css',
  './css/base.css',
  './css/game.css',

  './js/main.js',
  './js/core/config.js',
  './js/core/constants.js',
  './js/core/levels.js',
  './js/core/texts.uk.js',
  './js/engine/simulator.js',
  './js/engine/route.js',
  './js/engine/validation.js',
  './js/engine/levelRules.js',
  './js/state/sessionStore.js',
  './js/state/gameState.js',
  './js/ui/dom.js',
  './js/ui/renderBoard.js',
  './js/ui/renderPalette.js',
  './js/ui/renderLevelMap.js',
  './js/ui/renderProgress.js',
  './js/ui/modals.js',
  './js/ui/focus.js',
  './js/features/audio.js',
  './js/features/speech.js',
  './js/features/confetti.js',
  './js/features/pwaRegister.js',

  './assets/apple.svg',
  './assets/snail.svg',
  './assets/rock.svg',
  './assets/stump.svg',
  './assets/run_button.svg',
  './assets/trash_icon.svg',
  './assets/prev_level.svg',
  './assets/next_level.svg',
  './assets/icon-192.png',
  './assets/icon-512.png'
];
```

Фактичний список має відповідати реальним файлам після рефакторингу. Не залишати в кеші файли, яких уже немає.

---

## Стратегія кешування

### HTML/CSS/JS/JSON

Network-first:

1. спробувати взяти нову версію з мережі;
2. якщо мережі немає — взяти з кешу.

Це допомагає підтягувати оновлення після деплою.

### Assets

Cache-first:

1. спробувати взяти з кешу;
2. якщо немає — завантажити з мережі й закешувати.

Для маленької гри це нормально.

---

## Версія кешу

Кожен реліз, який змінює app shell або assets, має оновлювати назву кешу:

```js
const STATIC_CACHE = 'ravlyk-static-v3';
```

Не забувати змінювати версію при:

- зміні JS-файлів;
- зміні CSS;
- зміні assets;
- зміні `manifest.json`;
- зміні `offline.html`;
- зміні структури модулів.

Це особливо важливо після переходу на ES-модулі.

---

## Очищення старих кешів

Під час `activate` service worker має видаляти старі кеші:

```js
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});
```

---

## Offline fallback

Для navigation-запитів має бути fallback:

```text
offline.html
```

Якщо користувач відкриває гру без інтернету після першого візиту, має відкриватися закешована гра або offline-сторінка, а не помилка браузера.

---

## Що service worker не має робити

Не додавати:

- push notifications;
- background sync;
- periodic sync;
- кешування зовнішніх ресурсів;
- звернення до сторонніх API;
- складну логіку оновлення з модалками, якщо це не потрібно.

Для цієї гри PWA має бути максимально простою.

---

## Тести для PWA

Автоматичні тести мають перевіряти:

- усі файли з `APP_SHELL` існують;
- у `APP_SHELL` немає абсолютних URL;
- у `APP_SHELL` немає зовнішніх URL;
- `manifest.json` має `start_url` і `scope`, сумісні з `/go`;
- service worker реєструється через `./sw.js`;
- `sw.js` не перехоплює non-GET запити;
- `sw.js` не кешує сторонні origin.

---

## Ручна перевірка перед релізом

Перед публікацією:

1. Відкрити сайт онлайн.
2. Переконатися, що service worker зареєстрований.
3. Перезавантажити сторінку.
4. Вимкнути інтернет або ввімкнути offline у DevTools.
5. Перезавантажити сторінку.
6. Перевірити, що гра відкривається.
7. Перевірити, що рівень запускається.
8. Перевірити, що assets видно.
9. Перевірити, що після деплою нової версії сторінка оновлюється.

---

## Checklist після ES-модульного рефакторингу

Після переходу на `type="module"` обов'язково:

- [ ] Оновити `APP_SHELL` у `sw.js`.
- [ ] Додати всі нові JS-модулі до кешу.
- [ ] Видалити зі списку старі JS-файли.
- [ ] Змінити `STATIC_CACHE` на нову версію.
- [ ] Перевірити offline.
- [ ] Перевірити `/go` на GitHub Pages.
- [ ] Перевірити встановлення PWA на мобільному пристрої.

---

## Типові проблеми

### Стара версія гри після оновлення

Причина: не змінено `STATIC_CACHE` або service worker ще не активувався.

Рішення:

- bump cache version;
- перевірити `activate` cleanup;
- у DevTools виконати unregister service worker під час локальної перевірки.

---

### Гра працює локально, але не працює на `/go`

Причина: абсолютні шляхи.

Рішення:

- замінити `/js/...` на `./js/...`;
- замінити `/css/...` на `./css/...`;
- замінити `/assets/...` на `./assets/...`;
- перевірити `manifest.json`;
- перевірити `navigator.serviceWorker.register('./sw.js')`.

---

### Offline відкриває тільки offline.html, а не гру

Причина: не всі файли додані в `APP_SHELL` або вони не закешувалися.

Рішення:

- перевірити, що `cache.addAll(APP_SHELL)` не падає;
- перевірити, що всі файли існують;
- перевірити DevTools → Application → Cache Storage.
