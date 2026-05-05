# ACCESSIBILITY.md — доступність і дитячий UX Ravlyk Artist

---

## 1. Головний принцип

Усі ключові дії працюють щонайменше трьома способами:
1. мишкою;
2. дотиком на планшеті;
3. клавіатурою.

Drag-and-drop — зручна додаткова взаємодія, але не єдина.

---

## 2. Поточний стан (після Фаз 1–2)

**Вирішено:**
- ✅ Palette blocks — кнопки з українськими мітками
- ✅ Кнопки ↑ ↓ ↖ × на кожному блоці (альтернатива drag)
- ✅ `+ Додати` на repeat + insertTargetId механізм
- ✅ Keyboard shortcuts (↑↓ Delete Ctrl+Z Ctrl+Y Ctrl+Enter Escape Enter-on-repeat)
- ✅ Undo/redo доступне через клавіатуру і кнопки
- ✅ Focus trap у success modal і reset modal
- ✅ Success modal фокусує кнопку "Наступний рівень"
- ✅ Reset modal фокусує "Скасувати" (безпечна дія)
- ✅ `canvas-status` live region — оновлюється при кожному кроці
- ✅ `sr-announcer` — повідомляє успіх
- ✅ Весь UI українською
- ✅ Блоки мають `tabindex="0"`, `data-block-id`, keyboard event handlers

**Залишається:**
- ⬜ Reduced motion — не сповільнювати анімацію при `prefers-reduced-motion`
- ⬜ Canvas goal description — текстовий опис мети рівня для screen reader
- ⬜ Повна Playwright keyboard-only E2E перевірка
- ⬜ Lighthouse Accessibility аудит

---

## 3. Keyboard shortcuts (реалізовано)

| Комбінація | Дія | Контекст |
|---|---|---|
| `Tab` | перехід між зонами | global |
| `Enter` / `Space` | активувати кнопку | global |
| `↑` / `↓` | перемістити блок вгору/вниз | фокус на блоці |
| `Delete` / `Backspace` | видалити блок | фокус на блоці |
| `Escape` | закрити модалку / скасувати insertTarget | global |
| `Enter` на repeat | обрати як ціль вставки | фокус на repeat-блоці |
| `Ctrl+Z` | скасувати | global (не в input) |
| `Ctrl+Y` | повернути | global (не в input) |
| `Ctrl+Enter` | запустити програму | global (не в input) |

---

## 4. Canvas accessibility (базова)

Є `id="canvas-status" class="sr-only"` — оновлюється під час виконання:
```text
Равлик перемістився до стовпця 5, рядку 3.
```

Є `id="sr-announcer"` — оголошує успіх:
```text
Ти намалював пряму лінію.
```

Планується (P3): розширений опис мети рівня для screen reader.

---

## 5. Модальні вікна (реалізовано)

Обидві модалки мають:
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`
- focus trap (`js/utils/focus-trap.js`)
- Tab замкнено в межах діалогу

| Модалка | Перший фокус | Escape |
|---|---|---|
| Success | `btn-next` | — |
| Reset confirm | `btn-reset-cancel` | закриває ✅ |

---

## 6. Рух і анімації

`prefers-reduced-motion` частково підтримується в CSS.
Повна підтримка (уповільнення runtime, skip animations) — P3.

---

## 7. Візуальна доступність

- Focus outline видимий (CSS `:focus` на `.wb`)
- Touch targets ≥ 40×40 px (кнопки footer, palette)
- Ctrl-кнопки блоків (`.wb-ctrl-btn`) — 1.6rem × 1.6rem (мінімум для клавіатури)
- Помилки мають текст, не тільки колір

---

## 8. Чекліст доступності

- [x] Всі блоки палітри — кнопки
- [x] Блоки можна додавати без drag-and-drop
- [x] Блоки можна переміщати (↑↓) без drag-and-drop
- [x] Блоки можна вкладати в repeat (insertTarget) без drag
- [x] Keyboard shortcuts реалізовано
- [x] Focus outline видимий
- [x] Live region для canvas status
- [x] Модалки мають focus trap
- [x] Escape працює очікувано
- [x] Reset confirmation фокусується на безпечній дії
- [x] UI повністю українська
- [ ] Reduced motion повністю підтримано (P3)
- [ ] Canvas goal description для screen reader (P3)
- [ ] Lighthouse Accessibility ≥ 90 (P3)
- [ ] Playwright keyboard-only E2E test (P3)

---

## 9. Правила для нових фіч

Кожна нова взаємодія (зокрема turtle-блоки) має:
- Кнопку в UI
- `aria-label`
- keyboard shortcut або tabindex
- live announcement при зміні стану

Нові параметричні блоки (вперед, праворуч, ліворуч):
- input має `aria-label` з назвою параметра
- input має `title`
- зміна параметра зберігається в history (undo/redo)
