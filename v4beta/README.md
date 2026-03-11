# РАВЛИК

**РАВЛИК** — україномовна текстова мова програмування для дітей з миттєвим візуальним результатом у браузері.

Проєкт допомагає перейти від блокового мислення до справжнього коду через малювання, базову логіку, функції та простий ігровий режим.

## Спробувати онлайн

- Редактор: [ravlyk.org](https://ravlyk.org/)
- Посібник: [ravlyk.org/manual.html](https://ravlyk.org/manual.html)
- Уроки: [ravlyk.org/lessons.html](https://ravlyk.org/lessons.html)

## Що вміє РАВЛИК

- рух, повороти, колір, фон, товщина, керування олівцем
- цикли, умови, змінні, функції
- ігровий режим з реакцією на клавіші
- дружні повідомлення про помилки

Приклад:

```ravlyk
колір червоний
повторити 4 (
  вперед 100
  праворуч 90
)
```

## Документація

Canonical набір документації:
- [`README.md`](README.md) — короткий огляд
- [`TECHNICAL_GUIDE.md`](TECHNICAL_GUIDE.md) — engineering source of truth
- [`DESIGN_GUIDE.md`](DESIGN_GUIDE.md) — UI/design source of truth

Роль цього файлу:
- швидко пояснити, що таке РАВЛИК
- дати посилання на продукт і базовий старт для розробника
- не дублювати технічні деталі з `TECHNICAL_GUIDE.md` або UI-правила з `DESIGN_GUIDE.md`

## Розробка

- Стек: HTML, CSS, JavaScript ES modules, Canvas 2D
- Unit-тести: `npm run test:unit`
- E2E-тести: `npm run test:e2e`
- Encoding-перевірка: `node --experimental-default-type=module tests/encoding.test.js`

## Автор

Артем Кисляков, учитель інформатики.

- Facebook: [panaptem](https://www.facebook.com/panaptem)
- Email: [info@ravlyk.org](mailto:info@ravlyk.org)

© 2025-2026 Мова програмування РАВЛИК
