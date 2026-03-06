const STRICT_NUMBER_REGEX = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;

export function getOperatorPrecedence(operator) {
    if (operator === '+' || operator === '-') return 1;
    if (operator === '*' || operator === '/' || operator === '%') return 2;
    return -1;
}

export function parseAstExpressionOrThrow(tokens, tokenMeta, startIndex, helpers) {
    const {
        isValidIdentifier,
        normalizeIdentifier,
        spanFromMeta,
        createUnknownCommandError,
    } = helpers;

    const parsePrimary = (index) => {
        if (index >= tokens.length) throw createUnknownCommandError('expression');
        const token = tokens[index];
        if (token === '(') {
            const inner = parseWithPrecedence(index + 1, 0);
            if (inner.nextIndex >= tokens.length || tokens[inner.nextIndex] !== ')') {
                throw createUnknownCommandError(token);
            }
            return {
                expr: { ...inner.expr, span: spanFromMeta(tokenMeta, index, inner.nextIndex + 1) || inner.expr.span || null },
                nextIndex: inner.nextIndex + 1,
                startIndex: index,
            };
        }
        if (STRICT_NUMBER_REGEX.test(token)) {
            return {
                expr: { type: 'NumberLiteral', value: Number(token), span: spanFromMeta(tokenMeta, index, index + 1) },
                nextIndex: index + 1,
                startIndex: index,
            };
        }
        if (isValidIdentifier(token)) {
            return {
                expr: { type: 'Identifier', name: normalizeIdentifier(token), span: spanFromMeta(tokenMeta, index, index + 1) },
                nextIndex: index + 1,
                startIndex: index,
            };
        }
        throw createUnknownCommandError(token);
    };

    const parseUnary = (index) => {
        if (index >= tokens.length) throw createUnknownCommandError('expression');
        const token = tokens[index];
        if (token === '+' || token === '-') {
            const operand = parseUnary(index + 1);
            return {
                expr: {
                    type: 'UnaryExpr',
                    op: token,
                    expr: operand.expr,
                    span: spanFromMeta(tokenMeta, index, operand.nextIndex),
                },
                nextIndex: operand.nextIndex,
                startIndex: index,
            };
        }
        return parsePrimary(index);
    };

    const parseWithPrecedence = (index, minPrecedence) => {
        let left = parseUnary(index);
        while (left.nextIndex < tokens.length) {
            const operator = tokens[left.nextIndex];
            const precedence = getOperatorPrecedence(operator);
            if (precedence < minPrecedence) break;
            const right = parseWithPrecedence(left.nextIndex + 1, precedence + 1);
            left = {
                expr: {
                    type: 'BinaryExpr',
                    op: operator,
                    left: left.expr,
                    right: right.expr,
                    span: spanFromMeta(tokenMeta, left.startIndex, right.nextIndex),
                },
                nextIndex: right.nextIndex,
                startIndex: left.startIndex,
            };
        }
        return left;
    };

    return parseWithPrecedence(startIndex, 0);
}
