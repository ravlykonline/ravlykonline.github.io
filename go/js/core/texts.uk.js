export const textsUk = {
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
      return 'Ігрове поле: ' + cols + ' на ' + rows + '.';
    },
    gridAria(rows, cols) {
      return 'Поле: ' + cols + ' на ' + rows + '. Тут можна ставити стрілки.';
    }
  },
  ui: {
    defaultStatus: "Постав стрілки — і натисни «Запустити».",
    debugStatus: "Маршрут уже є. Знайди помилку.",
    debugTaskSuffix: "Знайди й виправ.",
    speechUnsupported: "Озвучення не підтримується у цьому браузері.",
    speechStart: "Слухаємо завдання.",
    speechError: "Не вдалося озвучити завдання.",
    debugNote: "Стрілки вже стоять. У них сховалась помилка.",
    modeDebug: "Виправ помилку",
    modePlay: "Склади шлях",
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
    winBody: "Равлик дістався яблука!",
    winBodyFinal: "Равлик пройшов усю подорож!<br>Можна зіграти ще раз.",
    winNextAction: "До наступного рівня",
    winRestartAction: "Почати спочатку",
    tryAgainTitle: "Равлик зупинився",
    tryAgainBody: "Подивись на підсвічену клітинку й спробуй ще.",
    tryAgainTurns: "Тут потрібні повороти.",
    tryAgainAction: "Зрозуміло",
    clearConfirmTitle: "Очистити поле?",
    clearConfirmBody: "Усі стрілки зникнуть. Очистити?",
    clearConfirmAction: "Очистити",
    clearCancelAction: "Скасувати",
    alreadySolvedTitle: "Рівень уже пройдено",
    alreadySolvedBody: "Можеш іти далі або змінити шлях.",
  },
  onboarding: {
    title: "Пригоди Равлика",
    body: "",
    taskLabel: "ЩО РОБИТИ",
    taskText: "Постав стрілки між равликом і яблуком. Потім натисни «Запустити».",
    startAction: "Поїхали! 🐌",
    goal: "Равлик хоче яблуко. Допоможи йому знайти дорогу."
  },
  earlyLevel: {
    taskLabel: "ЩО РОБИТИ",
    listenAction: "🔊 Пояснити",
    startAction: "Почати"
  },
  debugLevel: {
    taskLabel: "ЗНАЙДИ ПОМИЛКУ",
    taskTextSuffix: "Запусти равлика. Потім виправ місце зупинки."
  },
  engine: {
    placeCommandsFirst: "Спочатку постав стрілки!",
    moving: "Равлик іде...",
    placeNearby: "Постав першу стрілку біля равлика!",
    noCommand: "Тут немає стрілки.",
    loop: "Равлик ходить по колу.",
    invalidTurn: "Цей поворот не підходить.",
    outOfBounds: "Равлик виходить за поле.",
    obstacle: "Попереду перешкода.",
    success: "Равлик знайшов яблуко!",
    tooManySteps: "Шлях заплутався.",
    alreadySolved: "Рівень уже пройдено.",
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
    const debugTaskSuffix = this.debugLevel?.taskTextSuffix || this.ui.debugTaskSuffix;
    return level.type === "debug"
      ? level.name + ". " + baseText + ". " + debugTaskSuffix
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
