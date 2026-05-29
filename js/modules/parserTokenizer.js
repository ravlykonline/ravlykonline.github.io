export function tokenizeWithMetadata(codeStr) {
    const tokens = [];
    const meta = [];
    const lines = String(codeStr ?? '').split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const sourceLine = lines[lineIndex];
        const commentIndex = findCommentStart(sourceLine);
        const lineWithoutComment = commentIndex >= 0 ? sourceLine.slice(0, commentIndex) : sourceLine;
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
