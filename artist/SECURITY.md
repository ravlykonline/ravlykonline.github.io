# SECURITY.md — безпека Ravlyk Artist

Ravlyk Artist — дитячий освітній сайт. Навіть якщо він статичний і простий, безпека має бути закладена з самого початку: мінімум зовнішніх залежностей, нуль персональних даних, контроль HTML, CSP, offline-first і передбачувана поведінка у шкільному середовищі.

---

## 1. Поточна модель ризиків

Зараз проєкт:

- не має backend;
- не має логіну;
- не має API;
- не має платежів;
- не має користувацького контенту;
- не використовує cookies;
- не зберігає персональні дані;
- не має зовнішніх JS-бібліотек.

Це дуже добре для дитячого продукту.

Поточні ризики:

1. `instructionHtml` рендериться через `innerHTML`.
2. У `ui/icons.js` є великі inline SVG-рядки, які також вставляються як HTML.
3. Підключаються Google Fonts.
4. Немає CSP.
5. Немає service worker/offline security policy.
6. Немає формального правила щодо `localStorage`/`sessionStorage`.
7. Є legacy-файли, які можуть випадково стати активними.

---

## 2. Головне правило

Проєкт не має приймати або рендерити неперевірений HTML.

Особливо заборонено:

- вставляти тексти рівнів через `innerHTML`, якщо вони можуть редагуватися не розробником;
- дозволяти в рівнях довільні HTML-теги;
- завантажувати рівні з Google Sheet/CMS/GitHub raw без sanitize;
- додавати user-generated HTML;
- зберігати й потім рендерити введений користувачем HTML.

---

## 3. Політика щодо дитячих даних

За замовчуванням не збирати:

- ім’я дитини;
- прізвище;
- клас;
- школу;
- email;
- телефон;
- фото;
- IP на власному backend;
- результати конкретної дитини;
- аналітику на рівні користувача.

Дозволено:

- локальний стан у пам’яті вкладки;
- `sessionStorage` для технічного прогресу в межах поточної сесії;
- анонімна загальна аналітика тільки після окремого рішення і з privacy-first налаштуваннями.

Не використовувати `localStorage` для прогресу за замовчуванням, бо на шкільному комп’ютері можуть працювати різні діти.

---

## 4. Storage policy

### MVP

- Workspace зберігається тільки в JS state.
- Пройдені рівні можна зберігати в `sessionStorage`.
- Після закриття вкладки все починається з нуля.

### Опційно пізніше

Можна додати перемикач:

```text
Зберігати прогрес на цьому пристрої
```

Тільки після явної дії користувача можна використовувати `localStorage`.

Обов’язково додати:

```text
Очистити прогрес на цьому пристрої
```

---

## 5. XSS-захист

### Проблема

Зараз є:

```js
dom.instructionText.innerHTML = lesson.instructionHtml;
```

Це треба замінити.

### Рекомендоване рішення

Використовувати структуровані інструкції:

```js
instruction: [
  { type: 'text', value: 'Проведи Равлика ' },
  { type: 'strong', value: 'вниз на 4 клітинки' },
  { type: 'text', value: '.' }
]
```

Рендерити через `textContent` і `document.createElement`:

```js
function renderInstruction(parts, container) {
  container.replaceChildren();

  for (const part of parts) {
    if (part.type === 'strong') {
      const strong = document.createElement('strong');
      strong.textContent = part.value;
      container.appendChild(strong);
      continue;
    }

    container.appendChild(document.createTextNode(part.value));
  }
}
```

### Тимчасове рішення

Якщо треба залишити HTML, дозволити тільки whitelist:

- `strong`;
- `em`;
- `br`.

Все інше видаляти.

---

## 6. Inline SVG

Inline SVG-равлик допустимий, якщо:

- SVG є статичним файлом/рядком у репозиторії;
- не містить скриптів;
- не містить зовнішніх посилань;
- не формується з користувацьких даних.

Краще в майбутньому перенести SVG у:

```text
assets/icons/snail.svg
```

І вставляти через `<img>` або безпечний loader.

---

## 7. Content Security Policy

Після self-host fonts рекомендований CSP:

```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none';
```

Для Cloudflare Pages можна налаштувати `_headers`:

```text
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), accelerometer=(), gyroscope=(), magnetometer=()
```

Якщо тимчасово залишаються Google Fonts:

```http
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
```

Але краще прибрати Google Fonts і self-host `Nunito`.

---

## 8. Зовнішні залежності

Для MVP бажано не додавати зовнішні JS-залежності.

Дозволено:

- власний JS;
- власний CSS;
- self-host fonts;
- self-host icons.

Не додавати без сильного обґрунтування:

- важкі UI-фреймворки;
- сторонні drag-and-drop бібліотеки;
- analytics scripts;
- CDN-скрипти;
- tracking pixels.

---

## 9. Service worker security

Service worker має кешувати тільки власні файли:

- HTML;
- CSS;
- JS;
- fonts;
- icons;
- offline page.

Не кешувати:

- сторонні домени;
- аналітику;
- неперевірені JSON-рівні;
- користувацький контент.

Деталі — у `PWA.md`.

---

## 10. Захист від зависань

Безпека — це не тільки XSS. Дитячий сайт не має зависати від помилкової програми.

Обов’язково реалізувати:

```js
const MAX_EXPANDED_ACTIONS = 500;
const MAX_REPEAT_COUNT = 20;
const MAX_NESTING_DEPTH = 4;
```

Якщо програма більша — не запускати.

Під час виконання має бути кнопка:

```text
Зупинити
```

---

## 11. Error handling

Не показувати технічні помилки дітям.

Погано:

```text
TypeError: Cannot read properties of undefined
```

Добре:

```text
Щось пішло не так. Спробуй очистити програму й запустити ще раз.
```

У dev-режимі можна логувати деталі в console.

---

## 12. GitHub Pages / Cloudflare Pages

Для раннього етапу GitHub Pages достатньо.

Для кращого security-аудиту бажано Cloudflare Pages, бо там легше:

- налаштувати security headers;
- контролювати кешування;
- додати `_headers`;
- додати redirects;
- перевірити PWA.

---

## 13. Security checklist перед релізом

- [ ] Немає активних legacy-файлів.
- [ ] Немає `innerHTML` для текстів рівнів.
- [ ] Усі UI-тексти через `textContent` або безпечний renderer.
- [ ] Google Fonts прибрано або обґрунтовано.
- [ ] CSP налаштовано.
- [ ] `X-Content-Type-Options: nosniff` налаштовано.
- [ ] `Referrer-Policy: no-referrer` налаштовано.
- [ ] `Permissions-Policy` забороняє непотрібні API.
- [ ] Немає cookies.
- [ ] Немає збору персональних даних.
- [ ] Немає сторонніх JS-CDN.
- [ ] Є execution limit.
- [ ] Є кнопка stop.
- [ ] Є дружні помилки.
- [ ] Service worker кешує тільки власні файли.

---

## 14. Що реалізувати першочергово

1. Замінити `instructionHtml` на structured instruction.
2. Додати `utils/sanitize.js`, якщо тимчасово потрібен HTML.
3. Self-host fonts.
4. Додати `_headers` для Cloudflare Pages.
5. Додати execution limits.
6. Додати stop/cancel runtime.
7. Прибрати legacy-файли з production.
8. Перевірити всі `innerHTML`.
9. Додати security smoke-test у документацію релізу.
