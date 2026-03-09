export function applyBackgroundLayer({
    canvas,
    backgroundCanvas,
    backgroundCtx,
    backgroundColor,
}) {
    const styleCanvas = backgroundCanvas || canvas;
    if (styleCanvas && styleCanvas.style && backgroundColor) {
        styleCanvas.style.backgroundColor = backgroundColor;
    }
    if (backgroundCanvas && canvas && canvas.style) {
        canvas.style.backgroundColor = 'transparent';
    }
    if (!backgroundCanvas || !backgroundCtx || !backgroundColor) {
        return;
    }

    if (backgroundCanvas.width !== canvas.width) backgroundCanvas.width = canvas.width;
    if (backgroundCanvas.height !== canvas.height) backgroundCanvas.height = canvas.height;

    const previousFillStyle = backgroundCtx.fillStyle;
    if (typeof backgroundCtx.clearRect === 'function') {
        backgroundCtx.clearRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    }
    backgroundCtx.fillStyle = backgroundColor;
    backgroundCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
    backgroundCtx.fillStyle = previousFillStyle;
}

export function composeCanvasLayersForExport({
    tempCtx,
    tempCanvas,
    canvas,
    backgroundCanvas,
    canvasBackgroundColor,
}) {
    tempCtx.fillStyle = canvasBackgroundColor;
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    if (backgroundCanvas) {
        tempCtx.drawImage(backgroundCanvas, 0, 0);
    }
    tempCtx.drawImage(canvas, 0, 0);
}
