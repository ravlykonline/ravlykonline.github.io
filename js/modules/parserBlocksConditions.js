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
    depth = 0,
}) {
    if (openParenIndex >= tokens.length || tokens[openParenIndex] !== '(') throw createError('REPEAT_EXPECT_OPEN_PAREN');
    const closeParenIndex = findClosingParenIndexFn(tokens, openParenIndex);
    if (closeParenIndex === -1) throw createError('REPEAT_EXPECT_CLOSE_PAREN');
    const innerTokens = tokens.slice(openParenIndex + 1, closeParenIndex);
    const innerMeta = tokenMeta ? tokenMeta.slice(openParenIndex + 1, closeParenIndex) : null;
    const body = parseTokensToAst(innerTokens, depth + 1, {}, innerMeta).body;
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

    let conditionStartIndex = startIndex;
    let notCount = 0;
    while (conditionStartIndex < tokens.length && tokens[conditionStartIndex].toLowerCase() === 'не') {
        notCount++;
        conditionStartIndex++;
    }

    if (conditionStartIndex >= tokens.length) throw createUnknownCommandError(keywordIf);

    const firstLower = tokens[conditionStartIndex].toLowerCase();
    let parsedCondition;
    if (firstLower === keywordEdge || firstLower === 'edge') {
        parsedCondition = {
            condition: { type: 'EdgeCondition', span: spanFromMeta(tokenMeta, conditionStartIndex, conditionStartIndex + 1) },
            nextIndex: conditionStartIndex + 1,
        };
    } else if (firstLower === keywordKey || firstLower === 'key') {
        const keyToken = tokens[conditionStartIndex + 1];
        const keyValue = parseQuotedStringOrThrow(keyToken).toLowerCase();
        parsedCondition = {
            condition: { type: 'KeyCondition', key: keyValue, span: spanFromMeta(tokenMeta, conditionStartIndex, conditionStartIndex + 2) },
            nextIndex: conditionStartIndex + 2,
        };
    } else {
        const left = parseAstExpressionOrThrow(tokens, tokenMeta, conditionStartIndex);
        const operator = tokens[left.nextIndex];
        if (!comparisonOperators.has(operator)) throw createUnknownCommandError(operator || keywordIf);
        const right = parseAstExpressionOrThrow(tokens, tokenMeta, left.nextIndex + 1);
        parsedCondition = {
            condition: {
                type: 'CompareCondition',
                op: operator,
                left: left.expr,
                right: right.expr,
                span: spanFromMeta(tokenMeta, conditionStartIndex, right.nextIndex),
            },
            nextIndex: right.nextIndex,
        };
    }

    let condition = parsedCondition.condition;
    for (let i = 0; i < notCount; i++) {
        condition = {
            type: 'NotCondition',
            condition,
            span: spanFromMeta(tokenMeta, startIndex + notCount - i - 1, parsedCondition.nextIndex),
        };
    }

    return {
        condition,
        nextIndex: parsedCondition.nextIndex,
    };
}
