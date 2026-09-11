import {
    decodeCodeFromUrlHash,
    buildShareLink,
    copyTextToClipboard,
} from './share.js';
import { composeCanvasLayersForExport } from './backgroundLayer.js';
import { createGifCapture } from './gifCapture.js';
import { createGifEncodingController } from './gifEncodingController.js';

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
    confirmCodeReplacement = () => false,
    getCanvasBackgroundColor,
    interpreter,
    executionController,
    onGifProgress,
    createGifCaptureFn = createGifCapture,
    createGifEncodingControllerFn = createGifEncodingController,
}) {
    let gifExportActive = false;
    let activeGifCapture = null;
    let activeGifEncoding = null;
    let importRequest = 0;

    async function openCodeFromFile(file) {
        const request = ++importRequest;
        const isBusy = () => interpreter?.isExecuting || executionController?.isSessionActive?.();
        if (!file || isBusy()) return;
        const originalCode = codeEditor.value;
        if (!/\.txt$/i.test(file.name)) {
            showError('Обери текстовий файл із розширенням .txt.', 0);
            return;
        }
        // Bound bytes before reading, then enforce the existing source length limit.
        if (file.size > maxCodeLengthChars * 4 + 3) {
            showError(errorMessages.CODE_TOO_LONG, 0);
            return;
        }
        let code;
        try {
            const bytes = await file.arrayBuffer();
            code = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        } catch {
            if (request === importRequest) showError('Не вдалося прочитати файл. Збережи його як текст UTF-8 і спробуй ще раз.', 0);
            return;
        }
        if (request !== importRequest) return;
        if (code.length > maxCodeLengthChars) {
            showError(errorMessages.CODE_TOO_LONG, 0);
            return;
        }
        if (Array.from(code).some((char) => {
            const point = char.codePointAt(0);
            return (point < 32 && ![9, 10, 13].includes(point)) || (point >= 127 && point <= 159);
        })) {
            showError('Файл містить нетекстові символи. Обери звичайний текстовий файл із кодом Равлика.', 0);
            return;
        }
        if (!code.trim()) {
            showError('Файл порожній. Обери файл із кодом Равлика.', 0);
            return;
        }
        if (isBusy() || codeEditor.value !== originalCode) {
            showInfoMessage('Редактор змінився під час читання файлу. Відкрий файл ще раз після завершення роботи.');
            return;
        }
        if (originalCode.trim() && originalCode !== code && !confirmCodeReplacement()) return;
        // Treat even HTML/JavaScript-looking text only as editable source, never as DOM or JS.
        codeEditor.value = code;
        onCodeLoaded?.();
        showInfoMessage('Код відкрито з файлу. Переглянь його перед запуском.', 0);
    }
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
                showError(errorMessages.SAVE_IMAGE_ERROR, 0);
                console.error('Unexpected image export error:', error);
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
            showError(errorMessages.SAVE_CODE_ERROR, 0);
            console.error('Unexpected code export error:', error);
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
        } catch {
            showError('Не вдалося скопіювати посилання. Спробуй ще раз.', 0);
        }
    }

    function loadCodeFromUrlHash() {
        const hashRaw = String(window.location.hash || '');
        if (!hashRaw.startsWith('#')) return;
        if (hashRaw.length > maxShareUrlLengthChars) {
            showError(errorMessages.SHARE_LINK_TOO_LONG, 0);
            return;
        }
        const hashValue = hashRaw.slice(1);
        if (!hashValue) return;

        const hashParams = new URLSearchParams(hashValue);
        const encodedCode = hashParams.get('code');
        if (!encodedCode) return;
        if (encodedCode.length > maxShareUrlLengthChars) {
            showError(errorMessages.SHARE_LINK_TOO_LONG, 0);
            return;
        }

        try {
            const decodedCode = decodeCodeFromUrlHash(encodedCode);
            if (decodedCode.length > maxCodeLengthChars) {
                showError(errorMessages.CODE_TOO_LONG, 0);
                return;
            }
            codeEditor.value = decodedCode;
            onCodeLoaded?.();
            showInfoMessage('Код завантажено з посилання. Переглянь його перед запуском.', 0);
        } catch {
            showError(errorMessages.SHARE_LINK_INVALID, 0);
        }
    }

    async function saveGif() {
        if (!interpreter || !executionController || gifExportActive) return;
        const code = codeEditor.value?.trim();
        if (!code) {
            showInfoMessage('Поле коду порожнє. Додай команди перед записом GIF.');
            return;
        }
        if (interpreter.isExecuting || executionController.isSessionActive()) {
            showInfoMessage('Зачекай, поки завершиться поточне виконання.');
            return;
        }

        const gifCapture = createGifCaptureFn({
            canvas,
            backgroundCanvas,
            getCanvasBackgroundColor,
            onProgress: (pct) => onGifProgress?.('record', pct),
            onLimit: () => executionController.cancelActiveSession('capture-limit'),
        });
        gifExportActive = true;
        activeGifCapture = gifCapture;
        onGifProgress?.('record', 0);

        const cleanupGif = () => {
            if (!gifExportActive) return;
            gifCapture.stop();
            if (interpreter.gifCapture === gifCapture) interpreter.gifCapture = null;
            activeGifCapture = null;
            activeGifEncoding?.cancel();
            activeGifEncoding = null;
            gifExportActive = false;
            gifCapture.releaseFrames();
            onGifProgress?.(null, 0);
        };

        const result = await executionController.executeSession(code, {
            kind: 'gif',
            suppressSuccess: true,
            captureTimeoutMs: 20_000,
            cancel: () => activeGifEncoding?.cancel(),
            beforeExecute() {
                interpreter.gifCapture = gifCapture;
                gifCapture.start();
            },
            async afterExecute({ signal }) {
                signal.throwIfAborted();
                gifCapture.stop();
                interpreter.gifCapture = null;
                if (!gifCapture.hasFrames()) {
                    throw new Error('GIF_CAPTURE_EMPTY');
                }

                onGifProgress?.('encode', 92);
                await new Promise((resolve) => setTimeout(resolve, 30));
                signal.throwIfAborted();
                const frames = gifCapture.getFrames();
                const { w, h } = gifCapture.getDimensions();
                activeGifEncoding = createGifEncodingControllerFn();
                const gifBytes = await activeGifEncoding.encode({ frames, width: w, height: h });
                signal.throwIfAborted();
                activeGifEncoding = null;
                onGifProgress?.('done', 100);
                signal.throwIfAborted();

                const blob = new Blob([gifBytes], { type: 'image/gif' });
                const url = URL.createObjectURL(blob);
                try {
                    const link = document.createElement('a');
                    link.download = `ravlyk-анімація-${Date.now()}.gif`;
                    link.href = url;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } finally {
                    URL.revokeObjectURL(url);
                }
                showSuccessMessage('GIF збережено!');
            },
            onSessionError() {
                showError(errorMessages.GIF_CREATE_ERROR, 0);
                return true;
            },
            cleanup() {
                cleanupGif();
            },
        });
        cleanupGif();
        return result;
    }

    function cancelGif() {
        if (!gifExportActive) return false;
        activeGifEncoding?.cancel();
        executionController.cancelActiveSession('cancelled');
        return true;
    }

    return {
        openCodeFromFile,
        saveDrawing,
        saveCodeToFile,
        saveGif,
        cancelGif,
        isGifActive: () => gifExportActive && activeGifCapture !== null,
        shareCodeAsLink,
        loadCodeFromUrlHash,
    };
}
