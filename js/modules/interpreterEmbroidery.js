// Embroidery (вишиванка) rendering helpers.
//
// drawEmbroideryStroke — малює хрестики вздовж відрізка (x1,y1)→(x2,y2).
// drawLinenBackground  — малює текстуру льону на backgroundCanvas.

const LINEN_BASE   = '#f6edcf';
const LINEN_WARP   = '#e8ddbd';   // горизонтальні нитки
const LINEN_WEFT   = '#efe5c6';   // вертикальні нитки
const THREAD_STEP  = 5;           // пікселів між нитками

/**
 * Малює хрестики (×) вздовж відрізка (x1,y1)→(x2,y2).
 * Розмір і відстань між хрестиками залежать від penSize.
 */
export function drawEmbroideryStroke(ctx, x1, y1, x2, y2, penSize) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const half    = Math.max(3, penSize * 1.5);
    const baseSpacing = Math.max(half * 4, penSize * 8);
    const diagonalRatio = Math.min(Math.abs(dx), Math.abs(dy)) / Math.max(Math.abs(dx), Math.abs(dy));
    const spacing = baseSpacing * (1 + diagonalRatio * 0.6);
    const steps   = Math.max(1, Math.floor(dist / spacing));

    const savedWidth = ctx.lineWidth;
    ctx.lineWidth = Math.max(1, penSize * 0.6);

    for (let i = 0; i <= steps; i++) {
        const t  = i / steps;
        const px = x1 + dx * t;
        const py = y1 + dy * t;

        // перша діагональ ╲
        ctx.beginPath();
        ctx.moveTo(px - half, py - half);
        ctx.lineTo(px + half, py + half);
        ctx.stroke();

        // друга діагональ ╱
        ctx.beginPath();
        ctx.moveTo(px + half, py - half);
        ctx.lineTo(px - half, py + half);
        ctx.stroke();
    }

    ctx.lineWidth = savedWidth;
}

/**
 * Малює текстуру льону на фоновому canvas.
 * Викликається один раз при вмиканні режиму вишиванки.
 */
export function drawLinenBackground(backgroundCtx, width, height) {
    // Базовий колір полотна
    backgroundCtx.fillStyle = LINEN_BASE;
    backgroundCtx.fillRect(0, 0, width, height);

    backgroundCtx.lineWidth = 1;

    // Горизонтальні нитки (основа)
    for (let y = 0; y < height; y += THREAD_STEP) {
        backgroundCtx.strokeStyle = (Math.floor(y / THREAD_STEP) % 2 === 0)
            ? LINEN_WARP
            : LINEN_BASE;
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(0, y + 0.5);
        backgroundCtx.lineTo(width, y + 0.5);
        backgroundCtx.stroke();
    }

    // Вертикальні нитки (уток) — трохи прозоріші
    backgroundCtx.globalAlpha = 0.32;
    for (let x = 0; x < width; x += THREAD_STEP) {
        backgroundCtx.strokeStyle = (Math.floor(x / THREAD_STEP) % 2 === 0)
            ? LINEN_WEFT
            : LINEN_BASE;
        backgroundCtx.beginPath();
        backgroundCtx.moveTo(x + 0.5, 0);
        backgroundCtx.lineTo(x + 0.5, height);
        backgroundCtx.stroke();
    }

    backgroundCtx.globalAlpha = 1;
}
