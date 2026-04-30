# PWA.md — offline-first план для Ravlyk Artist

Ravlyk Artist має бути зручним для школи: інтернет може бути нестабільним, але гра має відкриватися й працювати після першого завантаження. PWA треба реалізувати просто, без зайвої складності.

---

## 1. Ціль PWA

MVP PWA має забезпечити:

- відкриття сайту без інтернету після першого візиту;
- кешування HTML/CSS/JS/assets;
- коректну offline-сторінку;
- можливість додати сайт на головний екран планшета;
- контрольоване оновлення кешу;
- відсутність кешування персональних даних.

---

## 2. Файли, які треба додати

```text
manifest.json
sw.js
offline.html
assets/icons/icon-192.png
assets/icons/icon-512.png
assets/icons/maskable-512.png
```

Опційно:

```text
assets/icons/apple-touch-icon.png
```

---

## 3. manifest.json

Приклад:

```json
{
  "name": "Ravlyk Artist",
  "short_name": "Равлик",
  "description": "Навчальне алгоритмічне малювання для дітей",
  "lang": "uk",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "background_color": "#fff7e8",
  "theme_color": "#f5962a",
  "icons": [
    {
      "src": "assets/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "assets/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "assets/icons/maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

В `index.html` додати:

```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#f5962a">
```

---

## 4. Service worker стратегія

Для цього проєкту достатньо простого cache-first для власних статичних файлів.

Не треба складний Workbox, поки проєкт малий.

### Кешувати

- `/` або `index.html`;
- `offline.html`;
- `css/*.css`;
- `js/**/*.js`;
- `assets/fonts/*.woff2`;
- `assets/icons/*.png`;
- `manifest.json`.

### Не кешувати

- сторонні домени;
- аналітику;
- API, якщо колись з’явиться;
- користувацький контент;
- персональні дані.

---

## 5. Приклад sw.js

```js
const CACHE_NAME = 'ravlyk-artist-v1';

const CORE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/responsive.css',
  './css/accessibility.css',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return Response.error();
      });
    })
  );
});
```

У production треба автоматизувати список файлів або уважно оновлювати його після змін.

---

## 6. Реєстрація service worker

У `js/main.js` або окремому `js/pwa/register-sw.js`:

```js
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
```

Викликати після ініціалізації застосунку.

---

## 7. offline.html

Має бути проста сторінка українською:

```html
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Немає інтернету — Равлик</title>
</head>
<body>
  <main>
    <h1>Немає інтернету</h1>
    <p>Якщо ти вже відкривав гру на цьому пристрої, спробуй оновити сторінку.</p>
    <a href="./">Повернутися до гри</a>
  </main>
</body>
</html>
```

---

## 8. Оновлення кешу

Для ранньої версії достатньо змінювати:

```js
const CACHE_NAME = 'ravlyk-artist-v2';
```

Пізніше можна додати повідомлення:

```text
Доступна нова версія. Оновити?
```

Але для MVP це не обов’язково.

---

## 9. PWA і privacy

Service worker не має зберігати:

- імена;
- результати дітей;
- ідентифікатори;
- персональні налаштування;
- аналітичні дані.

PWA кеш — тільки для файлів застосунку.

---

## 10. PWA test checklist

- [ ] `manifest.json` валідний.
- [ ] Іконки існують і відкриваються.
- [ ] Service worker реєструється.
- [ ] Після першого відкриття сайт працює offline.
- [ ] `offline.html` показується при navigation fallback.
- [ ] Оновлення кешу не ламає сайт.
- [ ] Немає кешування сторонніх доменів.
- [ ] Lighthouse PWA не має критичних помилок.
- [ ] На iPad сайт відкривається коректно.

---

## 11. Що реалізувати першочергово

1. Self-host fonts, щоб PWA не залежав від Google Fonts.
2. Додати `manifest.json`.
3. Додати іконки.
4. Додати `offline.html`.
5. Додати `sw.js`.
6. Додати реєстрацію service worker.
7. Перевірити offline у DevTools.
8. Додати PWA-чекліст у релізний процес.
