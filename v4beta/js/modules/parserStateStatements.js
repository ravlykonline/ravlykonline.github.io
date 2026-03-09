import { MAX_PEN_SIZE, MIN_PEN_SIZE } from './constants.js';

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

function isUnsignedIntegerToken(token) {
    return /^\d+$/.test(String(token || ''));
}

export function parseThicknessStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    spanFromMeta,
    createError,
}) {
    const firstArg = tokens[startIndex + 1];
    const secondArg = tokens[startIndex + 2];
    const hasExplicitNegativeNumber = firstArg === '-' && isUnsignedIntegerToken(secondArg);

    if (typeof firstArg === 'undefined') {
        throw createError('NO_THICKNESS_VALUE');
    }

    if (hasExplicitNegativeNumber) {
        throw createError('THICKNESS_OUT_OF_RANGE');
    }

    if (!isUnsignedIntegerToken(firstArg)) {
        throw createError('INVALID_THICKNESS_VALUE');
    }

    const thickness = Number(firstArg);
    if (!Number.isInteger(thickness)) {
        throw createError('INVALID_THICKNESS_VALUE');
    }

    if (thickness < MIN_PEN_SIZE || thickness > MAX_PEN_SIZE) {
        throw createError('THICKNESS_OUT_OF_RANGE');
    }

    return {
        stmt: {
            type: 'ThicknessStmt',
            thickness,
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 2),
        },
        nextIndex: startIndex + 2,
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
