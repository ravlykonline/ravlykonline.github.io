# TESTING.md — тести «Равлика Художника»

## Команди

```bash
npm --prefix artist test     # усі art.*.test.js (node, без фреймворків)
npm run test:unit            # кореневі тести, включно з tests/artistCodegen.test.js
npm run lint                 # eslint js/ sw.js artist/js/
npm run check                # precache + docs + test:unit + test:projects + partials + lint
```

Перед зеленим PR мають проходити всі чотири.

## Що де перевіряється

| Файл | Що |
|---|---|
| `tests/art.core.test.js` | turtle (рух, повороти, clamp, колір), runner, snail (трансформація, швидкості), codegen (точні рядки, setup, y-інверсія, вкладені цикли), history |
| `tests/art.goals.test.js` | злиття колінеарних відрізків, допуск 2 одиниці, зайві/відсутні лінії, колір, `free`, `requireBlocks`, зірки |
| `tests/art.blocks.test.js` | чисті функції робочої області (хвіст, вставка, вільні стоси, найближча точка), контури блоків, контраст кольорів блоків (обидва варіанти), відсутність hex у `blocks.css` |
| `tests/art.controls.test.js` | stepController, покрокове виконання, сеанс |
| `tests/art.levels.test.js` | усі 20 рівнів: `solution` дає 3★, порожня програма не проходить, «майже правильні» варіанти не проходять, фігура в межах поля, послідовність id, `startBlocks` |
| `tests/art.a11y.test.js` | `describeHeading/TurtleStatus/Ghost`, контраст текстових пар за токенами (≥ 4.5:1) і графіки/фокусу (≥ 3:1), живий статус і фокус-пастки в розмітці, `touch-action: none` лише на блоках |
| `../tests/artistCodegen.test.js` | **контракт codegen**: розв’язок кожного рівня → `buildProgramCode` → справжній `RavlykParser` + `validateProgramAst` + `createAstRuntime` → відрізки в координатах гри (y-інверсія) збігаються з рушієм гри (допуск 0.5); у коді немає `коли запущено`, `разів {`, `рухатися(`; кольори збігаються з `COLOR_REGISTRY`; приклади `intro.code` парсяться |

Новий рівень не потребує окремого тесту — його підхоплюють `art.levels` і `artistCodegen`. Нова команда мови або блок — з тестами в `art.core`/`art.blocks` і кореневому тесті.

## Ручна перевірка (браузер)

`node tests/e2e/server.js` → `http://127.0.0.1:4173/artist/index.html` (порт: `RAVLYK_PREVIEW_PORT`).

- Вʼюпорти: 1280×800, 1024×768, 768×1024, 414×896, 375×812, 360×740, 812×375 (ландшафт).
- Немає горизонтального скролу сторінки (`document.documentElement.scrollWidth === innerWidth`).
- Нижня панель на телефоні ≤ 72 px, кнопки ≥ 44×44.
- Рівні 1, 7, 13, 18 проходяться лише пальцем: перетягування з палітри (pointer events `touch`), тап по роту циклу, −/+ і швидкі кути, Старт.
- Клавіатура: Tab до палітри, Enter додає блок, Ctrl+Enter запускає, Esc закриває модалки, фокус повертається.
- Модалки: Tab не виходить за межі, решта сторінки недоступна.

## Чого не покрито

Реальні пристрої (iOS/Android), екранні читачі, Playwright-сценарії для artist (кореневі e2e покривають лише головний сайт). Див. `TASKS.md`.
