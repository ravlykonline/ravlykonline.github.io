export function shouldConfirmExampleReplacement(currentCode, exampleCode) {
    const current = typeof currentCode === 'string' ? currentCode : '';
    const example = typeof exampleCode === 'string' ? exampleCode : '';
    return current.trim().length > 0 && current !== example;
}

export function createEditorInputController({
    codeEditor,
    exampleBlocks,
    editorUi,
    executionController,
    interpreter,
    requestExampleConfirmation,
}) {
    function loadAndRunExample(code) {
        codeEditor.value = code;
        if (editorUi.getEditorErrorLine() !== null) editorUi.setEditorErrorLine(null);
        editorUi.updateEditorDecorations();
        executionController.runCode();
    }

    function activateExample(block) {
        if (interpreter.isExecuting) return;
        const code = block.getAttribute('data-code');
        if (!code) return;

        if (shouldConfirmExampleReplacement(codeEditor.value, code)) {
            requestExampleConfirmation({
                triggerElement: block,
                onConfirm: () => loadAndRunExample(code),
            });
            return;
        }

        loadAndRunExample(code);
    }

    function setupExampleBlocks() {
        exampleBlocks.forEach((block) => {
            block.addEventListener('click', () => activateExample(block));
            block.setAttribute('role', 'button');
            block.setAttribute('tabindex', '0');
            block.addEventListener('keydown', (event) => {
                if (interpreter.isExecuting) return;
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    block.click();
                }
            });
        });
    }

    function handleEditorKeyDown(event) {
        if (interpreter.isExecuting && event.key !== 'Escape') {
            event.preventDefault();
            return;
        }
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || event.shiftKey)) {
            event.preventDefault();
            executionController.runCode();
        }
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            codeEditor.value = codeEditor.value.substring(0, start) + '  ' + codeEditor.value.substring(end);
            codeEditor.selectionStart = codeEditor.selectionEnd = start + 2;
            editorUi.updateEditorDecorations();
        }
    }

    function handleEditorInput() {
        if (editorUi.getEditorErrorLine() !== null) editorUi.setEditorErrorLine(null);
        editorUi.updateEditorDecorations();
    }

    function setupEditorInputListeners() {
        codeEditor.addEventListener('keydown', handleEditorKeyDown);
        codeEditor.addEventListener('input', handleEditorInput);
        codeEditor.addEventListener('scroll', editorUi.updateEditorDecorations);
        codeEditor.addEventListener('click', editorUi.updateEditorDecorations);
        codeEditor.addEventListener('keyup', editorUi.updateEditorDecorations);
        codeEditor.addEventListener('focus', editorUi.updateEditorDecorations);
    }

    function setupPlaceholderBehavior() {
        const defaultPlaceholder = codeEditor.getAttribute('placeholder') || '';
        codeEditor.addEventListener('focus', () => codeEditor.setAttribute('placeholder', ''));
        codeEditor.addEventListener('blur', () => {
            if (!codeEditor.value) codeEditor.setAttribute('placeholder', defaultPlaceholder);
        });
    }

    return {
        setupExampleBlocks,
        setupEditorInputListeners,
        setupPlaceholderBehavior,
    };
}
