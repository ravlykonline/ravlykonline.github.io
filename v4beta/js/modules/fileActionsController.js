import {
    decodeCodeFromUrlHash,
    buildShareLink,
    copyTextToClipboard,
} from './share.js';
import { composeCanvasLayersForExport } from './backgroundLayer.js';

export function createFileActionsController({
    canvas,
    backgroundCanvas,
    codeEditor,
    maxCodeLengthChars,
    maxShareUrlLengthChars,
    errorMessages,
    successMessages,
    showError,
    showSuccessMessage,
    showInfoMessage,
    onCodeLoaded,
    getCanvasBackgroundColor,
}) {
    function saveDrawing() {
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (!tempCtx) {
                throw new Error('Canvas 2D context is unavailable for export');
            }

            const parentBgColor = canvas.parentElement
                ? getComputedStyle(canvas.parentElement).backgroundColor
                : '';

            const canvasBgColor = getCanvasBackgroundColor?.()
                || getComputedStyle(canvas).backgroundColor
                || parentBgColor
                || 'white';
            composeCanvasLayersForExport({
                tempCtx,
                tempCanvas,
                canvas,
                backgroundCanvas,
                canvasBackgroundColor: canvasBgColor,
            });

            const link = document.createElement('a');
            link.download = `ravlyk-малюнок-${Date.now()}.png`;
            link.href = tempCanvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showSuccessMessage(successMessages.IMAGE_SAVED);
        } catch (error) {
            if (error.name === 'SecurityError' && error.message.includes('tainted')) {
                showError(errorMessages.SAVE_IMAGE_SECURITY_ERROR, 0);
            } else {
                showError(errorMessages.SAVE_IMAGE_ERROR(error.message), 0);
            }
        }
    }

    function saveCodeToFile() {
        try {
            const code = codeEditor.value || '';
            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.download = `ravlyk-code-${Date.now()}.txt`;
            link.href = URL.createObjectURL(blob);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);
            showSuccessMessage('Код збережено!');
        } catch (error) {
            showError(`Не вдалося зберегти код: ${error.message}`, 0);
        }
    }

    async function shareCodeAsLink() {
        const code = codeEditor.value || '';
        if (!code.trim()) {
            showInfoMessage('Поле коду порожнє. Додай команди перед поширенням.');
            return;
        }
        if (code.length > maxCodeLengthChars) {
            showError(errorMessages.CODE_TOO_LONG, 0);
            return;
        }

        const shareLink = buildShareLink(code);
        if (shareLink.length > maxShareUrlLengthChars) {
            showError('Код завеликий для посилання. Скористайся кнопкою "Код".', 0);
            return;
        }

        try {
            await copyTextToClipboard(shareLink);
            showSuccessMessage('Посилання з кодом скопійовано!');
        } catch (error) {
            showError('Не вдалося скопіювати посилання. Спробуй ще раз.', 0);
        }
    }

    function loadCodeFromUrlHash() {
        const hashRaw = String(window.location.hash || '');
        if (!hashRaw.startsWith('#')) return;
        const hashValue = hashRaw.slice(1);
        if (!hashValue) return;

        const hashParams = new URLSearchParams(hashValue);
        const encodedCode = hashParams.get('code');
        if (!encodedCode) return;

        try {
            const decodedCode = decodeCodeFromUrlHash(encodedCode);
            if (decodedCode.length > maxCodeLengthChars) {
                showError(errorMessages.CODE_TOO_LONG, 0);
                return;
            }
            codeEditor.value = decodedCode;
            onCodeLoaded?.();
            showInfoMessage('Код завантажено з посилання. Переглянь його перед запуском.', 0);
        } catch (error) {
            showError('Посилання з кодом пошкоджене або неповне.', 0);
        }
    }

    return {
        saveDrawing,
        saveCodeToFile,
        shareCodeAsLink,
        loadCodeFromUrlHash,
    };
}
