export function tokenizeWithMetadata(codeStr) {
    const tokens = [];
    const meta = [];
    const lines = String(codeStr ?? '').split(/\r?\n/);

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const sourceLine = lines[lineIndex];
        const commentIndex = sourceLine.indexOf('#');
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
