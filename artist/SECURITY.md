# SECURITY.md — безпека Ravlyk Artist

---

## 1. Поточна модель ризиків

**Вирішено після Фази 1:**
- ✅ `instructionHtml` → `instruction` + `textContent` (XSS прибрано)
- ✅ Legacy-файли ізольовано у `legacy/`, не активні
- ✅ Execution limits — вкладені repeat не зависять браузер
- ✅ Stop button — runtime можна перервати

**Вирішено після аудиту безпеки (Фаза 3):**
- ✅ Весь `innerHTML` замінено — проєкт повністю `innerHTML`-free
- ✅ SVG-іконки монтуються через `DOMParser` + `replaceChildren()`, не через `innerHTML`
- ✅ Очищення DOM (`lessonNav`, `paletteList`, `workspaceInner`, `guideLayer`) через `replaceChildren()`

**Залишаються:**
- ⚠️ Google Fonts підключено зовні — треба self-host для повного CSP
- ⚠️ Немає CSP заголовків (P3)
- ⚠️ Немає service worker (P3)

---

## 2. Головне правило

Проєкт не приймає і не рендерить неперевірений HTML.

Заборонено:
- `innerHTML` — будь-де, без винятків
- HTML-теги в полі `instruction`
- User-generated HTML будь-де

Дозволено:
- `textContent` для всіх текстів
- `document.createElement` + DOM API для побудови UI
- `DOMParser` для монтування статичних SVG з `icons.js`
- `replaceChildren()` для очищення контейнерів

---

## 3. Політика щодо дитячих даних

Не збирати: ім'я, прізвище, клас, школу, email, IP, результати конкретної дитини.

Дозволено:
- JS state (пам'ять вкладки)
- `sessionStorage` для технічного прогресу

Не використовувати `localStorage` за замовчуванням — на шкільному комп'ютері можуть працювати різні діти.

---

## 4. XSS-захист (реалізовано)

**До (Фаза 0):**
```js
dom.instructionText.innerHTML = lesson.instructionHtml; // ❌
```

**Після (Фаза 1):**
```js
dom.instructionText.textContent = lesson.instruction;   // ✅
```

Тест `lessons use instruction instead of instructionHtml` — у `tests/art.core.test.js`.

---

## 5. Execution limits (реалізовано)

```js
// js/runtime/execution-limits.js
MAX_EXPANDED_ACTIONS = 500
MAX_REPEAT_COUNT     = 20
MAX_NESTING_DEPTH    = 4
```

Перевіряється в `validateProgram()` до запуску. При перевищенні — дружнє повідомлення, runtime не запускається.

---

## 6. Content Security Policy (планується, P3)

Після self-host fonts:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  form-action 'none';
```

Для Cloudflare Pages — `_headers` файл (P3.4).

Поки Google Fonts:
```
style-src 'self' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
```

---

## 7. Inline SVG

SVG-рядки зберігаються як константи в `js/ui/icons.js`. Монтуються виключно через `DOMParser`:

```js
function parseSvg(svgString) {
  return new DOMParser().parseFromString(svgString, 'image/svg+xml').documentElement;
}
snailElement.replaceChildren(parseSvg(snailSvg));
```

Це безпечно, тому що:
- SVG є статичним рядком у репозиторії
- `DOMParser` з типом `image/svg+xml` не виконує `<script>` всередині SVG
- Результат — DOM-елемент, а не рядок — `innerHTML`-sink відсутній

Майбутнє (P3): перенести в `assets/icons/snail.svg` та завантажувати через `fetch`.

---

## 8. Security checklist

- [x] Немає активних legacy-файлів
- [x] **Проєкт повністю `innerHTML`-free** — жодного `innerHTML` в JS-коді
- [x] SVG монтується через `DOMParser`, а не через `innerHTML`
- [x] Усі UI-тексти через `textContent`
- [x] Очищення DOM через `replaceChildren()` замість `innerHTML = ''`
- [x] Є execution limit
- [x] Є кнопка Stop
- [x] Є дружні повідомлення про помилки
- [x] Немає cookies (ніколи не було)
- [x] Немає збору персональних даних
- [ ] Google Fonts self-hosted (P3)
- [ ] CSP налаштовано (P3)
- [ ] `X-Content-Type-Options: nosniff` (P3)
- [ ] `Referrer-Policy: no-referrer` (P3)
- [ ] Service worker кешує тільки власні файли (P3)
