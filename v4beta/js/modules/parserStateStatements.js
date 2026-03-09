function createNamedColorArg(value) {
    return {
        kind: 'named',
        value: String(value || '').toLowerCase(),
    };
}

function createColorArg(rawValue) {
    const normalized = String(rawValue || '').toLowerCase();
    if (normalized === 'випадково' || normalized === 'random') {
        return { kind: 'random' };
    }
    return createNamedColorArg(normalized);
}

export function parseColorStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    token,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 1 >= tokens.length) throw createError('NO_COLOR_NAME', token);
    return {
        stmt: {
            type: 'ColorStmt',
            colorArg: createColorArg(tokens[startIndex + 1]),
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 2),
        },
        nextIndex: startIndex + 2,
    };
}

export function parseBackgroundStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    token,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 1 >= tokens.length) throw createError('NO_COLOR_NAME', token);
    return {
        stmt: {
            type: 'BackgroundStmt',
            colorArg: createColorArg(tokens[startIndex + 1]),
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 2),
        },
        nextIndex: startIndex + 2,
    };
}

export function parsePenStatementToAst({
    tokenMeta,
    startIndex,
    tokenLower,
    spanFromMeta,
    penUpKeyword,
}) {
    return {
        stmt: {
            type: 'PenStmt',
            mode: (tokenLower === penUpKeyword || tokenLower === 'penup') ? 'up' : 'down',
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 1),
        },
        nextIndex: startIndex + 1,
    };
}

export function parseClearStatementToAst({
    tokenMeta,
    startIndex,
    spanFromMeta,
}) {
    return {
        stmt: {
            type: 'ClearStmt',
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 1),
        },
        nextIndex: startIndex + 1,
    };
}

export function parseAssignmentStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstExpressionOrThrow,
    normalizeIdentifier,
    spanFromMeta,
}) {
    const valueExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 2);
    return {
        stmt: {
            type: 'AssignmentStmt',
            name: normalizeIdentifier(tokens[startIndex]),
            expr: valueExpr.expr,
            declaredWithCreate: false,
            span: spanFromMeta(tokenMeta, startIndex, valueExpr.nextIndex),
        },
        nextIndex: valueExpr.nextIndex,
    };
}

export function parseFunctionCallStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstExpressionOrThrow,
    normalizeIdentifier,
    spanFromMeta,
    createError,
}) {
    const name = normalizeIdentifier(tokens[startIndex]);
    const args = [];
    let argIndex = startIndex + 2;
    while (argIndex < tokens.length && tokens[argIndex] !== ')') {
        const parsedArg = parseAstExpressionOrThrow(tokens, tokenMeta, argIndex);
        args.push(parsedArg.expr);
        argIndex = parsedArg.nextIndex;
        if (tokens[argIndex] === ',') {
            argIndex += 1;
        } else if (tokens[argIndex] !== ')') {
            throw createError('FUNCTION_CALL_SYNTAX', tokens[startIndex]);
        }
    }
    if (argIndex >= tokens.length || tokens[argIndex] !== ')') {
        throw createError('FUNCTION_CALL_SYNTAX', tokens[startIndex]);
    }
    return {
        stmt: {
            type: 'FunctionCallStmt',
            name,
            args,
            span: spanFromMeta(tokenMeta, startIndex, argIndex + 1),
        },
        nextIndex: argIndex + 1,
    };
}
