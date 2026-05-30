const STRICT_NUMBER_REGEX = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const NUMERIC_FUNCTIONS = new Map([
    ['модуль', 'abs'],
    ['abs', 'abs'],
    ['корінь', 'sqrt'],
    ['sqrt', 'sqrt'],
    ['випадково', 'randomRange'],
    ['random', 'randomRange'],
]);
const STATE_EXPRESSIONS = new Map([
    ['кут', 'currentAngle'],
]);

export function getOperatorPrecedence(operator) {
    if (operator === '+' || operator === '-') return 1;
    if (operator === '*' || operator === '/' || operator === '%') return 2;
    return -1;
}

export function parseAstExpressionOrThrow(tokens, tokenMeta, startIndex, helpers, options = {}) {
    const { minTopLevelPrecedence = 0 } = options;
    const {
        isValidIdentifier,
        normalizeIdentifier,
        spanFromMeta,
        createUnknownCommandError,
        createError,
    } = helpers;
    const makeError = createError || ((messageKey, ...params) => createUnknownCommandError(params[0] || messageKey));

    const parseFunctionArguments = (openParenIndex) => {
        const args = [];
        let nextIndex = openParenIndex + 1;
        if (nextIndex < tokens.length && tokens[nextIndex] === ')') {
            return { args, nextIndex: nextIndex + 1 };
        }

        while (nextIndex < tokens.length) {
            const parsedArg = parseWithPrecedence(nextIndex, 0);
            args.push(parsedArg.expr);
            nextIndex = parsedArg.nextIndex;

            if (nextIndex < tokens.length && tokens[nextIndex] === ',') {
                nextIndex++;
                continue;
            }
            if (nextIndex < tokens.length && tokens[nextIndex] === ')') {
                return { args, nextIndex: nextIndex + 1 };
            }
            throw createUnknownCommandError(tokens[nextIndex] || ')');
        }

        throw createUnknownCommandError(')');
    };

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
            const stateExprKind = STATE_EXPRESSIONS.get(token.toLowerCase());
            if (stateExprKind === 'currentAngle') {
                return {
                    expr: {
                        type: 'CurrentAngleExpr',
                        name: normalizeIdentifier(token),
                        span: spanFromMeta(tokenMeta, index, index + 1),
                    },
                    nextIndex: index + 1,
                    startIndex: index,
                };
            }
            const functionKind = NUMERIC_FUNCTIONS.get(token.toLowerCase());
            if (functionKind) {
                if (index + 1 >= tokens.length || tokens[index + 1] !== '(') {
                    throw makeError('MATH_FUNCTION_EXPECT_OPEN_PAREN', token);
                }
                const parsedArgs = parseFunctionArguments(index + 1);
                const expectedArgCount = functionKind === 'randomRange' ? 2 : 1;
                if (parsedArgs.args.length !== expectedArgCount) {
                    if (functionKind === 'randomRange') {
                        throw makeError('RANDOM_RANGE_ARGUMENT_COUNT');
                    }
                    throw makeError('MATH_FUNCTION_ARGUMENT_COUNT', token);
                }
                return {
                    expr: {
                        type: 'BuiltinCallExpr',
                        name: normalizeIdentifier(token),
                        fn: functionKind,
                        args: parsedArgs.args,
                        span: spanFromMeta(tokenMeta, index, parsedArgs.nextIndex),
                    },
                    nextIndex: parsedArgs.nextIndex,
                    startIndex: index,
                };
            }
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

    return parseWithPrecedence(startIndex, minTopLevelPrecedence);
}
