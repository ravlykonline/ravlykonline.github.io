// js/modules/ui.js
import {
    RAVLYK_SVG_DATA_URL,
    CURRENT_YEAR,
} from './constants.js';

const RAVLYK_EDITOR_SVG_DATA_URL = 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="40" y="15" width="20" height="70" rx="10" fill="%23758F6C"/><path d="M43 18 L33 6 M57 18 L67 6" stroke="%23758F6C" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="55" r="26" fill="%23DE9C53"/><path d="M50 55 A 5 5 0 0 1 55 60 A 10 10 0 0 1 45 65 A 15 15 0 0 1 35 50 A 20 20 0 0 1 55 35 A 25 25 0 0 1 75 60" fill="none" stroke="%23201E1F" stroke-width="3" stroke-linecap="round"/></svg>';

export {
    showError,
    showSuccessMessage,
    showInfoMessage,
    hideMessage,
} from './uiMessages.js';

export {
    isModalOpen,
    bindModalOverlayClose,
    showHelpModal,
    hideHelpModal,
    showClearConfirmModal,
    hideClearConfirmModal,
    showStopConfirmModal,
    hideStopConfirmModal,
    showDownloadModal,
    hideDownloadModal,
} from './uiModals.js';

let ravlykSpriteElement = null;
let commandIndicatorElement = null;

export function createRavlykSprite(canvasContainer) {
    if (ravlykSpriteElement) ravlykSpriteElement.remove();

    ravlykSpriteElement = document.createElement('div');
    ravlykSpriteElement.id = 'ravlyk-sprite';
    ravlykSpriteElement.className = 'ravlyk-sprite-global';
    ravlykSpriteElement.setAttribute('aria-hidden', 'true');
    // Temporary preview variant from ravlyk_1.svg. Roll back by switching to RAVLYK_SVG_DATA_URL.
    ravlykSpriteElement.style.backgroundImage = `url('${RAVLYK_EDITOR_SVG_DATA_URL || RAVLYK_SVG_DATA_URL}')`;

    const container = canvasContainer || document.querySelector('.canvas-box');
    if (container) {
        container.appendChild(ravlykSpriteElement);
    } else {
        document.body.appendChild(ravlykSpriteElement);
    }
    return ravlykSpriteElement;
}

export function updateRavlykVisualsOnScreen(ravlykState, canvasElement) {
    if (!ravlykSpriteElement || !ravlykState || !canvasElement) return;

    const ravlykSize = 30;
    const angleRad = (ravlykState.angle - 90) * Math.PI / 180;
    const headingRad = ravlykState.angle * Math.PI / 180;
    const offsetX = 0;
    const offsetY = -ravlykSize * 0.5;
    const dx = offsetX * Math.cos(angleRad) - offsetY * Math.sin(angleRad);
    const dy = offsetX * Math.sin(angleRad) + offsetY * Math.cos(angleRad);
    const canvasRect = canvasElement.getBoundingClientRect();
    const containerRect = ravlykSpriteElement.parentElement.getBoundingClientRect();
    const offsetDomX = canvasRect.left - containerRect.left;
    const offsetDomY = canvasRect.top - containerRect.top;
    const penVisualLead = Math.max(0, ((Number(ravlykState.penSize) || 1) - 1) / 2);

    const newLeft = ravlykState.x + dx - ravlykSize / 2 + offsetDomX + (Math.cos(headingRad) * penVisualLead);
    const newTop = ravlykState.y + dy - ravlykSize / 2 + offsetDomY + (Math.sin(headingRad) * penVisualLead);

    ravlykSpriteElement.style.left = `${newLeft}px`;
    ravlykSpriteElement.style.top = `${newTop}px`;
    ravlykSpriteElement.style.transform = `rotate(${ravlykState.angle + 90}deg) scale(${ravlykState.scale})`;
    ravlykSpriteElement.classList.toggle('lifted', !ravlykState.isPenDown);
}

export function updateCommandIndicator(commandText, index) {
    if (!commandIndicatorElement) {
        commandIndicatorElement = document.createElement('div');
        commandIndicatorElement.id = 'ravlyk-command-indicator';
        commandIndicatorElement.style.position = 'absolute';
        commandIndicatorElement.style.bottom = '5px';
        commandIndicatorElement.style.left = '5px';
        commandIndicatorElement.style.backgroundColor = 'rgba(74, 111, 165, 0.8)';
        commandIndicatorElement.style.color = 'white';
        commandIndicatorElement.style.padding = '3px 8px';
        commandIndicatorElement.style.borderRadius = '4px';
        commandIndicatorElement.style.fontSize = '0.8em';
        commandIndicatorElement.style.zIndex = '1050';
        commandIndicatorElement.style.fontFamily = "'Fira Mono', monospace";
        commandIndicatorElement.style.transition = 'opacity 0.3s';
        commandIndicatorElement.style.opacity = '0';

        const canvasBox = document.querySelector('.canvas-box');
        if (canvasBox) canvasBox.appendChild(commandIndicatorElement);
    }

    if (commandText && index >= 0) {
        commandIndicatorElement.textContent = `[${index + 1}] ${commandText}`;
        commandIndicatorElement.style.opacity = '1';
    } else {
        commandIndicatorElement.style.opacity = '0';
    }
}

export function resizeCanvas(canvas, ctx, onResizeCallback, options = {}) {
    if (!canvas || !canvas.parentElement) return;
    if (typeof canvas.getClientRects === 'function' && canvas.getClientRects().length === 0) {
        return;
    }

    const linkedCanvases = Array.isArray(options.linkedCanvases) ? options.linkedCanvases : [];

    const canvasBox = canvas.closest('.canvas-box') || canvas.parentElement;
    const oldWidth = canvas.width;
    const oldHeight = canvas.height;
    let prevCanvas = null;

    if (oldWidth > 0 && oldHeight > 0) {
        try {
            prevCanvas = document.createElement('canvas');
            prevCanvas.width = oldWidth;
            prevCanvas.height = oldHeight;
            const prevCtx = prevCanvas.getContext('2d');
            if (prevCtx) {
                prevCtx.drawImage(canvas, 0, 0);
            } else {
                prevCanvas = null;
            }
        } catch (error) {
            console.warn('Could not save canvas state before resize:', error);
            prevCanvas = null;
        }
    }

    const renderedWidth = Math.round(canvas.clientWidth || canvasBox.clientWidth || 0);
    let renderedHeight = Math.round(canvas.clientHeight || 0);

    if (renderedHeight <= 0) {
        const boxHeight = Math.round(canvasBox.clientHeight || 0);
        const header = canvasBox.querySelector('.area-header');
        const headerHeight = header ? Math.round(header.getBoundingClientRect().height) : 0;
        renderedHeight = Math.max(1, boxHeight - headerHeight);
    }

    canvas.width = Math.max(1, renderedWidth);
    canvas.height = Math.max(1, renderedHeight);
    for (const linkedCanvas of linkedCanvases) {
        if (!linkedCanvas) continue;
        linkedCanvas.width = canvas.width;
        linkedCanvas.height = canvas.height;
    }

    const deltaX = (canvas.width - oldWidth) / 2;
    const deltaY = (canvas.height - oldHeight) / 2;

    if (prevCanvas) {
        try {
            ctx.drawImage(prevCanvas, deltaX, deltaY);
        } catch (error) {
            console.warn('Could not restore canvas state after resize:', error);
        }
    }

    if (onResizeCallback && typeof onResizeCallback === 'function') {
        onResizeCallback({
            deltaX,
            deltaY,
            oldWidth,
            oldHeight,
            newWidth: canvas.width,
            newHeight: canvas.height,
        });
    }
}

export function setFooterYear() {
    const yearElements = document.querySelectorAll('.current-year');
    yearElements.forEach((element) => {
        element.textContent = CURRENT_YEAR;
    });
}
