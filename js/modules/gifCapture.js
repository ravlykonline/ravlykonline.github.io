// Bounded frame capture for GIF export. The raw-pixel budget covers only the
// retained RGBA frame buffers, not the encoder/Worker heap.

export const MAX_GIF_SIDE = 320;
export const MAX_GIF_FRAMES = 120;
export const MAX_GIF_RAW_BYTES = 24 * 1024 * 1024;

const CAPTURE_MS = 100;
const FRAME_DELAY_CS = 10;
const FREEZE_START_TOTAL_CS = 2 * 80;
const FREEZE_END_TOTAL_CS = 4 * 80;

export function createGifCapture({
    canvas,
    backgroundCanvas,
    getCanvasBackgroundColor,
    onProgress,
    onLimit,
}) {
    const frames = [];
    let dimensions = { w: 1, h: 1 };
    let rawBytes = 0;
    let elapsed = 0;
    let lastCapture = -Infinity;
    let active = false;
    let stopped = true;
    let deferredSince = null;
    let finalFramePending = false;
    let limitNotified = false;

    function calculateDimensions() {
        const sourceWidth = Math.max(1, Number(canvas.width) || 1);
        const sourceHeight = Math.max(1, Number(canvas.height) || 1);
        const scale = Math.min(1, MAX_GIF_SIDE / Math.max(sourceWidth, sourceHeight));
        return {
            w: Math.max(1, Math.round(sourceWidth * scale)),
            h: Math.max(1, Math.round(sourceHeight * scale)),
        };
    }

    function compositeFrame(ctx, w, h) {
        const bg = getCanvasBackgroundColor?.() || 'white';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0, w, h);
        ctx.drawImage(canvas, 0, 0, w, h);
    }

    function notifyLimitOnce(reason) {
        if (limitNotified) return;
        limitNotified = true;
        active = false;
        onLimit?.(reason);
    }

    function canCaptureFrame() {
        const frameBytes = dimensions.w * dimensions.h * 4;
        if (frames.length >= MAX_GIF_FRAMES) {
            notifyLimitOnce('frames');
            return false;
        }
        if (rawBytes + frameBytes > MAX_GIF_RAW_BYTES) {
            notifyLimitOnce('pixels');
            return false;
        }
        return true;
    }

    function makeCanvasFrame(delay) {
        const { w, h } = dimensions;
        const tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        const ctx = tmp.getContext('2d');
        if (!ctx) throw new Error('GIF_CAPTURE_CONTEXT_UNAVAILABLE');
        compositeFrame(ctx, w, h);
        return { pixels: ctx.getImageData(0, 0, w, h).data, delay };
    }

    function appendFrame(delay = FRAME_DELAY_CS) {
        if (!canCaptureFrame()) return false;
        const frame = makeCanvasFrame(delay);
        rawBytes += frame.pixels.byteLength;
        frames.push(frame);
        onProgress?.(Math.min(90, 8 + frames.length * 4));
        return true;
    }

    function captureFrame(deltaMs, { defer = false } = {}) {
        if (!active) return;
        elapsed += deltaMs;
        finalFramePending = true;

        if (defer) {
            if (deferredSince === null) deferredSince = elapsed;
            if (elapsed - deferredSince < CAPTURE_MS) return;
        } else {
            deferredSince = null;
        }
        if (elapsed - lastCapture < CAPTURE_MS) return;
        lastCapture = elapsed;

        if (appendFrame()) {
            deferredSince = null;
            finalFramePending = false;
        }
    }

    function start() {
        frames.length = 0;
        dimensions = calculateDimensions();
        rawBytes = 0;
        elapsed = 0;
        lastCapture = -Infinity;
        deferredSince = null;
        finalFramePending = false;
        limitNotified = false;
        stopped = false;
        active = true;
    }

    function stop() {
        if (stopped) return;
        stopped = true;
        active = false;
        if (finalFramePending && !limitNotified) appendFrame();
        finalFramePending = false;
        if (frames.length === 0) return;

        frames[0].delay += FREEZE_START_TOTAL_CS;
        frames[frames.length - 1].delay += FREEZE_END_TOTAL_CS;
    }

    function releaseFrames() {
        frames.length = 0;
        rawBytes = 0;
    }

    return {
        captureFrame,
        start,
        stop,
        releaseFrames,
        hasFrames: () => frames.length > 0,
        getFrames: () => frames,
        getDimensions: () => ({ ...dimensions }),
        getRawBytes: () => rawBytes,
    };
}
