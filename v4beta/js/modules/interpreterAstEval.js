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
        return NaN;
    };

    try {
        return evaluate(expr);
    } catch (error) {
        attachErrorLocation(error, expr);
        throw error;
    }
}
