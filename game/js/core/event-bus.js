export const EventBus = {
    listeners: {},

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = new Set();
        }

        this.listeners[event].add(callback);
        return () => this.off(event, callback);
    },

    off(event, callback) {
        this.listeners[event]?.delete(callback);
    },

    emit(event, data) {
        if (!this.listeners[event]) {
            return;
        }

        this.listeners[event].forEach((callback) => callback(data));
    },

    reset() {
        this.listeners = {};
    }
};
