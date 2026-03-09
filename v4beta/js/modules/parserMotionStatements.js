function isRandomToken(token) {
    const normalized = String(token || '').toLowerCase();
    return normalized === 'випадково' || normalized === 'random';
}

export function parseMoveStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    tokenLower,
    parseAstExpressionOrThrow,
    spanFromMeta,
    backwardKeyword,
}) {
    const moveArgToken = tokens[startIndex + 1];
    if (isRandomToken(moveArgToken)) {
        return {
            stmt: {
                type: 'MoveStmt',
                direction: (tokenLower === backwardKeyword || tokenLower === 'backward') ? 'backward' : 'forward',
                distance: { kind: 'random' },
                span: spanFromMeta(tokenMeta, startIndex, startIndex + 2),
            },
            nextIndex: startIndex + 2,
        };
    }

    const parsedExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 1);
    return {
        stmt: {
            type: 'MoveStmt',
            direction: (tokenLower === backwardKeyword || tokenLower === 'backward') ? 'backward' : 'forward',
            distance: parsedExpr.expr,
            span: spanFromMeta(tokenMeta, startIndex, parsedExpr.nextIndex),
        },
        nextIndex: parsedExpr.nextIndex,
    };
}

export function parseTurnStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    tokenLower,
    parseAstExpressionOrThrow,
    spanFromMeta,
    leftKeyword,
}) {
    const parsedExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 1);
    return {
        stmt: {
            type: 'TurnStmt',
            direction: (tokenLower === leftKeyword || tokenLower === 'left') ? 'left' : 'right',
            angle: parsedExpr.expr,
            span: spanFromMeta(tokenMeta, startIndex, parsedExpr.nextIndex),
        },
        nextIndex: parsedExpr.nextIndex,
    };
}

export function parseGotoStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstExpressionOrThrow,
    spanFromMeta,
    gotoPrepositionKeyword,
}) {
    let xStart = startIndex + 1;
    const maybePrep = tokens[xStart]?.toLowerCase();
    if (maybePrep === gotoPrepositionKeyword || maybePrep === 'to') {
        xStart += 1;
    }
    if (isRandomToken(tokens[xStart])) {
        return {
            stmt: {
                type: 'GotoStmt',
                target: { kind: 'random' },
                span: spanFromMeta(tokenMeta, startIndex, xStart + 1),
            },
            nextIndex: xStart + 1,
        };
    }
    const xExpr = parseAstExpressionOrThrow(tokens, tokenMeta, xStart);
    let yStart = xExpr.nextIndex;
    if (tokens[yStart] === ',') yStart += 1;
    const yExpr = parseAstExpressionOrThrow(tokens, tokenMeta, yStart);
    return {
        stmt: {
            type: 'GotoStmt',
            x: xExpr.expr,
            y: yExpr.expr,
            span: spanFromMeta(tokenMeta, startIndex, yExpr.nextIndex),
        },
        nextIndex: yExpr.nextIndex,
    };
}
