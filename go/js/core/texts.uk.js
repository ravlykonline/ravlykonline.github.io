export const textsUk = {
  static: {
    pageTitle: "Пригоди Равлика",
    skipLink: "Перейти до поля гри",
    sidebarAria: "Панель інструментів",
    logoAria: "Пригоди Равлика — гра з алгоритмами.",
    logoName: "Пригоди",
    logoSub: "Равлика",
    commandsLabel: "Картки",
    paletteAria: "Картки для Равлика",
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
    speakButton: "Слухати",
    speakAria: "Озвучити завдання",
    speakTitle: "Озвучити завдання",
    mapButton: "Карта рівнів",
    muteSound: "Вимкнути звук",
    unmuteSound: "Увімкнути звук",
    useLightTheme: "Увімкнути денний режим",
    useDarkTheme: "Увімкнути нічний режим",
    lightTheme: "День",
    darkTheme: "Ніч",
    introSourceAria: "Опис рівня",
    mainAria(rows, cols) {
      return 'Ігрове поле: ' + cols + ' на ' + rows + '.';
    },
    gridAria(rows, cols) {
      return 'Поле: ' + cols + ' на ' + rows + '. Тут можна класти картки.';
    }
  },
  ui: {
    defaultStatus: "Вибери картку зі стрілкою.",
    placeSelected: "Тепер натисни клітинку на полі.",
    pickArrowForCell: "Тепер натисни стрілку внизу.",
    editRoute: "Вибери стрілку або запусти Равлика.",
    routeReady: "Шлях готовий! Натисни «Запустити».",
    debugStatus: "Маршрут уже є. Знайди помилку.",
    debugTaskSuffix: "Знайди й виправ.",
    speechUnsupported: "Завдання можна прочитати, натиснувши «Завдання».",
    speechStart: "Слухаємо завдання.",
    speechMuted: "Звук вимкнено. Увімкни його, щоб послухати завдання.",
    speechError: "Звук не відтворився. Спробуй ще раз або прочитай завдання.",
    debugNote: "Стрілки вже стоять. У них сховалась помилка.",
    modeDebug: "Виправ помилку!",
    modePlay: "Склади шлях",
    completedSuffix: " ✓ пройдено",
    levelWord: "Рівень",
    progressPrefix: "Пройдено",
    taskLabel: "ЗАВДАННЯ",
    listenTask: "Слухати завдання",
    startAction: "До гри",
    mapTitle: "Карта рівнів",
    mapBody: "Обирай будь-який рівень або подивись свій прогрес.",
    mapClose: "Закрити",
    mapStateCurrent: "Ми тут",
    mapStateDone: "Пройдено",
    mapStateTodo: "Ще попереду",
    winTitle: "Рівень пройдено!",
    winTitleFinal: "Усі 20 рівнів пройдено!",
    winBody: "Равлик дістався яблука!",
    winBodyFinal: "Равлик завершив подорож! Можна зіграти ще раз.",
    winNextAction: "До наступного рівня",
    winRestartAction: "Почати спочатку",
    clearConfirmTitle: "Очистити поле?",
    clearConfirmBody: "Твої зміни зникнуть, а початкові стрілки повернуться.",
    clearConfirmAction: "Очистити",
    clearCancelAction: "Скасувати",
    restartGame: "Почати гру спочатку",
    restartConfirmTitle: "Почати гру спочатку?",
    restartConfirmBody: "Стрілки й пройдені рівні буде скинуто.",
    alreadySolvedTitle: "Рівень уже пройдено",
    alreadySolvedBody: "Можеш іти далі або змінити шлях.",
  },
  onboarding: {
    title: "Пригоди Равлика",
    body: "",
    taskLabel: "ЩО РОБИТИ",
    taskText: "Постав картки між Равликом і яблуком. Потім натисни «Запустити».",
    startAction: "Поїхали!",
    goal: "Равлик хоче яблуко. Допоможи йому знайти дорогу."
  },
  debugLevel: {
    taskLabel: "ЗНАЙДИ ПОМИЛКУ",
    taskTextSuffix: "Запусти Равлика. Подивись, де він зупинився, і заміни картку."
  },
  engine: {
    placeCommandsFirst: "Спочатку постав картки!",
    moving: "Равлик іде...",
    placeNearby: "Постав першу картку біля Равлика!",
    noCommand: "Тут бракує стрілки. Додай її в підсвічену клітинку.",
    loop: "Равлик ходить по колу.",
    invalidTurn: "Ця стрілка не підходить. Заміни її в підсвіченій клітинці.",
    outOfBounds: "Равлик виходить за поле.",
    obstacle: "Попереду перешкода. Заміни картку в підсвіченій клітинці.",
    success: "Равлик знайшов яблуко!",
    tooManySteps: "Равлик заблукав. Перевір, куди ведуть стрілки.",
    alreadySolved: "Рівень уже пройдено.",
  },
  render: {
    deleteCommand: "Видалити цю картку",
    rowCol(r, c) {
      return 'Рядок ' + (r + 1) + ', колонка ' + (c + 1);
    },
    obstacleSuffix(label) {
      return label + ' — перешкода';
    },
    presetDebug: "Ця картка вже стояла на полі",
    pendingDelete: "Натисни хрестик, щоб прибрати картку, або торкнися клітинки ще раз, щоб скасувати.",
    clickToDelete: "Натисни клітинку для видалення або скористайся клавішею Delete.",
    appleGoal: "Яблуко — ціль.",
    snailStart: "Равлик стартує тут.",
    startPicked: "Стартуємо звідси.",
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
  mapState(isCurrent, isDone) {
    return isCurrent ? this.ui.mapStateCurrent : (isDone ? this.ui.mapStateDone : this.ui.mapStateTodo);
  },
  mapLevelAria(number, name, stateText) {
    return this.ui.levelWord + ' ' + number + ': ' + name + '. ' + stateText;
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
