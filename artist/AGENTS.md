# AGENTS.md — інструкції для Codex, Claude Code та інших AI-агентів

Перед будь-якими змінами прочитати цей файл, `README.md`, `ARCHITECTURE.md`, `LEVELS.md`, `SECURITY.md`, `ACCESSIBILITY.md`, `TESTING.md` і `TASKS.md`.

---

## 1. Контекст проєкту

Ravlyk Artist — дитячий браузерний редактор алгоритмічного малювання. Діти складають програму з блоків, запускають її, а Равлик малює шлях. Проєкт є частиною екосистеми мови програмування **РАВЛИК** — першої україномовної текстової мови програмування для дітей.

Проєкт має бути: простим, україномовним, без реєстрації, без backend, без персональних даних, offline-first, доступним без drag-and-drop, придатним для школи.

---

## 2. Поточний стан (після Фаз 1–2)

**Завершено:**
- P0: Legacy ізольовано, package.json, UI українською, XSS прибрано, execution limits, Stop, exact-path
- P1: Кнопки блоків (↑↓↖×), keyboard shortcuts, undo/redo, focus trap, canvas text

**В роботі:**
- P2: Turtle engine (РАВЛИК-команди: вперед, праворуч, ліворуч, підняти, опустити)

**Заплановано:**
- P3: validate-levels, PWA, security headers, CI

---

## 3. Найважливіше правило

Production-код — модульна версія:

```text
index.html
css/*.css
js/main.js
js/core/*.js
js/data/*.js
js/domain/*.js
js/runtime/*.js
js/state/*.js
js/utils/*.js
js/ui/*.js
```

`legacy/` — не редагувати, не імпортувати.

---

## 4. Заборонено

- Додавати backend, реєстрацію, збір персональних даних
- Додавати сторонні JS-CDN без обґрунтування
- Робити drag-and-drop єдиним способом взаємодії
- Використовувати `innerHTML` для текстів з даних
- Запускати програму без execution limit
- Зберігати прогрес у `localStorage` за замовчуванням
- Змішувати grid-logic і turtle-logic без явного `mode`
- Залишати англомовні UI-рядки або англомовні команди в codegen
- Редагувати `legacy/`

---

## 5. Правила для команд мови РАВЛИК

**Turtle-блоки мають відповідати синтаксису мови РАВЛИК:**

| Дія | Тип блоку | Мітка UI | Codegen |
|---|---|---|---|
| Рух вперед | `turtle_forward` | `вперед` | `вперед N` |
| Поворот праворуч | `turtle_right` | `праворуч` | `праворуч N` |
| Поворот ліворуч | `turtle_left` | `ліворуч` | `ліворуч N` |
| Підняти олівець | `turtle_pen_up` | `підняти` | `підняти` |
| Опустити олівець | `turtle_pen_down` | `опустити` | `опустити` |
| Колір | `turtle_color` | `колір` | `колір назва` |
| Повтор | `repeat` | `повторити` | `повторити N разів { ... }` |

Не використовувати: `move_forward`, `turn_left/right`, `set_color`, `jump_forward` як UI labels — це внутрішні ідентифікатори типів.

---

## 6. Архітектурний напрям

```text
data → domain → runtime → state → ui
```

- `data/` — декларативні дані, без DOM
- `domain/` — pure functions (turtle model)
- `runtime/` — execution engine, limits
- `state/` — history, persistence
- `ui/` — DOM, events, render

---

## 7. Правила для JavaScript

- ES-модулі, без глобальних змінних
- DOM-код тільки в `ui/`
- Runtime/engine не працює з DOM напряму
- Нова логіка → unit-тест в `tests/art.core.test.js`
- Turtle domain-логіка → pure functions у `js/domain/turtle.js`
- Повідомлення для дітей: дружні, без stack trace

---

## 8. Правила для CSS

- Токени з `css/tokens.css`
- Без hardcoded кольорів поза токенами
- Touch targets ≥ 40×40 px
- Focus outline видимий
- Reduced motion підтримується

---

## 9. Правила для рівнів

- Всі тексти українською
- `mode: 'grid'` або `mode: 'turtle'` обов'язково
- Toolbox — тільки існуючі block types
- `instruction` — plain text, без HTML
- Turtle-рівні використовують РАВЛИК-команди

---

## 10. Правила для accessibility

- Кожна нова взаємодія має keyboard alternative
- Модальні вікна мають focus trap
- Canvas має textual status
- Нові блоки — `tabindex="0"`, `data-block-id`, keyboard handlers

---

## 11. Обов'язкові тести після змін

```bash
npm test
```

Очікуваний результат: **23/23 ok** (або більше після нових тестів).

Якщо змінювали рівні:
```bash
npm run validate:levels   # після реалізації tools/validate-levels.js
```

---

## 12. Порядок виконання задач

1. ✅ P0 — стабілізація
2. ✅ P1 — доступність
3. 🚧 P2 — turtle/Artist
4. ⬜ P3 — PWA, CI, polish

---

## 13. Формат відповіді агента після роботи

```text
Зроблено:
- ...

Змінені файли:
- ...

Тести: npm test: X/Y ok

Що наступне:
- ...
```
