export function createEditorInputController({
    codeEditor,
    exampleBlocks,
    editorUi,
    executionController,
    interpreter,
}) {
    function setupExampleBlocks() {
        exampleBlocks.forEach((block) => {
            block.addEventListener('click', () => {
                if (interpreter.isExecuting) return;
                const code = block.getAttribute('data-code');
                if (code) {
                    codeEditor.value = code;
                    editorUi.updateEditorDecorations();
                    executionController.runCode();
                }
            });
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
