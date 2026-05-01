const NPC_SIZE = 48;

function createNpc(id, type, nameKey, taskPoolId) {
    return {
        id,
        nameKey,
        taskPoolId,
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
            createNpc('mouse_1', 'mouse', 'npc.mouseName', 'observation.beginner'),
            createNpc('beetle_1', 'beetle', 'npc.beetleName', 'logic.beginner'),
            createNpc('owl_1', 'owl', 'npc.owlName', 'logic.beginner'),
            createNpc('squirrel_1', 'squirrel', 'npc.squirrelName', 'observation.beginner'),
            createNpc('hedgehog_1', 'hedgehog', 'npc.hedgehogName', 'observation.beginner'),
            createNpc('rabbit_1', 'rabbit', 'npc.rabbitName', 'logic.beginner'),
            createNpc('frog_1', 'frog', 'npc.frogName', 'observation.beginner'),
            createNpc('fox_1', 'fox', 'npc.foxName', 'logic.beginner'),
            createNpc('badger_1', 'badger', 'npc.badgerName', 'observation.beginner'),
            createNpc('turtle_1', 'turtle', 'npc.turtleName', 'logic.beginner'),
            createNpc('deer_1', 'deer', 'npc.deerName', 'observation.beginner'),
            createNpc('raccoon_1', 'raccoon', 'npc.raccoonName', 'logic.beginner'),
            createNpc('bird_1', 'bird', 'npc.birdName', 'observation.beginner'),
            createNpc('butterfly_1', 'butterfly', 'npc.butterflyName', 'logic.beginner'),
            createNpc('mole_1', 'mole', 'npc.moleName', 'observation.beginner'),
            createNpc('snail_friend_1', 'snailFriend', 'npc.snailFriendName', 'logic.beginner'),
            createNpc('ladybug_1', 'ladybug', 'npc.ladybugName', 'observation.beginner'),
            createNpc('bee_1', 'bee', 'npc.beeName', 'logic.beginner'),
            createNpc('cat_1', 'cat', 'npc.catName', 'observation.beginner'),
            createNpc('dog_1', 'dog', 'npc.dogName', 'logic.beginner'),
            createNpc('goat_1', 'goat', 'npc.goatName', 'observation.beginner'),
            createNpc('duck_1', 'duck', 'npc.duckName', 'logic.beginner')
        ]
    }
};
