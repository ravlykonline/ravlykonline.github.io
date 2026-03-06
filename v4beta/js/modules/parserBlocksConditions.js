export function findClosingParenIndex(tokens, openParenIndex) {
    if (openParenIndex < 0 || openParenIndex >= tokens.length || tokens[openParenIndex] !== '(') {
        return -1;
    }
    let parenBalance = 1;
    for (let i = openParenIndex + 1; i < tokens.length; i++) {
        if (tokens[i] === '(') parenBalance++;
        else if (tokens[i] === ')') parenBalance--;
        if (parenBalance === 0) return i;
    }
    return -1;
}

export function parseAstBlockOrThrow({
    tokens,
    tokenMeta,
    openParenIndex,
    findClosingParenIndexFn,
    parseTokensToAst,
    spanFromMeta,
    createError,
}) {
    if (openParenIndex >= tokens.length || tokens[openParenIndex] !== '(') throw createError('REPEAT_EXPECT_OPEN_PAREN');
    const closeParenIndex = findClosingParenIndexFn(tokens, openParenIndex);
    if (closeParenIndex === -1) throw createError('REPEAT_EXPECT_CLOSE_PAREN');
    const innerTokens = tokens.slice(openParenIndex + 1, closeParenIndex);
    const innerMeta = tokenMeta ? tokenMeta.slice(openParenIndex + 1, closeParenIndex) : null;
    const body = parseTokensToAst(innerTokens, 0, {}, innerMeta).body;
    return { body, nextIndex: closeParenIndex + 1, span: spanFromMeta(tokenMeta, openParenIndex, closeParenIndex + 1) };
}

export function parseAstConditionOrThrow({
    tokens,
    tokenMeta,
    startIndex,
    keywordIf,
    keywordEdge,
    keywordKey,
    comparisonOperators,
    parseQuotedStringOrThrow,
    parseAstExpressionOrThrow,
    spanFromMeta,
    createUnknownCommandError,
}) {
    if (startIndex >= tokens.length) throw createUnknownCommandError(keywordIf);
    const firstLower = tokens[startIndex].toLowerCase();
    if (firstLower === keywordEdge || firstLower === 'edge') {
        return {
            condition: { type: 'EdgeCondition', span: spanFromMeta(tokenMeta, startIndex, startIndex + 1) },
            nextIndex: startIndex + 1,
        };
    }
    if (firstLower === keywordKey || firstLower === 'key') {
        const keyToken = tokens[startIndex + 1];
        const keyValue = parseQuotedStringOrThrow(keyToken).toLowerCase();
        return {
            condition: { type: 'KeyCondition', key: keyValue, span: spanFromMeta(tokenMeta, startIndex, startIndex + 2) },
            nextIndex: startIndex + 2,
        };
    }
    const left = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex);
    const operator = tokens[left.nextIndex];
    if (!comparisonOperators.has(operator)) throw createUnknownCommandError(operator || keywordIf);
    const right = parseAstExpressionOrThrow(tokens, tokenMeta, left.nextIndex + 1);
    return {
        condition: {
            type: 'CompareCondition',
            op: operator,
            left: left.expr,
            right: right.expr,
            span: spanFromMeta(tokenMeta, startIndex, right.nextIndex),
        },
        nextIndex: right.nextIndex,
    };
}
