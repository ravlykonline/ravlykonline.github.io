function readHyphenatedIdentifier(tokens, startIndex) {
    let endIndex = startIndex;
    while (
        tokens[endIndex + 1] === '-'
        && typeof tokens[endIndex + 2] === 'string'
        && /^[\p{L}\p{N}_]+$/u.test(tokens[endIndex + 2])
    ) {
        endIndex += 2;
    }
    if (endIndex === startIndex) return null;
    return {
        name: tokens.slice(startIndex, endIndex + 1).join(''),
        nextIndex: endIndex + 1,
    };
}

export function parseCreateStatementToAst({
    tokens,
    tokenMeta,
    startIndex,
    isValidIdentifier,
    normalizeIdentifier,
    parseAstExpressionOrThrow,
    parseAstBlockOrThrow,
    spanFromMeta,
    createError,
}) {
    if (startIndex + 2 >= tokens.length) {
        throw createError('FUNCTION_DECLARATION_SYNTAX');
    }
    const name = tokens[startIndex + 1];
    if (!isValidIdentifier(name)) {
        throw createError('FUNCTION_NAME_INVALID', name);
    }

    const hyphenatedName = readHyphenatedIdentifier(tokens, startIndex + 1);
    if (hyphenatedName) {
        const errorKey = tokens[hyphenatedName.nextIndex] === '='
            ? 'VARIABLE_NAME_INVALID'
            : 'FUNCTION_NAME_INVALID';
        throw createError(errorKey, hyphenatedName.name);
    }

    if (tokens[startIndex + 2] === '=') {
        const valueExpr = parseAstExpressionOrThrow(tokens, tokenMeta, startIndex + 3);
        return {
            stmt: {
                type: 'AssignmentStmt',
                name: normalizeIdentifier(name),
                expr: valueExpr.expr,
                declaredWithCreate: true,
                span: spanFromMeta(tokenMeta, startIndex, valueExpr.nextIndex),
            },
            nextIndex: valueExpr.nextIndex,
        };
    }

    if (tokens[startIndex + 2] === '(') {
        const params = [];
        let i = startIndex + 3;
        while (i < tokens.length && tokens[i] !== ')') {
            const param = tokens[i];
            if (!isValidIdentifier(param)) {
                throw createError('FUNCTION_PARAM_INVALID', param);
            }
            const hyphenatedParam = readHyphenatedIdentifier(tokens, i);
            if (hyphenatedParam) {
                throw createError('FUNCTION_PARAM_INVALID', hyphenatedParam.name);
            }
            params.push(normalizeIdentifier(param));
            i++;
            if (tokens[i] === ',') {
                i++;
            } else if (tokens[i] !== ')') {
                throw createError('FUNCTION_DECLARATION_SYNTAX');
            }
        }
        if (i >= tokens.length || tokens[i] !== ')') {
            throw createError('FUNCTION_DECLARATION_SYNTAX');
        }
        if (i + 1 >= tokens.length || tokens[i + 1] !== '(') {
            throw createError('FUNCTION_DECLARATION_SYNTAX');
        }
        const parsedBody = parseAstBlockOrThrow(tokens, tokenMeta, i + 1);
        return {
            stmt: {
                type: 'FunctionDefStmt',
                name: normalizeIdentifier(name),
                params,
                body: parsedBody.body,
                span: spanFromMeta(tokenMeta, startIndex, parsedBody.nextIndex),
            },
            nextIndex: parsedBody.nextIndex,
        };
    }

    throw createError('FUNCTION_DECLARATION_SYNTAX');
}
