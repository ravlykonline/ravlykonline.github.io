export const LevelData = {
    level1: {
        npcs: [
            {
                id: 'mouse_1',
                nameKey: 'npc.mouseName',
                type: 'mouse',
                x: 2500,
                y: 2000,
                w: 48,
                h: 48,
                completed: false,
                taskPool: [
                    { id: 'm1_p1', dialogKey: 'tasks.m1_p1' },
                    { id: 'm1_p2', dialogKey: 'tasks.m1_p2' },
                    { id: 'm1_p3', dialogKey: 'tasks.m1_p3' }
                ]
            },
            {
                id: 'beetle_1',
                nameKey: 'npc.beetleName',
                type: 'beetle',
                x: 1800,
                y: 2200,
                w: 48,
                h: 48,
                completed: false,
                taskPool: [
                    { id: 'b1_p1', dialogKey: 'tasks.b1_p1' },
                    { id: 'b1_p2', dialogKey: 'tasks.b1_p2' },
                    { id: 'b1_p3', dialogKey: 'tasks.b1_p3' }
                ]
            }
        ]
    }
};
