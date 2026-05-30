import { ERROR_MESSAGES } from './constants.js';

function createEvalError(messageKey, ...params) {
    const template = ERROR_MESSAGES[messageKey];
    const message = typeof template === 'function' ? template(...params) : template;
    const error = new Error(message || messageKey);
    error.name = 'RavlykError';
    error.messageKey = messageKey;
    return error;
}

export function attachAstErrorLocation(error, node) {
    if (!error || error.name !== 'RavlykError') return;
    if (typeof error.line === 'number' && error.line > 0) return;
    const span = node?.span;
    const pos = span?.start;
    if (!pos) return;
    error.line = pos.line;
    error.column = pos.column;
    error.token = pos.token || null;
}

export function evalAstNumberExpression(expr, env, options = {}) {
    const attachErrorLocation = options.attachAstErrorLocation || attachAstErrorLocation;

    const evaluate = (node) => {
        if (!node || !node.type) return NaN;
        if (node.type === 'NumberLiteral') {
            return Number(node.value);
        }
        if (node.type === 'Identifier') {
            return env.get(node.name);
        }
        if (node.type === 'UnaryExpr') {
            const value = evaluate(node.expr);
            if (node.op === '+') return +value;
            if (node.op === '-') return -value;
            return NaN;
        }
        if (node.type === 'BinaryExpr') {
            const left = evaluate(node.left);
            const right = evaluate(node.right);
            if (node.op === '+') return left + right;
            if (node.op === '-') return left - right;
            if (node.op === '*') return left * right;
            if (node.op === '/') return right === 0 ? NaN : left / right;
            if (node.op === '%') return right === 0 ? NaN : left % right;
            return NaN;
        }
        if (node.type === 'BuiltinCallExpr') {
            const value = evaluate(node.args?.[0]);
            if (node.fn === 'abs') return Math.abs(value);
            if (node.fn === 'sqrt') {
                if (value < 0) {
                    throw createEvalError('SQRT_NEGATIVE');
                }
                return Math.sqrt(value);
            }
            return NaN;
        }
        return NaN;
    };

    try {
        return evaluate(expr);
    } catch (error) {
        attachErrorLocation(error, expr);
        throw error;
    }
}
