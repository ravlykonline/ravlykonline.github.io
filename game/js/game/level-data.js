const NPC_SIZE = 56;
const OBSERVE_POOLS = ['visual-logic.beginner', 'counting.beginner'];
const PATTERN_POOLS = ['patterns.beginner', 'visual-logic.beginner'];
const LOGIC_POOLS = ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner'];
const COUNTING_POOLS = ['counting.beginner', 'visual-logic.beginner'];
const MATH_POOLS = ['arithmetic.beginner', 'counting.beginner', 'patterns.beginner'];
const GENTLE_POOLS = ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner'];

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

export const LevelData = {
    level1: {
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
    }
};
