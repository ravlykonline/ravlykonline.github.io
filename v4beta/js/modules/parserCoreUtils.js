export function attachParserErrorLocation(error, tokenIndex, tokenMeta) {
    if (!error || error.name !== 'RavlykError') return;
    if (typeof error.line === 'number' && error.line > 0) return;
    if (!tokenMeta || tokenIndex < 0 || tokenIndex >= tokenMeta.length) return;

    const location = tokenMeta[tokenIndex];
    if (!location) return;

    error.line = location.line;
    error.column = location.column;
    error.token = location.token;
}

export function normalizeParserIdentifier(identifier) {
    return String(identifier || '').toLowerCase();
}

export function isValidParserIdentifier(identifier) {
    return /^[\p{L}_][\p{L}\p{N}_-]*$/u.test(identifier);
}

export function parseQuotedParserStringOrThrow(rawToken, createUnknownCommandError) {
    if (typeof rawToken !== 'string' || rawToken.length < 2 || rawToken[0] !== '"' || rawToken[rawToken.length - 1] !== '"') {
        throw createUnknownCommandError(rawToken);
    }
    return rawToken.slice(1, -1);
}

export function spanFromTokenMeta(tokenMeta, startIndex, endIndexExclusive) {
    if (!Array.isArray(tokenMeta) || tokenMeta.length === 0) return null;

    const safeStart = Math.max(0, Math.min(startIndex, tokenMeta.length - 1));
    const safeEndExclusive = Math.max(safeStart + 1, Math.min(endIndexExclusive, tokenMeta.length));
    const start = tokenMeta[safeStart];
    const end = tokenMeta[safeEndExclusive - 1];
    if (!start || !end) return null;

    return {
        start: { line: start.line, column: start.column, token: start.token },
        end: {
            line: end.line,
            column: end.column + String(end.token || '').length,
            token: end.token,
        },
    };
}
