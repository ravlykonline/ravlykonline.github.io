const NPC_SIZE = 48;
const OBSERVE_POOLS = ['visual-logic.beginner', 'counting.beginner'];
const PATTERN_POOLS = ['patterns.beginner', 'visual-logic.beginner'];
const LOGIC_POOLS = ['visual-logic.beginner', 'patterns.beginner', 'counting.beginner'];
const COUNTING_POOLS = ['counting.beginner', 'visual-logic.beginner'];
const MATH_POOLS = ['arithmetic.beginner', 'counting.beginner', 'patterns.beginner'];

function createNpc(id, type, nameKey, taskPoolIds) {
    return {
        id,
        nameKey,
        taskPoolIds,
        taskPoolId: taskPoolIds[0],
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
            createNpc('mouse_1', 'mouse', 'npc.mouseName', OBSERVE_POOLS),
            createNpc('beetle_1', 'beetle', 'npc.beetleName', PATTERN_POOLS),
            createNpc('owl_1', 'owl', 'npc.owlName', LOGIC_POOLS),
            createNpc('squirrel_1', 'squirrel', 'npc.squirrelName', OBSERVE_POOLS),
            createNpc('hedgehog_1', 'hedgehog', 'npc.hedgehogName', COUNTING_POOLS),
            createNpc('rabbit_1', 'rabbit', 'npc.rabbitName', PATTERN_POOLS),
            createNpc('frog_1', 'frog', 'npc.frogName', COUNTING_POOLS),
            createNpc('fox_1', 'fox', 'npc.foxName', LOGIC_POOLS),
            createNpc('badger_1', 'badger', 'npc.badgerName', OBSERVE_POOLS),
            createNpc('turtle_1', 'turtle', 'npc.turtleName', LOGIC_POOLS),
            createNpc('deer_1', 'deer', 'npc.deerName', PATTERN_POOLS),
            createNpc('raccoon_1', 'raccoon', 'npc.raccoonName', LOGIC_POOLS),
            createNpc('bird_1', 'bird', 'npc.birdName', PATTERN_POOLS),
            createNpc('butterfly_1', 'butterfly', 'npc.butterflyName', PATTERN_POOLS),
            createNpc('mole_1', 'mole', 'npc.moleName', COUNTING_POOLS),
            createNpc('snail_friend_1', 'snailFriend', 'npc.snailFriendName', LOGIC_POOLS),
            createNpc('ladybug_1', 'ladybug', 'npc.ladybugName', OBSERVE_POOLS),
            createNpc('bee_1', 'bee', 'npc.beeName', PATTERN_POOLS),
            createNpc('cat_1', 'cat', 'npc.catName', OBSERVE_POOLS),
            createNpc('dog_1', 'dog', 'npc.dogName', LOGIC_POOLS),
            createNpc('goat_1', 'goat', 'npc.goatName', MATH_POOLS),
            createNpc('duck_1', 'duck', 'npc.duckName', COUNTING_POOLS)
        ]
    }
};
