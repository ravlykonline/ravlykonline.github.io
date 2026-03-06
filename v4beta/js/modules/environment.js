// js/modules/environment.js
import { RavlykError } from './ravlykParser.js';

export class Environment {
    constructor(parent = null) {
        this.parent = parent;
        this.vars = new Map();
    }

    get(name) {
        if (this.vars.has(name)) return this.vars.get(name);
        if (this.parent) return this.parent.get(name);
        throw new RavlykError("UNDEFINED_VARIABLE", name);
    }

    define(name, value) {
        this.vars.set(name, value);
    }

    set(name, value) {
        this.vars.set(name, value);
    }

    clone() {
        const cloned = new Environment(this.parent);
        for (const [key, value] of this.vars.entries()) {
            cloned.vars.set(key, value);
        }
        return cloned;
    }
}
