export function createGridOverlayController({
    canvas,
    canvasContainer,
    gridCanvas,
    gridCtx,
    gridBtn,
    gridAlignOffsetX,
    gridAlignOffsetY,
    storageKey = 'ravlyk_grid_visible_v1',
}) {
    let isGridVisible = false;

    function loadGridPreference() {
        try {
            return localStorage.getItem(storageKey) === '1';
        } catch (error) {
            return false;
        }
    }

    function saveGridPreference(value) {
        try {
            localStorage.setItem(storageKey, value ? '1' : '0');
        } catch (error) {
            // ignore storage errors
        }
    }

    function updateGridButtonState() {
        if (!gridBtn) return;
        gridBtn.setAttribute('aria-pressed', String(isGridVisible));
        gridBtn.classList.toggle('active', isGridVisible);
    }

    function drawGridOverlay() {
        if (!gridCanvas || !gridCtx || !canvasContainer || !canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvasContainer.getBoundingClientRect();
        const offsetX = Math.round(canvasRect.left - containerRect.left);
        const offsetY = Math.round(canvasRect.top - containerRect.top);

        gridCanvas.style.left = `${offsetX}px`;
        gridCanvas.style.top = `${offsetY}px`;
        gridCanvas.style.width = `${canvas.clientWidth}px`;
        gridCanvas.style.height = `${canvas.clientHeight}px`;

        if (gridCanvas.width !== canvas.width) gridCanvas.width = canvas.width;
        if (gridCanvas.height !== canvas.height) gridCanvas.height = canvas.height;

        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        if (!isGridVisible) {
            gridCanvas.style.display = 'none';
            return;
        }

        gridCanvas.style.display = 'block';

        const width = gridCanvas.width;
        const height = gridCanvas.height;
        // Ravlyk starts exactly in canvas center; keep shared origin math.
        const centerX = (width / 2) + gridAlignOffsetX;
        const centerY = (height / 2) + gridAlignOffsetY;
        const minorStep = 25;
        const majorStep = 100;

        const drawVerticalLine = (x, isMajor) => {
            gridCtx.beginPath();
            gridCtx.strokeStyle = isMajor ? 'rgba(74, 111, 165, 0.3)' : 'rgba(74, 111, 165, 0.15)';
            gridCtx.lineWidth = isMajor ? 1 : 0.5;
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, height);
            gridCtx.stroke();
        };

        const drawHorizontalLine = (y, isMajor) => {
            gridCtx.beginPath();
            gridCtx.strokeStyle = isMajor ? 'rgba(74, 111, 165, 0.3)' : 'rgba(74, 111, 165, 0.15)';
            gridCtx.lineWidth = isMajor ? 1 : 0.5;
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(width, y);
            gridCtx.stroke();
        };

        for (let x = centerX; x <= width; x += minorStep) {
            drawVerticalLine(x, Math.abs(x - centerX) % majorStep === 0);
        }
        for (let x = centerX - minorStep; x >= 0; x -= minorStep) {
            drawVerticalLine(x, Math.abs(x - centerX) % majorStep === 0);
        }
        for (let y = centerY; y <= height; y += minorStep) {
            drawHorizontalLine(y, Math.abs(y - centerY) % majorStep === 0);
        }
        for (let y = centerY - minorStep; y >= 0; y -= minorStep) {
            drawHorizontalLine(y, Math.abs(y - centerY) % majorStep === 0);
        }

        gridCtx.beginPath();
        gridCtx.strokeStyle = 'rgba(255, 99, 71, 0.8)';
        gridCtx.lineWidth = 1.5;
        gridCtx.moveTo(centerX, 0);
        gridCtx.lineTo(centerX, height);
        gridCtx.stroke();

        gridCtx.beginPath();
        gridCtx.strokeStyle = 'rgba(50, 205, 50, 0.8)';
        gridCtx.lineWidth = 1.5;
        gridCtx.moveTo(0, centerY);
        gridCtx.lineTo(width, centerY);
        gridCtx.stroke();

        gridCtx.fillStyle = 'rgba(51, 51, 51, 0.85)';
        gridCtx.font = '12px Nunito, sans-serif';
        gridCtx.textBaseline = 'middle';

        for (let x = centerX + majorStep; x <= width; x += majorStep) {
            gridCtx.fillText(String(Math.round(x - centerX)), x + 4, Math.min(height - 10, centerY + 14));
        }
        for (let x = centerX - majorStep; x >= 0; x -= majorStep) {
            gridCtx.fillText(String(Math.round(x - centerX)), x + 4, Math.min(height - 10, centerY + 14));
        }
        for (let y = centerY + majorStep; y <= height; y += majorStep) {
            gridCtx.fillText(String(Math.round(centerY - y)), Math.min(width - 36, centerX + 6), y - 2);
        }
        for (let y = centerY - majorStep; y >= 0; y -= majorStep) {
            gridCtx.fillText(String(Math.round(centerY - y)), Math.min(width - 36, centerX + 6), y - 2);
        }

        gridCtx.fillStyle = 'rgba(51, 51, 51, 0.95)';
        gridCtx.fillText('0, 0', Math.min(width - 36, centerX + 6), Math.max(12, centerY - 10));
    }

    function setGridVisibility(visible) {
        isGridVisible = !!visible;
        updateGridButtonState();
        saveGridPreference(isGridVisible);
        drawGridOverlay();
    }

    function initialize() {
        isGridVisible = loadGridPreference();
        updateGridButtonState();
    }

    function toggle() {
        setGridVisibility(!isGridVisible);
    }

    function getGridVisibility() {
        return isGridVisible;
    }

    return {
        initialize,
        toggle,
        drawGridOverlay,
        setGridVisibility,
        updateGridButtonState,
        getGridVisibility,
    };
}
