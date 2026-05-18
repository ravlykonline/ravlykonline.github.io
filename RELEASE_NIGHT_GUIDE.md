# Release Night Guide

Актуально для переносу з `v4beta` на основний корінь сайту в ніч з `2026-03-13` на `2026-03-14`.

## Поточний орієнтир

- Актуальний release version: `2026-03-13-2`
- Повний unit-набір проходить через `npm run test:unit`
- Повний e2e-набір проходить через `npm run test:e2e -- --reporter=dot`
- Cross-browser smoke для `firefox-smoke` і `webkit-smoke` проходить окремо

## Що критично закрити до переносу

1. Зафіксувати релізний стан у Git.
2. Не переносити сайт ручним видаленням кореня.
3. Не видаляти `v4beta` одразу після копіювання.

## Безпечний сценарій переносу

Запускай з каталогу `v4beta`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\promote-to-root.ps1
```

Це dry-run. Якщо план виглядає правильно, запускай:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\promote-to-root.ps1 -Apply
```

Що зробить скрипт:

- збере backup поточного публічного кореня в `old\deploy-backup-YYYYMMDD-HHMMSS`
- замінить у корені тільки публічні файли сайту
- не чіпатиме `.git`, `.github`, `old`, `v4beta`
- не потягне в прод `node_modules`, `tests`, `package*.json`, `playwright.config.js`
- прибере старий проблемний файл `resourсes.html`, якщо він випадково лежить у корені

## Порядок дій у ніч релізу

1. Перевір `git status --short` і переконайся, що в коміт потрапляє лише те, що справді має їхати в реліз.
2. Якщо змінювалися публічні assets, синхронізуй release version:
   `npm run release:sync-version -- 2026-03-13-2`
3. Запусти:
   `npm run test:unit`
4. Запусти:
   `npm run test:e2e -- --reporter=dot`
5. Переконайся, що cross-browser smoke для `firefox-smoke` і `webkit-smoke` теж зелений.
6. Запусти dry-run:
   `powershell -ExecutionPolicy Bypass -File .\scripts\promote-to-root.ps1`
7. Якщо dry-run коректний, виконай:
   `powershell -ExecutionPolicy Bypass -File .\scripts\promote-to-root.ps1 -Apply`
8. Перевір уже з кореня сайту:
   `/`, `/manual.html`, `/lessons.html`, `/quiz.html`, `/resources.html`, `/teacher_guidelines.html`, `/advice_for_parents.html`, `/about.html`
9. В окремому приватному вікні перевір:
   `https://ravlyk.org/`
10. Не видаляй `v4beta` тієї ж ночі. Залиш її до ранкового smoke-check.

## Що перевірити відразу після `-Apply`

- головна сторінка відкривається без білого екрана
- `manual.html`, `lessons.html`, `quiz.html`, `resources.html` відкриваються без 404
- service worker реєструється
- після одного теплого завантаження працює offline reload
- кнопки `download`, `share`, accessibility-панель працюють
- sitemap і robots доступні в корені

## Швидкий rollback

Якщо щось зламалось:

1. Знайди останню папку `old\deploy-backup-YYYYMMDD-HHMMSS`.
2. Скопіюй з неї назад ті самі публічні каталоги й файли.

Мінімальний аварійний набір:

- `assets`
- `css`
- `js`
- `index.html`

Повний типовий набір:

- `assets`, `css`, `js`
- `index.html`, `manual.html`, `lessons.html`, `resources.html`, `quiz.html`
- `teacher_guidelines.html`, `advice_for_parents.html`, `about.html`
- `robots.txt`, `sitemap.xml`, `site.webmanifest`
- favicon та png-іконки

## Порада по Git після релізу

- не роби `git add .`
- коміть вибірково, щоб не втягнути `old/`
- `v4beta` краще видаляти лише після того, як стане зрозуміло, що rollback уже не потрібен
