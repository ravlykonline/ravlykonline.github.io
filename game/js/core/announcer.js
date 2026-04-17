export const Announcer = {
    element: null,
    gameStateElement: null,
    t(key) {
        return key;
    },

    init() {
        this.element = document.getElementById('announcements');
        this.gameStateElement = document.getElementById('game-state-description');
    },

    announce(message, priority = 'polite') {
        if (!this.element) {
            return;
        }

        this.element.textContent = '';

        setTimeout(() => {
            this.element.setAttribute('aria-live', priority);
            this.element.textContent = message;
        }, 100);

        setTimeout(() => {
            this.element.setAttribute('aria-live', 'polite');
        }, 1000);
    },

    updateGameState(message) {
        if (this.gameStateElement) {
            this.gameStateElement.textContent = message;
        }
    }
};
