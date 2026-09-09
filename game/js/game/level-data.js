const NPC_SIZE = 56;

// ── Банки завдань за рівнями складності ─────────────────────────────
// Рівень 1 — beginner, рівень 2 — intermediate, рівень 3 — advanced.
// Всередині рівня доступність банку ще раз фільтрується полем
// `unlockAtStars` у самій категорії (див. task-picker.js).

// Рівень 1 — «Сонячна галявина»
const OBSERVE_POOLS = ['visual-logic.beginner', 'counting.beginner', 'observation.beginner'];
const PATTERN_POOLS = ['patterns.beginner', 'visual-logic.beginner'];
const LOGIC_POOLS = ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner', 'logic.beginner'];
const COUNTING_POOLS = ['counting.beginner', 'visual-logic.beginner'];
const MATH_POOLS = ['arithmetic.beginner', 'counting.beginner', 'patterns.beginner'];
const GENTLE_POOLS = ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner'];

// Рівень 2 — «Густий ліс»
const OBSERVE_POOLS_2 = ['visual-logic.intermediate', 'counting.intermediate'];
const PATTERN_POOLS_2 = ['patterns.intermediate', 'visual-logic.intermediate'];
const LOGIC_POOLS_2 = ['visual-logic.intermediate', 'patterns.intermediate', 'logic.intermediate'];
const COUNTING_POOLS_2 = ['counting.intermediate', 'visual-logic.intermediate'];
const MATH_POOLS_2 = ['arithmetic.intermediate', 'counting.intermediate', 'patterns.intermediate'];
const GENTLE_POOLS_2 = ['visual-logic.intermediate', 'counting.intermediate'];

// Рівень 3 — «Біля ставка»
const OBSERVE_POOLS_3 = ['visual-logic.advanced', 'counting.advanced'];
const PATTERN_POOLS_3 = ['patterns.advanced', 'visual-logic.advanced'];
const LOGIC_POOLS_3 = ['visual-logic.advanced', 'patterns.advanced', 'logic.advanced'];
const COUNTING_POOLS_3 = ['counting.advanced', 'visual-logic.advanced'];
const MATH_POOLS_3 = ['arithmetic.advanced', 'counting.advanced', 'patterns.advanced'];
const GENTLE_POOLS_3 = ['visual-logic.advanced', 'counting.advanced'];

const NPC_GROUPS = {
    observe: 'observe',
    pattern: 'pattern',
    logic: 'logic',
    counting: 'counting',
    math: 'math',
    gentle: 'gentle'
};

function createNpc(id, type, nameKey, taskPoolIds, distributionGroup) {
    return {
        id,
        nameKey,
        taskPoolIds,
        taskPoolId: taskPoolIds[0],
        distributionGroup: distributionGroup ?? taskPoolIds.join('|'),
        type,
        x: 0,
        y: 0,
        w: NPC_SIZE,
        h: NPC_SIZE,
        completed: false
    };
}

const level1 = {
    id: 'level1',
    index: 1,
    nameKey: 'levels.level1Name',
    world: {
        worldWidth: 4200,
        worldHeight: 4200,
        obstacleCount: 88,
        appleCount: 42,
        pearCount: 0
    },
    playerStart: { x: 2000, y: 2000 },
    npcs: [
        createNpc('mouse_1', 'mouse', 'npc.mouseName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('beetle_1', 'beetle', 'npc.beetleName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('owl_1', 'owl', 'npc.owlName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('squirrel_1', 'squirrel', 'npc.squirrelName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('hedgehog_1', 'hedgehog', 'npc.hedgehogName', COUNTING_POOLS, NPC_GROUPS.counting),
        createNpc('rabbit_1', 'rabbit', 'npc.rabbitName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('frog_1', 'frog', 'npc.frogName', COUNTING_POOLS, NPC_GROUPS.counting),
        createNpc('fox_1', 'fox', 'npc.foxName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('badger_1', 'badger', 'npc.badgerName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('turtle_1', 'turtle', 'npc.turtleName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('deer_1', 'deer', 'npc.deerName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('raccoon_1', 'raccoon', 'npc.raccoonName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('bird_1', 'bird', 'npc.birdName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('butterfly_1', 'butterfly', 'npc.butterflyName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('mole_1', 'mole', 'npc.moleName', COUNTING_POOLS, NPC_GROUPS.counting),
        createNpc('snail_friend_1', 'snailFriend', 'npc.snailFriendName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('ladybug_1', 'ladybug', 'npc.ladybugName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('bee_1', 'bee', 'npc.beeName', PATTERN_POOLS, NPC_GROUPS.pattern),
        createNpc('cat_1', 'cat', 'npc.catName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('dog_1', 'dog', 'npc.dogName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('goat_1', 'goat', 'npc.goatName', MATH_POOLS, NPC_GROUPS.math),
        createNpc('duck_1', 'duck', 'npc.duckName', COUNTING_POOLS, NPC_GROUPS.counting),
        createNpc('hamster_1', 'hamster', 'npc.hamsterName', OBSERVE_POOLS, NPC_GROUPS.observe),
        createNpc('bear_cub_1', 'bearCub', 'npc.bearCubName', GENTLE_POOLS, NPC_GROUPS.gentle),
        createNpc('otter_1', 'otter', 'npc.otterName', LOGIC_POOLS, NPC_GROUPS.logic),
        createNpc('chicken_1', 'chicken', 'npc.chickenName', COUNTING_POOLS, NPC_GROUPS.counting),
        createNpc('lamb_1', 'lamb', 'npc.lambName', GENTLE_POOLS, NPC_GROUPS.gentle),
        createNpc('ant_1', 'ant', 'npc.antName', COUNTING_POOLS, NPC_GROUPS.counting)
    ]
};

const level2 = {
    id: 'level2',
    index: 2,
    nameKey: 'levels.level2Name',
    world: {
        worldWidth: 4600,
        worldHeight: 4600,
        obstacleCount: 104,
        appleCount: 34,
        pearCount: 16
    },
    playerStart: { x: 2300, y: 2300 },
    npcs: [
        createNpc('owl_2', 'owl', 'npc.owlName', LOGIC_POOLS_2, NPC_GROUPS.logic),
        createNpc('fox_2', 'fox', 'npc.foxName', LOGIC_POOLS_2, NPC_GROUPS.logic),
        createNpc('wolf_2', 'wolf', 'npc.wolfName', LOGIC_POOLS_2, NPC_GROUPS.logic),
        createNpc('boar_2', 'boar', 'npc.boarName', COUNTING_POOLS_2, NPC_GROUPS.counting),
        createNpc('bat_2', 'bat', 'npc.batName', OBSERVE_POOLS_2, NPC_GROUPS.observe),
        createNpc('cricket_2', 'cricket', 'npc.cricketName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('lizard_2', 'lizard', 'npc.lizardName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('eagle_2', 'eagle', 'npc.eagleName', LOGIC_POOLS_2, NPC_GROUPS.logic),
        createNpc('snake_2', 'snake', 'npc.snakeName', OBSERVE_POOLS_2, NPC_GROUPS.observe),
        createNpc('badger_2', 'badger', 'npc.badgerName', OBSERVE_POOLS_2, NPC_GROUPS.observe),
        createNpc('deer_2', 'deer', 'npc.deerName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('raccoon_2', 'raccoon', 'npc.raccoonName', LOGIC_POOLS_2, NPC_GROUPS.logic),
        createNpc('hedgehog_2', 'hedgehog', 'npc.hedgehogName', COUNTING_POOLS_2, NPC_GROUPS.counting),
        createNpc('squirrel_2', 'squirrel', 'npc.squirrelName', OBSERVE_POOLS_2, NPC_GROUPS.observe),
        createNpc('mole_2', 'mole', 'npc.moleName', COUNTING_POOLS_2, NPC_GROUPS.counting),
        createNpc('bear_cub_2', 'bearCub', 'npc.bearCubName', GENTLE_POOLS_2, NPC_GROUPS.gentle),
        createNpc('rabbit_2', 'rabbit', 'npc.rabbitName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('beetle_2', 'beetle', 'npc.beetleName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('ant_2', 'ant', 'npc.antName', COUNTING_POOLS_2, NPC_GROUPS.counting),
        createNpc('bird_2', 'bird', 'npc.birdName', PATTERN_POOLS_2, NPC_GROUPS.pattern),
        createNpc('butterfly_2', 'butterfly', 'npc.butterflyName', GENTLE_POOLS_2, NPC_GROUPS.gentle),
        createNpc('turtle_2', 'turtle', 'npc.turtleName', MATH_POOLS_2, NPC_GROUPS.math),
        createNpc('mouse_2', 'mouse', 'npc.mouseName', OBSERVE_POOLS_2, NPC_GROUPS.observe),
        createNpc('snail_friend_2', 'snailFriend', 'npc.snailFriendName', MATH_POOLS_2, NPC_GROUPS.math),
        createNpc('ladybug_2', 'ladybug', 'npc.ladybugName', COUNTING_POOLS_2, NPC_GROUPS.counting),
        createNpc('bee_2', 'bee', 'npc.beeName', MATH_POOLS_2, NPC_GROUPS.math)
    ]
};

const level3 = {
    id: 'level3',
    index: 3,
    nameKey: 'levels.level3Name',
    world: {
        worldWidth: 5000,
        worldHeight: 5000,
        obstacleCount: 118,
        appleCount: 30,
        pearCount: 24
    },
    playerStart: { x: 2500, y: 2500 },
    npcs: [
        createNpc('fish_3', 'fish', 'npc.fishName', COUNTING_POOLS_3, NPC_GROUPS.counting),
        createNpc('swan_3', 'swan', 'npc.swanName', PATTERN_POOLS_3, NPC_GROUPS.pattern),
        createNpc('crab_3', 'crab', 'npc.crabName', COUNTING_POOLS_3, NPC_GROUPS.counting),
        createNpc('horse_3', 'horse', 'npc.horseName', MATH_POOLS_3, NPC_GROUPS.math),
        createNpc('cow_3', 'cow', 'npc.cowName', MATH_POOLS_3, NPC_GROUPS.math),
        createNpc('pig_3', 'pig', 'npc.pigName', GENTLE_POOLS_3, NPC_GROUPS.gentle),
        createNpc('frog_3', 'frog', 'npc.frogName', COUNTING_POOLS_3, NPC_GROUPS.counting),
        createNpc('duck_3', 'duck', 'npc.duckName', COUNTING_POOLS_3, NPC_GROUPS.counting),
        createNpc('otter_3', 'otter', 'npc.otterName', LOGIC_POOLS_3, NPC_GROUPS.logic),
        createNpc('turtle_3', 'turtle', 'npc.turtleName', LOGIC_POOLS_3, NPC_GROUPS.logic),
        createNpc('owl_3', 'owl', 'npc.owlName', LOGIC_POOLS_3, NPC_GROUPS.logic),
        createNpc('fox_3', 'fox', 'npc.foxName', LOGIC_POOLS_3, NPC_GROUPS.logic),
        createNpc('eagle_3', 'eagle', 'npc.eagleName', LOGIC_POOLS_3, NPC_GROUPS.logic),
        createNpc('lizard_3', 'lizard', 'npc.lizardName', PATTERN_POOLS_3, NPC_GROUPS.pattern),
        createNpc('snake_3', 'snake', 'npc.snakeName', PATTERN_POOLS_3, NPC_GROUPS.pattern),
        createNpc('cricket_3', 'cricket', 'npc.cricketName', PATTERN_POOLS_3, NPC_GROUPS.pattern),
        createNpc('bee_3', 'bee', 'npc.beeName', MATH_POOLS_3, NPC_GROUPS.math),
        createNpc('ant_3', 'ant', 'npc.antName', MATH_POOLS_3, NPC_GROUPS.math),
        createNpc('goat_3', 'goat', 'npc.goatName', MATH_POOLS_3, NPC_GROUPS.math),
        createNpc('chicken_3', 'chicken', 'npc.chickenName', COUNTING_POOLS_3, NPC_GROUPS.counting),
        createNpc('lamb_3', 'lamb', 'npc.lambName', GENTLE_POOLS_3, NPC_GROUPS.gentle),
        createNpc('hamster_3', 'hamster', 'npc.hamsterName', OBSERVE_POOLS_3, NPC_GROUPS.observe),
        createNpc('cat_3', 'cat', 'npc.catName', OBSERVE_POOLS_3, NPC_GROUPS.observe),
        createNpc('dog_3', 'dog', 'npc.dogName', OBSERVE_POOLS_3, NPC_GROUPS.observe),
        createNpc('butterfly_3', 'butterfly', 'npc.butterflyName', OBSERVE_POOLS_3, NPC_GROUPS.observe),
        createNpc('snail_friend_3', 'snailFriend', 'npc.snailFriendName', LOGIC_POOLS_3, NPC_GROUPS.logic)
    ]
};

/** Порядок проходження рівнів у межах однієї сесії. */
export const LEVEL_SEQUENCE = [level1, level2, level3];

export const LevelData = {
    level1,
    level2,
    level3,
    sequence: LEVEL_SEQUENCE,

    /**
     * Рівень за порядковим номером у послідовності (1-based).
     * @param {number} index
     * @returns {object|null}
     */
    getByIndex(index) {
        return LEVEL_SEQUENCE[index - 1] ?? null;
    },

    /**
     * Чи є наступний рівень після вказаного.
     * @param {number} index
     * @returns {boolean}
     */
    hasNext(index) {
        return index < LEVEL_SEQUENCE.length;
    },

    get count() {
        return LEVEL_SEQUENCE.length;
    }
};
