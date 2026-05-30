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
        if (this.vars.has(name)) {
            this.vars.set(name, value);
            return;
        }
        if (this.parent && this.parent.has(name)) {
            this.parent.set(name, value);
            return;
        }
        this.vars.set(name, value);
    }

    has(name) {
        if (this.vars.has(name)) return true;
        return this.parent ? this.parent.has(name) : false;
    }

    clone() {
        const cloned = new Environment(this.parent);
        for (const [key, value] of this.vars.entries()) {
            cloned.vars.set(key, value);
        }
        return cloned;
    }
}
