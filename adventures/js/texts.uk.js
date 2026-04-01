(function () {
  const app = (window.SnailGame = window.SnailGame || {});

  app.textUk = {
    static: {
      pageTitle: "Пригоди Равлика",
      skipLink: "Перейти до поля гри",
      sidebarAria: "Панель інструментів",
      logoAria: "Пригоди Равлика — гра з алгоритмами.",
      logoName: "Пригоди",
      logoSub: "Равлика",
      commandsLabel: "Команди",
      paletteAria: "Команди для равлика",
      runAria: "Запустити алгоритм",
      runTitle: "Запустити",
      clearAria: "Очистити поле",
      clearTitle: "Очистити",
      levelBarAria: "Поточний рівень",
      levelNavAria: "Навігація рівнями",
      prevLevelAria: "Попередній рівень",
      prevLevelTitle: "Попередній рівень",
      nextLevelAria: "Наступний рівень",
      nextLevelTitle: "Наступний рівень",
      toolbarAria: "Прогрес гри",
      infoButton: "Завдання",
      speakButton: "🔊 Слухати",
      speakAria: "Озвучити завдання",
      speakTitle: "Озвучити завдання",
      earlyLevelInfoButton: "Що робити",
      earlyLevelSpeakButton: "🔊 Пояснити",
      earlyLevelSpeakAria: "Озвучити пояснення до рівня",
      earlyLevelSpeakTitle: "Пояснити завдання",
      mapButton: "Карта рівнів",
      introSourceAria: "Опис рівня",
      mainAria(rows, cols) {
        return 'Ігрове поле ' + cols + '?' + rows;
      },
      gridAria(rows, cols) {
        return 'Поле ' + cols + '?' + rows + '. Тут можна ставити команди для маршруту.' ;
      }
    },
    ui: {
      defaultStatus: "Тягни команди на поле — равлик піде по них!",
      debugStatus: "Знайди помилку в готовому маршруті та полагодь її.",
      debugTaskSuffix: "Знайди помилку і виправ її.",
      speechUnsupported: "Озвучення не підтримується у цьому браузері.",
      speechStart: "Слухаємо завдання.",
      speechError: "Не вдалося озвучити завдання.",
      debugNote: "Готовий маршрут вже на полі. Підсвічені стрілки — це саме той алгоритм, у якому заховалася помилка.",
      modeDebug: "Дебаг-рівень",
      modePlay: "Звичайний рівень",
      completedSuffix: " ✓ пройдено",
      levelWord: "Рівень",
      progressPrefix: "Пройдено",
      taskLabel: "ЗАВДАННЯ",
      listenTask: "🔊 Слухати завдання",
      startAction: "Почати",
      mapTitle: "Карта рівнів",
      mapBody: "Обирай будь-який відкритий рівень або просто подивись свій прогрес.",
      mapClose: "Закрити",
      mapStateCurrent: "Ми тут",
      mapStateDone: "Пройдено",
      mapStateTodo: "Ще попереду",
      winTitle: "Рівень пройдено!",
      winTitleFinal: "Усі 20 рівнів пройдено!",
      winBody: "Равлик знайшов яблуко!",
      winBodyFinal: "Ми допомогли равлику пройти цілу подорож!<br>Можна почати спочатку та пройти гру ще раз.",
      winNextAction: "До наступного рівня",
      winRestartAction: "Почати спочатку",
      tryAgainTitle: "Щось не так",
      tryAgainBody: "Подумай та спробуй ще.",
      tryAgainTurns: "Тут потрібно скласти маршрут саме поворотами.",
      tryAgainAction: "Зрозуміло",
      clearConfirmTitle: "Очистити поле?",
      clearConfirmBody: "Усі команди на полі зникнуть. Точно очищаємо?",
      clearConfirmAction: "Очистити",
      clearCancelAction: "Скасувати",
      alreadySolvedTitle: "Рівень уже пройдено",
      alreadySolvedBody: "Можна перейти далі або змінити маршрут.",
    },
    engine: {
      placeCommandsFirst: "Спочатку постав команди на поле!",
      moving: "Рухаємось...",
      placeNearby: "Постав стартову команду поруч із равликом!",
      noCommand: "Немає команди — равлик зупинився!",
      loop: "Равлик ходить по колу! Перевір маршрут.",
      invalidTurn: "Ця команда не підходить для такого повороту!",
      outOfBounds: "Равлик виходить за межі поля!",
      obstacle: "На шляху перешкода! Обійди її.",
      success: "Равлик знайшов яблуко! Чудово!",
      tooManySteps: "Забагато кроків — перевір маршрут.",
      alreadySolved: "Рівень уже пройдено. Можна перейти далі або змінити маршрут.",
    },
    render: {
      deleteCommand: "Видалити цю команду",
      rowCol(r, c) {
        return 'Рядок ' + (r + 1) + ', колонка ' + (c + 1);
      },
      obstacleSuffix(label) {
        return label + ' — перешкода';
      },
      presetDebug: "Це готова команда для дебагу",
      pendingDelete: "Натисни хрестик, щоб видалити, або клікни ще раз, щоб скасувати.",
      clickToDelete: "Клік — підготувати до видалення.",
      appleGoal: "Яблуко — ціль.",
      snailStart: "Равлик стартує тут.",
      startPicked: "Стартуємо звідси.",
      dragToBoard(label) {
        return label + ' — перетягни на поле';
      }
    },
    progress(completed, total) {
      return this.ui.progressPrefix + ' ' + completed + ' з ' + total + ' рівнів';
    },
    levelChip(index, total, isDone) {
      return this.ui.levelWord + ' ' + (index + 1) + ' з ' + total + (isDone ? this.ui.completedSuffix : '');
    },
    mode(isDebug) {
      return isDebug ? this.ui.modeDebug : this.ui.modePlay;
    },
    taskSpeech(level) {
      const baseText = level.hint || level.goal || level.name;
      return level.type === "debug"
        ? level.name + ". " + baseText + ". " + this.ui.debugTaskSuffix
        : level.name + ". " + baseText;
    },
    mapState(isCurrent, isDone) {
      return isCurrent ? this.ui.mapStateCurrent : (isDone ? this.ui.mapStateDone : this.ui.mapStateTodo);
    },
    winTitle(isFinalWin) {
      return isFinalWin ? this.ui.winTitleFinal : this.ui.winTitle;
    },
    winBody(isFinalWin) {
      return isFinalWin ? this.ui.winBodyFinal : this.ui.winBody;
    },
    winAction(hasNext) {
      return hasNext ? this.ui.winNextAction : this.ui.winRestartAction;
    }
  };
})();
