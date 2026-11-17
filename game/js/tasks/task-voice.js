import { t } from '../i18n/index.js';

const names = [
    'sequence', 'oddOneOut', 'compareMore', 'compareLess', 'countAndMatch',
    'shapePattern', 'logicPairs',
    'magicSquare', 'orderAsc', 'orderDesc'
];

export function getTaskVoice(task) {
    // Equations have their own recording so the voice reads the actual operands.
    const key = task.voiceKey ?? (task.equation ? task.id : names.find(name => t(`taskUi.${name}Instructions`) === task.instructions));
    return key ? new URL(`../../assets/voice/${key}.mp3`, import.meta.url).href : null;
}
