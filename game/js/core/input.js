export const Input = {
    initialized: false,
    keys: {},
    pressed: {},
    mouse: { x: 0, y: 0, isDown: false, intentTarget: null },
    keyboard: {
        active: false,
        x: 0,
        y: 0,
        step: 30,
        cameraX: 0,
        cameraY: 0
    },

    clearTarget() {
        this.mouse.intentTarget = null;
    },

    updateCameraOffset(x, y) {
        this.keyboard.cameraX = x;
        this.keyboard.cameraY = y;
    },

    consumeKey(...keys) {
        for (const key of keys) {
            if (this.pressed[key]) {
                delete this.pressed[key];
                return true;
            }
        }

        return false;
    },

    init(announcer) {
        if (this.initialized) {
            return;
        }

        this.initialized = true;

        window.addEventListener('keydown', (event) => {
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            this.keys[event.key] = true;

            if (!event.repeat) {
                this.pressed[event.key] = true;
            }

            if (event.key === 't' || event.key === 'T' || event.key === 'т' || event.key === 'Т') {
                this.toggleKeyboardMode(announcer);
            }

            if (this.keyboard.active) {
                this.handleKeyboardCursor(event, announcer);
            }

            if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].includes(event.key)) {
                this.clearTarget();
                this.deactivateKeyboardMode();
            }
        });

        window.addEventListener('keyup', (event) => {
            this.keys[event.key] = false;
        });

        window.addEventListener('mousedown', (event) => {
            if (event.target.closest?.('#ui-layer, #dialog-layer')) {
                return;
            }

            if (event.button === 0 && !this.keyboard.active) {
                this.mouse.isDown = true;
                this.mouse.x = event.clientX;
                this.mouse.y = event.clientY;
            }
        });

        window.addEventListener('mouseup', (event) => {
            if (event.button === 0) {
                this.mouse.isDown = false;
            }
        });

        window.addEventListener('mousemove', (event) => {
            this.mouse.x = event.clientX;
            this.mouse.y = event.clientY;
        });

        window.addEventListener('touchstart', (event) => {
            if (event.target.closest?.('#ui-layer, #dialog-layer')) {
                return;
            }

            if (!this.keyboard.active) {
                this.mouse.isDown = true;
                this.mouse.x = event.touches[0].clientX;
                this.mouse.y = event.touches[0].clientY;
            }
        }, { passive: true });

        window.addEventListener('touchend', () => {
            this.mouse.isDown = false;
        });

        window.addEventListener('touchmove', (event) => {
            if (!this.keyboard.active) {
                this.mouse.x = event.touches[0].clientX;
                this.mouse.y = event.touches[0].clientY;
            }
        }, { passive: true });
    },

    toggleKeyboardMode(announcer) {
        this.keyboard.active = !this.keyboard.active;
        const cursor = document.getElementById('keyboard-cursor');
        const indicator = document.getElementById('keyboard-mode-indicator');

        if (this.keyboard.active) {
            this.keyboard.x = window.innerWidth / 2;
            this.keyboard.y = window.innerHeight / 2;
            this.updateCursorPosition();

            cursor?.classList.add('active');
            indicator?.classList.remove('hidden');
            announcer.announce(announcer.t('announcer.keyboardModeOn'), 'assertive');
            return;
        }

        cursor?.classList.remove('active');
        indicator?.classList.add('hidden');
        announcer.announce(announcer.t('announcer.keyboardModeOff'));
    },

    deactivateKeyboardMode() {
        if (!this.keyboard.active) {
            return;
        }

        this.keyboard.active = false;
        document.getElementById('keyboard-cursor')?.classList.remove('active');
        document.getElementById('keyboard-mode-indicator')?.classList.add('hidden');
    },

    handleKeyboardCursor(event, announcer) {
        const step = event.shiftKey ? this.keyboard.step * 3 : this.keyboard.step;

        switch (event.key) {
            case 'ArrowLeft':
                this.keyboard.x = Math.max(20, this.keyboard.x - step);
                break;
            case 'ArrowRight':
                this.keyboard.x = Math.min(window.innerWidth - 20, this.keyboard.x + step);
                break;
            case 'ArrowUp':
                this.keyboard.y = Math.max(20, this.keyboard.y - step);
                break;
            case 'ArrowDown':
                this.keyboard.y = Math.min(window.innerHeight - 20, this.keyboard.y + step);
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                this.mouse.intentTarget = {
                    x: this.keyboard.x + this.keyboard.cameraX,
                    y: this.keyboard.y + this.keyboard.cameraY
                };
                announcer.announce(announcer.t('announcer.targetSet'));
                this.deactivateKeyboardMode();
                return;
            case 'Escape':
                this.toggleKeyboardMode(announcer);
                return;
            default:
                return;
        }

        this.updateCursorPosition();
        event.preventDefault();
    },

    updateCursorPosition() {
        const cursor = document.getElementById('keyboard-cursor');

        if (cursor) {
            cursor.style.left = `${this.keyboard.x}px`;
            cursor.style.top = `${this.keyboard.y}px`;
        }
    }
};
