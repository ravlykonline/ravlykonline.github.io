# TESTING.md — стратегія тестування

Цей документ описує, як тестувати гру «Равлик-мандрівник», які сценарії є критичними і які тести треба додавати перед розширенням проєкту.

---

## 1. Мета тестування

Тестування має захищати не лише код, а й дитячий досвід.

Критично перевіряти:

- гра стартує;
- Равлик рухається;
- яблука збираються;
- NPC відкривають завдання;
- правильна відповідь дає зірку;
- неправильна відповідь не ламає гру;
- completed NPC не дає повторну зірку;
- reload починає нову сесію;
- Service Worker не приховує стару версію;
- українські тексти не ламаються;
- keyboard/touch доступність працює.

---

## 2. Поточні тестові файли

```txt
tests/index.html
tests/test-game.js
tests/integration.html
tests/integration-test.js
tests/gameplay-integration.html
tests/gameplay-integration-test.js
tests/encoding-check.html
tests/encoding-check.js
```

Поточна модель тестування браузерна. Це нормально для проєкту без build-step.

---

## 3. Як запускати тести

Запустити локальний сервер із кореня проєкту:

```bash
python -m http.server 8080
```

Відкрити:

```txt
http://localhost:8080/tests/
```

Також вручну відкрити:

```txt
http://localhost:8080/tests/integration.html
http://localhost:8080/tests/gameplay-integration.html
http://localhost:8080/tests/encoding-check.html
```

---

## 4. Smoke test перед кожною зміною

Після будь-якої зміни коду перевірити:

- [ ] `index.html` відкривається без console errors;
- [ ] стартовий екран показується;
- [ ] кнопка старту працює;
- [ ] Равлик рухається мишею;
- [ ] Равлик рухається клавіатурою;
- [ ] яблуко збирається;
- [ ] score оновлюється;
- [ ] NPC підсвічується поруч;
- [ ] `Enter` відкриває діалог;
- [ ] неправильна відповідь показує “спробуй ще”;
- [ ] правильна відповідь дає зірочку;
- [ ] діалог закривається;
- [ ] completed NPC не дає другу зірку;
- [ ] reload починає нову гру.

---

## 5. Manual UX checklist

Перевірити як дитина, не як розробник:

- [ ] за 5 секунд зрозуміло, що робити;
- [ ] основна дія помітна;
- [ ] текст короткий;
- [ ] немає технічних повідомлень;
- [ ] помилка не звучить як покарання;
- [ ] завдання не перевантажене;
- [ ] на mobile кнопки достатньо великі;
- [ ] у темній темі все читається;
- [ ] у readable font mode все не розвалюється;
- [ ] reduced motion не залишає критичних дій невидимими.

---

## 6. Accessibility checklist

Перед release:

- [ ] можна пройти старт без миші;
- [ ] можна рухатися клавіатурою;
- [ ] можна взаємодіяти з NPC клавіатурою;
- [ ] modal має focus trap;
- [ ] Escape або кнопка повернення працюють, якщо передбачено;
- [ ] screen reader отримує важливі зміни через announcer;
- [ ] focus-visible помітний;
- [ ] інформація не передається лише кольором;
- [ ] touch targets достатньо великі;
- [ ] drag-and-drop не є єдиним способом відповіді;
- [ ] prefers-reduced-motion поважається.

---

## 7. Unit-style tests

Тестувати окремо чисті правила:

```txt
js/game/rules.js
js/core/motion.js
js/game/task-picker.js
js/tasks/task-registry.js
```

Приклади:

- `isNpcWithinRange()` повертає true/false правильно;
- `shouldCollectApple()` спрацьовує на правильній відстані;
- `pickNearestByDistance()` знаходить найближчий об'єкт;
- `TaskRegistry.createTask()` створює задачу з пулу;
- невідомий pool кидає помилку в dev-тесті.

---

## 8. Integration tests

Перевіряти взаємодію модулів:

```txt
IntroScene -> GameScene
GameScene -> DialogScene
DialogScene -> TaskRegistry
TaskRegistry -> taskType
DialogScene -> EventBus
EventBus -> ScoreSystem
ScoreSystem -> HUDController
```

Критичний сценарій:

```txt
start game
  -> approach NPC
  -> open task
  -> answer correctly
  -> emit puzzle:completed
  -> stars +1
  -> HUD updated
  -> NPC completed
```

---

## 9. Gameplay regression tests

Потрібні тести для:

- яблука не збираються двічі;
- NPC не дає зірочку двічі;
- після неправильного вибору можна спробувати ще;
- після правильного вибору кнопки блокуються;
- score не дублюється після повторного `bootGame()`;
- reload не відновлює попередній score.

---

## 10. Task data validation tests

Потрібно додати окрему перевірку всіх task-data.

Мінімальні правила:

- [ ] кожен pool існує;
- [ ] кожен entry має `type`;
- [ ] кожен `type` зареєстрований;
- [ ] кожен task type має `createTask`;
- [ ] кожен task type має `render`;
- [ ] `createTask()` повертає `type`;
- [ ] reward валідний;
- [ ] prompt не порожній;
- [ ] instructions не порожні;
- [ ] для choice-задач correctChoiceId є серед choices;
- [ ] немає дублікатів choice id.

Рекомендований майбутній файл:

```txt
tests/task-data-validation.js
```

---

## 11. World generation tests

Поточний світ генерується випадково. Випадковість треба тестувати багаторазово.

Рекомендований тест:

```js
for (let i = 0; i < 1000; i += 1) {
    const world = generateWorld({ seed: i });
    assertPlayerSpawnIsFree(world);
    assertApplesAreNotInsideObstacles(world);
    assertNpcsAreNotInsideObstacles(world);
    assertNpcsAreReachable(world);
}
```

Для цього спочатку треба винести генерацію світу з `GameScene` у чистий модуль.

---

## 12. PWA tests

Перевіряти:

- [ ] Service Worker install проходить;
- [ ] `offline.html` доступний;
- [ ] усі `STATIC_ASSETS` існують;
- [ ] cache version оновлена після зміни assets;
- [ ] localhost/dev не показує стару версію через кеш;
- [ ] після clear site data гра стартує коректно;
- [ ] offline режим не відновлює дитячий прогрес.

Рекомендований тест:

```txt
tests/pwa-assets-check.js
```

---

## 13. Encoding tests

Український текст має бути стабільним.

Перевіряти:

- [ ] `index.html` має UTF-8;
- [ ] JS-файли з українськими рядками читаються нормально;
- [ ] `i18n/uk.js` не містить битих символів;
- [ ] тести не показують mojibake;
- [ ] браузерна сторінка не має кракозябр.

Поточний файл:

```txt
tests/encoding-check.html
```

---

## 14. Mobile/touch testing

Перевірити в DevTools device mode і на реальному пристрої:

- [ ] touch movement працює;
- [ ] tap по світу не конфліктує з кнопками;
- [ ] dialog не виходить за межі екрана;
- [ ] кнопки задач натискаються пальцем;
- [ ] HUD не перекриває критичні елементи;
- [ ] viewport не має горизонтальної прокрутки;
- [ ] readable font mode не ламає layout.

---

## 15. Browser matrix

Мінімально перевіряти:

```txt
Chrome latest
Edge latest
Firefox latest
Safari iOS, якщо є доступ
Android Chrome, якщо є доступ
```

Якщо немає доступу до Safari/iOS, треба хоча б не використовувати API без перевірки підтримки.

---

## 16. Performance checks

Гра має бути легкою.

Перевірити:

- [ ] немає memory leak при відкритті/закритті діалогів;
- [ ] `render()` не створює нові DOM listeners кожен кадр;
- [ ] кількість DOM-елементів контрольована;
- [ ] немає важких layout thrashing операцій;
- [ ] анімація не ривками на слабкому пристрої;
- [ ] reduced motion зменшує анімаційне навантаження.

---

## 17. Regression tests for agents

Коли код змінює AI-агент, він має перевірити мінімум:

- [ ] старт гри;
- [ ] один збір яблука;
- [ ] один NPC puzzle success;
- [ ] один NPC puzzle wrong answer;
- [ ] reload resets session;
- [ ] немає console errors;
- [ ] тести в `tests/` відкриваються;
- [ ] Service Worker не заважає тесту.

---

## 18. Definition of done для зміни

Зміна готова, якщо:

- [ ] код не ламає session policy;
- [ ] `GameScene` не розрісся без потреби;
- [ ] task-data валідні;
- [ ] UI доступний із клавіатури;
- [ ] mobile не зламаний;
- [ ] PWA cache враховано;
- [ ] немає нових глобальних залежностей;
- [ ] немає персональних даних;
- [ ] тести або manual checklist пройдені;
- [ ] документація оновлена, якщо змінилася архітектура.

---

## 19. Що тестувати після конкретних змін

### Зміни в `GameScene`

Перевірити:

- рух;
- камеру;
- яблука;
- NPC;
- діалоги;
- HUD;
- mobile/touch.

### Зміни в `TaskRegistry`

Перевірити:

- усі типи задач;
- невідомий pool;
- невідомий type;
- правильну відповідь;
- неправильну відповідь.

### Зміни в `ScoreSystem`

Перевірити:

- яблука;
- зірки;
- повторний completed NPC;
- reload;
- HUD.

### Зміни в `sw.js`

Перевірити:

- install;
- activate;
- offline;
- cache version;
- clear site data;
- production preview.

---

## 20. Майбутній npm test

Поки проєкт не має build-step, але можна додати легкий `package.json`:

```json
{
  "scripts": {
    "serve": "npx http-server .",
    "test:manual": "echo Open http://localhost:8080/tests/",
    "check:pwa": "node tests/pwa-assets-check.js"
  },
  "devDependencies": {}
}
```

Не треба додавати важкий інструментарій без потреби.

---

## 21. Головне правило тестування

Тест вважається корисним, якщо він ловить реальну помилку, яку дитина, вчитель або розробник могли б побачити в грі.
