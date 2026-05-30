export function tokenizeWithMetadata(codeStr, createError = null) {
    const tokens = [];
    const meta = [];
    const lines = String(codeStr ?? '').split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const sourceLine = lines[lineIndex];
        const commentIndex = findCommentStart(sourceLine);
        const lineWithoutComment = commentIndex >= 0 ? sourceLine.slice(0, commentIndex) : sourceLine;
        const unclosedQuoteColumn = findUnclosedQuoteColumn(lineWithoutComment);
        if (unclosedQuoteColumn !== -1) {
            throw createTokenizeError(createError, lineIndex + 1, unclosedQuoteColumn + 1);
        }
        const tokenRegex = /"[^"\r\n]*"|>=|<=|!=|[(),=<>+\-*/%]|[^\s(),=<>+\-*/%"]+/g;

        let match;
        while ((match = tokenRegex.exec(lineWithoutComment)) !== null) {
            const value = match[0];
            if (!value.trim()) continue;
            tokens.push(value);
            meta.push({
                line: lineIndex + 1,
                column: match.index + 1,
                token: value,
            });
        }
    }

    return { tokens, meta };
}

function createTokenizeError(createError, line, column) {
    const error = typeof createError === 'function'
        ? createError('UNCLOSED_STRING')
        : new Error('UNCLOSED_STRING');
    error.name = error.name || 'RavlykError';
    error.messageKey = error.messageKey || 'UNCLOSED_STRING';
    error.line = line;
    error.column = column;
    error.token = '"';
    return error;
}

function findUnclosedQuoteColumn(sourceLine) {
    let openQuoteIndex = -1;

    for (let index = 0; index < sourceLine.length; index++) {
        if (sourceLine[index] !== '"') continue;
        if (openQuoteIndex === -1) {
            openQuoteIndex = index;
        } else {
            openQuoteIndex = -1;
        }
    }

    return openQuoteIndex;
}

function findCommentStart(sourceLine) {
    let inString = false;

    for (let index = 0; index < sourceLine.length; index++) {
        const char = sourceLine[index];

        if (char === '"') {
            inString = !inString;
            continue;
        }

        if (inString) continue;

        if (char === '#') return index;
        if (char === '/' && sourceLine[index + 1] === '/') return index;
    }

    return -1;
}
