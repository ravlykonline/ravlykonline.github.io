export const SceneManager = {
    stack: [],

    get active() {
        return this.stack[this.stack.length - 1];
    },

    push(scene) {
        if (this.active?.pause) {
            this.active.pause();
        }

        this.stack.push(scene);

        if (scene.init) {
            scene.init();
        }
    },

    pop() {
        const scene = this.stack.pop();

        if (scene?.destroy) {
            scene.destroy();
        }

        if (this.active?.resume) {
            this.active.resume();
        }
    },

    update() {
        if (this.active?.update) {
            this.active.update();
        }
    },

    render() {
        if (this.active?.render) {
            this.active.render();
        }
    }
};
