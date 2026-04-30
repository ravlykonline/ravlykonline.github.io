# PWA.md — Progressive Web App, offline mode і кеш

Цей документ описує PWA-частину проєкту: `manifest.json`, `sw.js`, `offline.html`, реєстрацію Service Worker і правила роботи з кешем.

---

## 1. Поточна PWA-модель

Проєкт має:

```txt
manifest.json
sw.js
offline.html
icons/icon-192.svg
icons/icon-512.svg
js/pwa/register-sw.js
```

`register-sw.js` реєструє Service Worker після завантаження сторінки.

`sw.js`:

- створює static cache;
- додає в кеш перелік `STATIC_ASSETS`;
- видаляє старі кеші при activate;
- для навігації повертає `offline.html`, якщо мережа недоступна;
- для статичних файлів спочатку шукає кеш, потім мережу.

---

## 2. Навіщо PWA цій грі

PWA корисний, бо:

- гра може відкриватися швидше;
- базовий offline mode корисний у школі;
- сайт можна додати на домашній екран;
- менше залежності від нестабільного інтернету.

Але PWA має ризик: браузер може показувати стару версію гри після оновлення коду.

Тому PWA треба підтримувати дисципліновано.

---

## 3. Сесійна політика і PWA

PWA не має порушувати сесійну політику.

Дозволено кешувати:

- HTML;
- CSS;
- JS;
- SVG icons;
- manifest;
- offline page.

Заборонено кешувати як “прогрес”:

- яблука;
- зірочки;
- completed NPC;
- відповіді дитини;
- результати сесії.

Offline mode має відкривати гру або offline page, але не відновлювати попередню дитячу сесію.

---

## 4. Поточний cache version

У `sw.js` є:

```js
const STATIC_CACHE = 'ravlyk-static-v6';
```

Коли змінюється будь-який файл зі списку `STATIC_ASSETS`, треба оновити версію кешу:

```js
const STATIC_CACHE = 'ravlyk-static-v7';
```

Якщо цього не зробити, користувач може бачити стару версію файлів.

---

## 5. Правило для `STATIC_ASSETS`

Усі файли в `STATIC_ASSETS` мають реально існувати.

Якщо в список додати файл, якого немає, install Service Worker може впасти.

Перед release перевірити:

- [ ] усі файли зі списку існують;
- [ ] усі нові JS-модулі додані в cache list;
- [ ] усі видалені файли прибрані з cache list;
- [ ] cache version оновлена;
- [ ] offline режим перевірено.

Рекомендовано додати автоматичний тест:

```txt
tests/pwa-assets-check.js
```

Він має читати `sw.js`, діставати `STATIC_ASSETS` і перевіряти, що кожен файл є в репозиторії.

---

## 6. Dev-режим і Service Worker

Service Worker часто заважає під час розробки, бо кешує старі файли.

Перед діагностикою багів треба очистити SW:

1. Відкрити DevTools.
2. Application.
3. Service Workers.
4. Натиснути Unregister.
5. Storage.
6. Clear site data.
7. Перезавантажити сторінку.

Альтернативний варіант на майбутнє — не реєструвати SW на localhost:

```js
export function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
            console.error('Service worker registration failed:', error);
        });
    });
}
```

Це зменшить кількість “привидних” багів у розробці.

---

## 7. Стратегія кешування

Поточна стратегія:

```txt
static assets: cache first, then network
navigation: network first, fallback to offline.html
```

Це нормально для маленької статичної гри.

Плюси:

- швидко;
- просто;
- offline працює;
- немає серверної залежності.

Мінуси:

- static файли можуть застарівати;
- треба вручну оновлювати cache version;
- треба вручну підтримувати список файлів.

---

## 8. Що робити при додаванні нового JS-файлу

1. Додати файл у репозиторій.
2. Перевірити, що він імпортується через ES modules.
3. Додати файл у `STATIC_ASSETS` у `sw.js`, якщо він потрібен offline.
4. Оновити `STATIC_CACHE` version.
5. Перевірити гру онлайн.
6. Очистити кеш.
7. Перевірити гру offline.
8. Запустити PWA asset check, коли він буде доданий.

---

## 9. Що робити при перейменуванні файлу

1. Оновити всі imports.
2. Оновити `STATIC_ASSETS`.
3. Прибрати старий шлях зі списку.
4. Оновити `STATIC_CACHE` version.
5. Очистити кеш у браузері.
6. Перевірити production/deploy preview.

---

## 10. Offline page

Файл:

```txt
offline.html
```

Призначення:

- показати зрозуміле повідомлення, якщо сторінка не може завантажитися;
- не лякати дитину технічним текстом;
- не вимагати дій, які дитина не зрозуміє.

Вимоги:

- українська мова;
- простий текст;
- без зовнішніх залежностей;
- бажано мати кнопку “Спробувати ще раз”;
- не містити аналітики або сторонніх scripts.

---

## 11. Manifest

Файл:

```txt
manifest.json
```

Поточні поля:

```json
{
  "name": "Равлик-бродилка",
  "short_name": "Равлик",
  "start_url": "./index.html",
  "display": "standalone",
  "background_color": "#7cb342",
  "theme_color": "#7cb342",
  "lang": "uk",
  "icons": [...]
}
```

При зміні бренду, назви або кольорів треба синхронізувати:

- `manifest.json`;
- `tokens.css`;
- `index.html` meta theme color;
- PWA icons;
- README.

---

## 12. Icons

Поточні іконки:

```txt
icons/icon-192.svg
icons/icon-512.svg
```

Для ширшої PWA-сумісності в майбутньому можна додати PNG:

```txt
icons/icon-192.png
icons/icon-512.png
icons/maskable-192.png
icons/maskable-512.png
```

Але це не критично для першої стабільної версії.

---

## 13. Update UX

Зараз Service Worker використовує `skipWaiting()` і `clients.claim()`.

Це спрощує оновлення, але в майбутньому може бути корисний м'який UX:

```txt
Доступна нова версія гри. Оновити?
```

Для поточної простої гри це не обов'язково, але якщо проєкт буде активно оновлюватися, варто додати.

---

## 14. PWA і безпека

Service Worker має кешувати лише власні статичні ресурси.

Не кешувати:

- сторонні scripts;
- аналітику;
- API-відповіді з персональними даними;
- дитячі результати;
- відповіді;
- профілі.

Якщо з'явиться API, стратегію кешування треба переглянути окремо.

---

## 15. Рекомендований майбутній рефакторинг PWA

### Крок 1

Вимкнути SW на localhost або додати dev-флаг.

### Крок 2

Додати тест на існування `STATIC_ASSETS`.

### Крок 3

Додати release checklist для cache version.

### Крок 4

Додати update notification.

### Крок 5

Розглянути автоматичну генерацію `STATIC_ASSETS`, якщо файлів стане багато.

---

## 16. PWA release checklist

Перед деплоєм:

- [ ] `STATIC_CACHE` version оновлена;
- [ ] усі нові файли додані в `STATIC_ASSETS`;
- [ ] видалені файли прибрані з `STATIC_ASSETS`;
- [ ] `offline.html` відкривається;
- [ ] install SW проходить без помилок;
- [ ] reload після deploy показує нову версію;
- [ ] offline mode перевірено;
- [ ] DevTools Console без SW-помилок;
- [ ] session state не відновлюється після reload;
- [ ] localStorage не містить дитячих результатів.

---

## 17. Типові проблеми

### Проблема: “Я змінив JS, але браузер показує стару поведінку”

Ймовірна причина: Service Worker cache.

Рішення:

- Unregister SW;
- Clear site data;
- оновити `STATIC_CACHE`;
- перевірити `STATIC_ASSETS`.

### Проблема: “Offline не працює”

Перевірити:

- чи зареєстрований SW;
- чи install не впав;
- чи всі assets існують;
- чи сторінка відкрита через http/https, а не file://.

### Проблема: “Після деплою у частини дітей стара версія”

Перевірити:

- чи змінена cache version;
- чи `skipWaiting()` спрацював;
- чи browser не тримає стару вкладку;
- чи немає CDN cache поверх SW.

---

## 18. Головне правило

PWA має допомагати грі працювати стабільно, але не має приховувати баги й не має зберігати дитячий прогрес.
