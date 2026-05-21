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
    parseAstCoordExpressionOrThrow,
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

    // Визначаємо режим парсингу координат по першому реальному роздільнику.
    //
    // 1. Парсимо x з повним пріоритетом.
    // 2. Дивимось на токен відразу після x:
    //    - кома → кома-режим: x+5, y-2 (арифметика, без перепарсингу).
    //    - інше → coord-режим: перепарсуємо x з minTopLevelPrecedence=2,
    //      щоб `50 -200` давало x=50, y=-200, а не x=50-200=-150.
    //
    // Пошук коми лише після x (не 20 токенів наперед!) виключає помилкове
    // спрацювання від коми у наступному рядку: `goto 50 -200\nbox(1,2)`.
    const coordFn = parseAstCoordExpressionOrThrow ?? parseAstExpressionOrThrow;
    const xExprFull = parseAstExpressionOrThrow(tokens, tokenMeta, xStart);
    let xExpr, yStart, parseY;
    if (tokens[xExprFull.nextIndex] === ',') {
        // Кома-режим: повний пріоритет для обох координат, кому пропускаємо.
        xExpr = xExprFull;
        yStart = xExprFull.nextIndex + 1;
        parseY = parseAstExpressionOrThrow;
    } else {
        // Coord-режим: перепарсуємо x з обмеженим пріоритетом (minTopLevelPrecedence=2),
        // щоб `50 -200` давало x=50, y=-200, а не x=50-200=-150.
        xExpr = coordFn(tokens, tokenMeta, xStart);
        yStart = xExpr.nextIndex;
        parseY = coordFn;
    }
    const yExpr = parseY(tokens, tokenMeta, yStart);
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
