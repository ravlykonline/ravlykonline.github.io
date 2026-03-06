export function parseGameStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    parseAstBlockOrThrow,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 1 >= tokens.length || tokens[startIndex + 1] !== "(") {
        throw createError("REPEAT_EXPECT_OPEN_PAREN");
    }
    const gameBlock = parseAstBlockOrThrow(tokens, tokenMeta, startIndex + 1);
    return {
        stmt: {
            type: "GameStmt",
            body: gameBlock.body,
            span: spanFromMeta(tokenMeta, startIndex, gameBlock.nextIndex),
        },
        nextIndex: gameBlock.nextIndex,
    };
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
    const parsedExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 1);
    return {
        stmt: {
            type: "MoveStmt",
            direction: (tokenLower === backwardKeyword || tokenLower === "backward") ? "backward" : "forward",
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
            type: "TurnStmt",
            direction: (tokenLower === leftKeyword || tokenLower === "left") ? "left" : "right",
            angle: parsedExpr.expr,
            span: spanFromMeta(tokenMeta, startIndex, parsedExpr.nextIndex),
        },
        nextIndex: parsedExpr.nextIndex,
    };
}

export function parseColorStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    token,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 1 >= tokens.length) throw createError("NO_COLOR_NAME", token);
    return {
        stmt: {
            type: "ColorStmt",
            colorName: tokens[startIndex + 1].toLowerCase(),
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
            type: "PenStmt",
            mode: (tokenLower === penUpKeyword || tokenLower === "penup") ? "up" : "down",
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
            type: "ClearStmt",
            span: spanFromMeta(tokenMeta, startIndex, startIndex + 1),
        },
        nextIndex: startIndex + 1,
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
    if (maybePrep === gotoPrepositionKeyword || maybePrep === "to") {
        xStart += 1;
    }
    const xExpr = parseAstExpressionOrThrow(tokens, tokenMeta, xStart);
    let yStart = xExpr.nextIndex;
    if (tokens[yStart] === ",") yStart += 1;
    const yExpr = parseAstExpressionOrThrow(tokens, tokenMeta, yStart);
    return {
        stmt: {
            type: "GotoStmt",
            x: xExpr.expr,
            y: yExpr.expr,
            span: spanFromMeta(tokenMeta, startIndex, yExpr.nextIndex),
        },
        nextIndex: yExpr.nextIndex,
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
    if (countExpr.nextIndex >= tokens.length || tokens[countExpr.nextIndex] !== "(") {
        throw createError("REPEAT_EXPECT_OPEN_PAREN");
    }
    const parsedBody = parseAstBlockOrThrow(tokens, tokenMeta, countExpr.nextIndex);
    return {
        stmt: {
            type: "RepeatStmt",
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
    if (condition.nextIndex >= tokens.length || tokens[condition.nextIndex] !== "(") {
        throw createError("REPEAT_EXPECT_OPEN_PAREN");
    }
    const thenBlock = parseAstBlockOrThrow(tokens, tokenMeta, condition.nextIndex);
    let nextIndex = thenBlock.nextIndex;
    let elseBody = [];
    const maybeElse = tokens[nextIndex]?.toLowerCase();
    if (maybeElse === keywordElse || maybeElse === "else") {
        if (nextIndex + 1 >= tokens.length || tokens[nextIndex + 1] !== "(") {
            throw createError("REPEAT_EXPECT_OPEN_PAREN");
        }
        const elseBlock = parseAstBlockOrThrow(tokens, tokenMeta, nextIndex + 1);
        elseBody = elseBlock.body;
        nextIndex = elseBlock.nextIndex;
    }
    return {
        stmt: {
            type: "IfStmt",
            condition: condition.condition,
            thenBody: thenBlock.body,
            elseBody,
            span: spanFromMeta(tokenMeta, startIndex, nextIndex),
        },
        nextIndex,
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
            type: "AssignmentStmt",
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
    while (argIndex < tokens.length && tokens[argIndex] !== ")") {
        const parsedArg = parseAstExpressionOrThrow(tokens, tokenMeta, argIndex);
        args.push(parsedArg.expr);
        argIndex = parsedArg.nextIndex;
        if (tokens[argIndex] === ",") {
            argIndex += 1;
        } else if (tokens[argIndex] !== ")") {
            throw createError("FUNCTION_CALL_SYNTAX", tokens[startIndex]);
        }
    }
    if (argIndex >= tokens.length || tokens[argIndex] !== ")") {
        throw createError("FUNCTION_CALL_SYNTAX", tokens[startIndex]);
    }
    return {
        stmt: {
            type: "FunctionCallStmt",
            name,
            args,
            span: spanFromMeta(tokenMeta, startIndex, argIndex + 1),
        },
        nextIndex: argIndex + 1,
    };
}
