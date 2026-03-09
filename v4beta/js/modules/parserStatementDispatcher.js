export function parseNextStatementToAst({
    tokens,
    tokenMeta,
    index,
    token,
    tokenLower,
    isValidIdentifier,
    parseCreateStatementToAst,
    parseGameStatementToAst,
    parseMoveStatementToAst,
    parseTurnStatementToAst,
    parseColorStatementToAst,
    parseBackgroundStatementToAst,
    parsePenStatementToAst,
    parseClearStatementToAst,
    parseThicknessStatementToAst,
    parseGotoStatementToAst,
    parseRepeatStatementToAst,
    parseIfStatementToAst,
    parseAssignmentStatementToAst,
    parseFunctionCallStatementToAst,
    createUnknownCommandError,
    keywordCreate,
    keywordGame,
    keywordBackward,
    keywordLeft,
    keywordPenUp,
    keywordIf,
}) {
    if (tokenLower === keywordCreate || tokenLower === 'create') {
        return parseCreateStatementToAst(tokens, tokenMeta, index);
    }

    if (tokenLower === keywordGame || tokenLower === 'game') {
        return parseGameStatementToAst(tokens, tokenMeta, index);
    }

    if (tokenLower === 'вперед' || tokenLower === 'forward' || tokenLower === keywordBackward || tokenLower === 'backward') {
        return parseMoveStatementToAst(tokens, tokenMeta, index, tokenLower);
    }

    if (tokenLower === 'праворуч' || tokenLower === 'right' || tokenLower === keywordLeft || tokenLower === 'left') {
        return parseTurnStatementToAst(tokens, tokenMeta, index, tokenLower);
    }

    if (tokenLower === 'колір' || tokenLower === 'color') {
        return parseColorStatementToAst(tokens, tokenMeta, index, token);
    }

    if (tokenLower === 'фон' || tokenLower === 'background') {
        return parseBackgroundStatementToAst(tokens, tokenMeta, index, token);
    }

    if (tokenLower === keywordPenUp || tokenLower === 'penup' || tokenLower === 'опустити' || tokenLower === 'pendown') {
        return parsePenStatementToAst(tokenMeta, index, tokenLower);
    }

    if (tokenLower === 'очистити' || tokenLower === 'clear') {
        return parseClearStatementToAst(tokenMeta, index);
    }

    if (tokenLower === 'товщина' || tokenLower === 'thickness') {
        return parseThicknessStatementToAst(tokens, tokenMeta, index);
    }

    if (tokenLower === 'перейти' || tokenLower === 'goto') {
        return parseGotoStatementToAst(tokens, tokenMeta, index);
    }

    if (tokenLower === 'повторити' || tokenLower === 'повтори' || tokenLower === 'repeat') {
        return parseRepeatStatementToAst(tokens, tokenMeta, index);
    }

    if (tokenLower === keywordIf || tokenLower === 'if') {
        return parseIfStatementToAst(tokens, tokenMeta, index);
    }

    if (isValidIdentifier(token) && index + 1 < tokens.length && tokens[index + 1] === '=') {
        return parseAssignmentStatementToAst(tokens, tokenMeta, index);
    }

    if (isValidIdentifier(token) && index + 1 < tokens.length && tokens[index + 1] === '(') {
        return parseFunctionCallStatementToAst(tokens, tokenMeta, index);
    }

    if (token === '(' || token === ')') {
        throw createUnknownCommandError(`${token} (неочікувана дужка)`);
    }

    throw createUnknownCommandError(token);
}
