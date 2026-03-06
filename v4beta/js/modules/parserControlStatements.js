export function parseGameStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstBlockOrThrow,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 1 >= tokens.length || tokens[startIndex + 1] !== '(') {
        throw createError('REPEAT_EXPECT_OPEN_PAREN');
    }
    const gameBlock = parseAstBlockOrThrow(tokens, tokenMeta, startIndex + 1);
    return {
        stmt: {
            type: 'GameStmt',
            body: gameBlock.body,
            span: spanFromMeta(tokenMeta, startIndex, gameBlock.nextIndex),
        },
        nextIndex: gameBlock.nextIndex,
    };
}

export function parseRepeatStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstExpressionOrThrow,
    parseAstBlockOrThrow,
    spanFromMeta,
    createError,
}) {
    const countExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 1);
    if (countExpr.nextIndex >= tokens.length || tokens[countExpr.nextIndex] !== '(') {
        throw createError('REPEAT_EXPECT_OPEN_PAREN');
    }
    const parsedBody = parseAstBlockOrThrow(tokens, tokenMeta, countExpr.nextIndex);
    return {
        stmt: {
            type: 'RepeatStmt',
            count: countExpr.expr,
            body: parsedBody.body,
            span: spanFromMeta(tokenMeta, startIndex, parsedBody.nextIndex),
        },
        nextIndex: parsedBody.nextIndex,
    };
}

export function parseIfStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstConditionOrThrow,
    parseAstBlockOrThrow,
    spanFromMeta,
    createError,
    keywordElse,
}) {
    const condition = parseAstConditionOrThrow(tokens, tokenMeta, startIndex + 1);
    if (condition.nextIndex >= tokens.length || tokens[condition.nextIndex] !== '(') {
        throw createError('REPEAT_EXPECT_OPEN_PAREN');
    }
    const thenBlock = parseAstBlockOrThrow(tokens, tokenMeta, condition.nextIndex);
    let nextIndex = thenBlock.nextIndex;
    let elseBody = [];
    const maybeElse = tokens[nextIndex]?.toLowerCase();
    if (maybeElse === keywordElse || maybeElse === 'else') {
        if (nextIndex + 1 >= tokens.length || tokens[nextIndex + 1] !== '(') {
            throw createError('REPEAT_EXPECT_OPEN_PAREN');
        }
        const elseBlock = parseAstBlockOrThrow(tokens, tokenMeta, nextIndex + 1);
        elseBody = elseBlock.body;
        nextIndex = elseBlock.nextIndex;
    }
    return {
        stmt: {
            type: 'IfStmt',
            condition: condition.condition,
            thenBody: thenBlock.body,
            elseBody,
            span: spanFromMeta(tokenMeta, startIndex, nextIndex),
        },
        nextIndex,
    };
}
