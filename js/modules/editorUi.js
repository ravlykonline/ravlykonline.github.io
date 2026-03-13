function detectErrorLine(code, message) {
    if (!code || !message) return null;
    const lines = code.split(/\r?\n/);
    if (!lines.length) return null;

    const candidates = [];
    const quotedMatches = [...message.matchAll(/"([^"]+)"/g)];
    quotedMatches.forEach((match) => {
        if (match[1] && match[1].trim()) candidates.push(match[1].trim());
    });

    const colonMatch = message.match(/:\s*([^\s"].+)$/);
    if (colonMatch && colonMatch[1]) candidates.push(colonMatch[1].trim());

    if (message.toLowerCase().includes('повторити')) candidates.push('повторити');
    if (message.toLowerCase().includes('створити')) candidates.push('створити');
    if (message.toLowerCase().includes('колір')) candidates.push('колір');
    if (message.toLowerCase().includes('перейти')) candidates.push('перейти');

    const uniqueCandidates = [...new Set(candidates.map((candidate) => candidate.toLowerCase()))];

    for (const candidate of uniqueCandidates) {
        const lineIndex = lines.findIndex((line) => line.toLowerCase().includes(candidate));
        if (lineIndex >= 0) return lineIndex + 1;
    }

    return null;
}

function getErrorLocation(code, error) {
    if (!error) return { line: null, column: null };
    if (typeof error.line === 'number' && error.line > 0) {
        return {
            line: error.line,
            column: (typeof error.column === 'number' && error.column > 0) ? error.column : null,
        };
    }
    return { line: detectErrorLine(code, error.message), column: null };
}

function formatErrorWithLine(message, line, column) {
    if (!message || !line) return message;
    if (/\(рядок\s+\d+(?:,\s*позиція\s+\d+)?\)\s*$/i.test(message)) return message;
    if (column) return `${message} (рядок ${line}, позиція ${column})`;
    return `${message} (рядок ${line})`;
}

function toFriendlyErrorMessage(message) {
    if (!message) return 'Ой, щось пішло не так. Спробуй ще раз.';
    const lineMatch = message.match(/рядок\s+(\d+)/i);
    if (lineMatch) {
        return `Ой, тут є помилка: ${message} Перевір особливо уважно рядок ${lineMatch[1]}.`;
    }
    return `Ой, тут є помилка: ${message}`;
}

function getCurrentEditorLine(codeEditor) {
    const cursor = codeEditor.selectionStart || 0;
    const beforeCursor = codeEditor.value.slice(0, cursor);
    return beforeCursor.split(/\n/).length;
}

function buildLineNumbersText(totalLines) {
    let lines = '';
    for (let i = 1; i <= totalLines; i++) {
        lines += `${i}\n`;
    }
    return lines.trimEnd();
}

export function createEditorUiController({
    codeEditor,
    codeLineNumbers,
    codeActiveLine,
    codeErrorLine,
}) {
    let editorErrorLine = null;

    function updateEditorDecorations() {
        if (!codeEditor || !codeLineNumbers || !codeActiveLine) return;

        const value = codeEditor.value || '';
        const totalLines = value ? value.split(/\n/).length : 1;
        codeLineNumbers.textContent = buildLineNumbersText(totalLines);
        codeLineNumbers.scrollTop = codeEditor.scrollTop;

        const styles = getComputedStyle(codeEditor);
        const lineHeight = parseFloat(styles.lineHeight) || 24;
        const paddingTop = parseFloat(styles.paddingTop) || 0;
        const currentLine = Math.max(1, getCurrentEditorLine(codeEditor));
        const top = paddingTop + (currentLine - 1) * lineHeight - codeEditor.scrollTop;

        codeActiveLine.style.height = `${lineHeight}px`;
        codeActiveLine.style.top = `${Math.max(0, top)}px`;

        if (codeErrorLine) {
            if (editorErrorLine && editorErrorLine <= totalLines) {
                const errorTop = paddingTop + (editorErrorLine - 1) * lineHeight - codeEditor.scrollTop;
                codeErrorLine.classList.remove('hidden');
                codeErrorLine.style.height = `${lineHeight}px`;
                codeErrorLine.style.top = `${Math.max(0, errorTop)}px`;
            } else {
                codeErrorLine.classList.add('hidden');
            }
        }
    }

    function setEditorErrorLine(line) {
        editorErrorLine = Number.isInteger(line) && line > 0 ? line : null;
        updateEditorDecorations();
    }

    function getEditorErrorLine() {
        return editorErrorLine;
    }

    function focusEditorLine(line) {
        if (!Number.isInteger(line) || line < 1) return;
        const lines = (codeEditor.value || '').split(/\n/);
        const safeLine = Math.min(line, Math.max(1, lines.length));
        let start = 0;
        for (let i = 1; i < safeLine; i++) {
            start += lines[i - 1].length + 1;
        }
        codeEditor.focus();
        codeEditor.setSelectionRange(start, start);
    }

    function getFriendlyExecutionError(code, error) {
        const { line, column } = getErrorLocation(code, error);
        const lineAwareMessage = formatErrorWithLine(error?.message, line, column);
        return {
            line,
            message: toFriendlyErrorMessage(lineAwareMessage),
        };
    }

    return {
        updateEditorDecorations,
        setEditorErrorLine,
        getEditorErrorLine,
        focusEditorLine,
        getFriendlyExecutionError,
    };
}
