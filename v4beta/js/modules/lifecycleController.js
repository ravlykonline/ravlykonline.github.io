export function createLifecycleController({
    canvas,
    ctx,
    canvasContainer,
    interpreter,
    gridOverlay,
    executionController,
    editorUi,
    resizeCanvas,
    setFooterYear,
}) {
    const handleCanvasResize = () => {
        resizeCanvas(canvas, ctx, (resizeMeta) => {
            interpreter.applyContextSettings();
            interpreter.handleCanvasResize(resizeMeta);
        });
        gridOverlay.drawGridOverlay();
    };

    let resizeTimeout;
    const scheduleResize = () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(handleCanvasResize, 100);
    };

    function initialize() {
        if (typeof ResizeObserver === 'function' && canvasContainer) {
            const resizeObserver = new ResizeObserver(() => scheduleResize());
            resizeObserver.observe(canvasContainer);
        } else {
            window.addEventListener('resize', scheduleResize);
        }

        gridOverlay.initialize();
        handleCanvasResize();
        interpreter.reset();
        executionController.updateExecutionControls(false);
        editorUi.updateEditorDecorations();
        setFooterYear();
    }

    return {
        initialize,
        scheduleResize,
    };
}
