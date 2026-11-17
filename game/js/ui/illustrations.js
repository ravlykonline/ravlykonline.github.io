const SVG = 'http://www.w3.org/2000/svg';
const uiSprite = new URL('../../assets/ui.svg', import.meta.url).href;
const pictureSprite = new URL('../../assets/pictures.svg', import.meta.url).href;
const homeSprite = new URL('../../assets/homes.svg', import.meta.url).href;

const animalHomes = {
    burrow: ['ant', 'hamster', 'hedgehog', 'mouse', 'mole', 'rabbit'],
    hollow: ['owl', 'raccoon', 'squirrel'],
    kennel: ['cat', 'dog'],
    barn: ['chicken', 'cow', 'goat', 'horse', 'lamb', 'pig'],
    den: ['badger', 'bat', 'bearCub', 'boar', 'fox', 'lizard', 'snake', 'wolf'],
    nest: ['bird', 'eagle'],
    reed: ['crab', 'duck', 'fish', 'frog', 'otter', 'swan', 'turtle'],
    hive: ['bee'],
    grass: ['beetle', 'butterfly', 'cricket', 'deer', 'ladybug', 'snailFriend']
};

function makeIllustration(sprite, name, className) {
    const image = document.createElementNS(SVG, 'svg');
    const reference = document.createElementNS(SVG, 'use');
    image.setAttribute('class', className);
    image.setAttribute('aria-hidden', 'true');
    image.setAttribute('focusable', 'false');
    reference.setAttribute('href', `${sprite}#${name}`);
    image.append(reference);
    return image;
}

export function createIcon(name) {
    return makeIllustration(uiSprite, name, 'game-icon');
}

export function createAnimal(type) {
    return makeIllustration(pictureSprite, `animal-${type}`, 'animal-art');
}

export function createAnimalHome(type) {
    const habitat = Object.keys(animalHomes).find(name => animalHomes[name].includes(type)) ?? 'grass';
    const home = document.createElement('span');
    home.className = 'npc-home';
    home.dataset.habitat = habitat;
    home.append(
        makeIllustration(homeSprite, habitat, 'npc-home__back'),
        createAnimal(type),
        makeIllustration(homeSprite, `${habitat}-front`, 'npc-home__front')
    );
    return home;
}

export function setPictureOrText(element, value) {
    const token = String(value).replaceAll('\uFE0F', '');
    const label = pictureLabels.get(token);
    if (!label) {
        element.textContent = value;
        return;
    }

    const code = Array.from(token, char =>
        char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join('-');
    const name = token === 'acorn' ? 'picture-acorn' : token === '🪲' ? 'animal-beetle' : `picture-${code}`;
    const text = document.createElement('span');
    text.className = 'sr-only';
    text.textContent = label;
    element.replaceChildren(makeIllustration(pictureSprite, name, 'task-art'), text);
}

const pictureLabels = new Map([
    ["🕶", "Сонцезахисні окуляри"],
    ["☕", "Чашка"],
    ["👶", "Немовля"],
    ["👩", "Жінка"],
    ["🍋", "Лимон"],
    ["🌈", "Веселка"],
    ["⛅", "Сонце за хмарою"],
    ["🍂", "Опале листя"],
    ["🐋", "Кит"],
    ["🦭", "Тюлень"],
    ["🦜", "Папуга"],
    ["🍑", "Персик"],
    ["🥭", "Манго"],
    ["🏔", "Засніжена гора"],
    ["acorn", "Жолудь"],
    ["🪲", "Жук"],
    ["■", "Заповнений квадрат"],
    ["□", "Порожній квадрат"],
    ["▲", "Заповнений трикутник"],
    ["△", "Порожній трикутник"],
    ["◆", "Ромб"],
    ["○", "Мале порожнє коло"],
    ["●", "Мале заповнене коло"],
    ["◯", "Велике порожнє коло"],
    ["⬤", "Велике заповнене коло"],
    ["★", "Зірка"],
    ["☀", "Сонце"],
    ["☁", "Хмара"],
    ["☂", "Парасоля"],
    ["☃", "Сніговик"],
    ["⚽", "Футбольний м’яч"],
    ["⛄", "Сніговик"],
    ["⛰", "Гора"],
    ["⛵", "Вітрильник"],
    ["✂", "Ножиці"],
    ["✈", "Літак"],
    ["✋", "Долоня"],
    ["✏", "Олівець"],
    ["❄", "Сніжинка"],
    ["⭐", "Зірка"],
    ["🌉", "Міст"],
    ["🌊", "Хвиля"],
    ["🌑", "Молодик"],
    ["🌕", "Повний місяць"],
    ["🌙", "Серп місяця"],
    ["🌧", "Дощова хмара"],
    ["🌰", "Каштан"],
    ["🌱", "Паросток"],
    ["🌲", "Ялинка"],
    ["🌳", "Листяне дерево"],
    ["🌴", "Пальма"],
    ["🌸", "Квітка вишні"],
    ["🌺", "Гібіскус"],
    ["🌻", "Соняшник"],
    ["🌼", "Квітка"],
    ["🌽", "Кукурудза"],
    ["🌾", "Колосся"],
    ["🌿", "Гілочка"],
    ["🍁", "Кленовий листок"],
    ["🍃", "Листя"],
    ["🍄", "Гриб"],
    ["🍆", "Баклажан"],
    ["🍇", "Виноград"],
    ["🍉", "Кавун"],
    ["🍊", "Апельсин"],
    ["🍌", "Банан"],
    ["🍎", "Яблуко"],
    ["🍐", "Груша"],
    ["🍒", "Вишні"],
    ["🍞", "Хліб"],
    ["🍦", "Морозиво"],
    ["🍯", "Горщик меду"],
    ["🍵", "Чашка чаю"],
    ["🎸", "Гітара"],
    ["🎹", "Клавіші"],
    ["🎺", "Труба"],
    ["🎾", "Тенісний м’яч"],
    ["🏀", "Баскетбольний м’яч"],
    ["🏜", "Пустеля"],
    ["🏠", "Будинок"],
    ["🐇", "Кролик"],
    ["🐌", "Равлик"],
    ["🐑", "Вівця"],
    ["🐔", "Курка"],
    ["🐙", "Восьминіг"],
    ["🐚", "Мушля"],
    ["🐛", "Гусінь"],
    ["🐜", "Мурашка"],
    ["🐝", "Бджола"],
    ["🐞", "Сонечко"],
    ["🐟", "Риба"],
    ["🐠", "Тропічна рибка"],
    ["🐢", "Черепаха"],
    ["🐣", "Курча"],
    ["🐦", "Пташка"],
    ["🐧", "Пінгвін"],
    ["🐬", "Дельфін"],
    ["🐮", "Корова"],
    ["🐰", "Зайчик"],
    ["🐱", "Кіт"],
    ["🐴", "Кінь"],
    ["🐶", "Пес"],
    ["🐷", "Свинка"],
    ["🐸", "Жабка"],
    ["🐺", "Вовк"],
    ["🐻", "Ведмідь"],
    ["🐿", "Білка"],
    ["👒", "Капелюх"],
    ["👟", "Кросівок"],
    ["💎", "Коштовний камінь"],
    ["💡", "Лампочка"],
    ["📄", "Аркуш паперу"],
    ["📕", "Книжка"],
    ["🔑", "Ключ"],
    ["🔒", "Замок"],
    ["🔔", "Дзвоник"],
    ["🔥", "Вогонь"],
    ["🔧", "Гайковий ключ"],
    ["🔨", "Молоток"],
    ["🔴", "Червоне коло"],
    ["🔵", "Синє коло"],
    ["🕐", "Годинник"],
    ["🕯", "Свічка"],
    ["🕷", "Павук"],
    ["🖊", "Ручка"],
    ["🖍", "Крейда"],
    ["🚀", "Ракета"],
    ["🚁", "Гелікоптер"],
    ["🚂", "Паровоз"],
    ["🚌", "Автобус"],
    ["🚗", "Автомобіль"],
    ["🚜", "Трактор"],
    ["🚢", "Корабель"],
    ["🚪", "Двері"],
    ["🚲", "Велосипед"],
    ["🛣", "Дорога"],
    ["🟡", "Жовте коло"],
    ["🟦", "Синій квадрат"],
    ["🟨", "Жовтий квадрат"],
    ["🟩", "Зелений квадрат"],
    ["🥁", "Барабан"],
    ["🥄", "Ложка"],
    ["🥒", "Огірок"],
    ["🥕", "Морква"],
    ["🥚", "Яйце"],
    ["🥛", "Молоко"],
    ["🥦", "Броколі"],
    ["🦀", "Краб"],
    ["🦁", "Лев"],
    ["🦅", "Орел"],
    ["🦆", "Качка"],
    ["🦇", "Кажан"],
    ["🦈", "Акула"],
    ["🦉", "Сова"],
    ["🦊", "Лисиця"],
    ["🦋", "Метелик"],
    ["🦚", "Павич"],
    ["🦢", "Лебідь"],
    ["🦴", "Кісточка"],
    ["🦶", "Стопа"],
    ["🧀", "Сир"],
    ["🧃", "Пакетик соку"],
    ["🧢", "Кепка"],
    ["🧤", "Рукавички"],
    ["🧦", "Шкарпетки"],
    ["🧶", "Клубок вовни"],
    ["🪨", "Камінь"]
]);
