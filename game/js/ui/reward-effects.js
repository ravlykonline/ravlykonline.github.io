const AUDIO_VOLUME = 0.08;
let audioContext = null;

function prefersReducedMotion() {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function getAudioContext() {
    if (audioContext) {
        return audioContext;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        return null;
    }

    audioContext = new AudioContextClass();
    return audioContext;
}

function playTone(frequency, duration = 0.08, offset = 0) {
    const context = getAudioContext();
    if (!context) {
        return;
    }

    const start = context.currentTime + offset;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(AUDIO_VOLUME, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
}

export const RewardEffects = {
    playTap() {
        playTone(420, 0.05);
    },

    playTryAgain() {
        playTone(220, 0.08);
        playTone(180, 0.1, 0.08);
    },

    playSuccess() {
        playTone(523, 0.08);
        playTone(659, 0.08, 0.08);
        playTone(784, 0.14, 0.16);
    },

    showStarCelebration(anchor = document.body) {
        this.playSuccess();

        const burst = document.createElement('div');
        burst.className = 'reward-burst';
        burst.setAttribute('aria-hidden', 'true');

        const star = document.createElement('div');
        star.className = 'reward-star';
        star.textContent = '★';
        burst.appendChild(star);

        if (!prefersReducedMotion()) {
            const colors = ['#f59e0b', '#84cc16', '#22c55e', '#38bdf8', '#f97316', '#eab308'];
            for (let index = 0; index < 18; index += 1) {
                const piece = document.createElement('span');
                piece.className = 'confetti-piece';
                piece.style.setProperty('--angle', `${index * 20}deg`);
                piece.style.setProperty('--distance', `${70 + (index % 4) * 14}px`);
                piece.style.setProperty('--confetti-color', colors[index % colors.length]);
                burst.appendChild(piece);
            }
        }

        anchor.appendChild(burst);
        window.setTimeout(() => burst.remove(), prefersReducedMotion() ? 900 : 1500);
    }
};
