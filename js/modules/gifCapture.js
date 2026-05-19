// Frame capture controller for GIF export.
// Captures composited canvas frames at a fixed interval,
// independent of the animation's requestAnimationFrame rate.

const MAX_GIF_WIDTH   = 480;
const CAPTURE_MS      = 100;   // capture one frame every 100 ms of animation time
const MAX_FRAMES      = 200;   // cap at ~20 seconds
const FRAME_DELAY_CS  = 10;    // 10 centiseconds = 100 ms → real-time playback speed
const FREEZE_DELAY_CS = 80;    // 80 centiseconds = 0.8 s per freeze frame
const FREEZE_START    = 2;     // freeze frames prepended before animation
const FREEZE_END      = 4;     // freeze frames appended after animation (2× start)

export function createGifCapture({ canvas, backgroundCanvas, getCanvasBackgroundColor, onProgress }) {
    const frames = [];
    let elapsed = 0;
    let lastCapture = -Infinity;
    let active = false;

    // Scale dimensions so width ≤ MAX_GIF_WIDTH
    function gifDimensions() {
        const scale = Math.min(1, MAX_GIF_WIDTH / canvas.width);
        return {
            w: Math.round(canvas.width  * scale),
            h: Math.round(canvas.height * scale),
        };
    }

    function compositeFrame(ctx, w, h) {
        const bg = getCanvasBackgroundColor?.() || 'white';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0, w, h);
        ctx.drawImage(canvas, 0, 0, w, h);
    }

    function makeCanvasFrame(delay) {
        const { w, h } = gifDimensions();
        const tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        const ctx = tmp.getContext('2d');
        compositeFrame(ctx, w, h);
        return { pixels: ctx.getImageData(0, 0, w, h).data, delay };
    }

    function captureFrame(deltaMs) {
        if (!active || frames.length >= MAX_FRAMES) return;
        elapsed += deltaMs;
        if (elapsed - lastCapture < CAPTURE_MS) return;
        lastCapture = elapsed;

        frames.push(makeCanvasFrame(FRAME_DELAY_CS));
        onProgress?.(Math.min(90, 8 + frames.length * 4));
    }

    function start()  { frames.length = 0; elapsed = 0; lastCapture = -Infinity; active = true; }

    function stop() {
        active = false;
        if (frames.length === 0) return;

        // Prepend freeze frames (copy of first frame)
        const firstPixels = frames[0].pixels;
        const { w, h } = gifDimensions();
        for (let i = 0; i < FREEZE_START; i++) {
            frames.unshift({ pixels: firstPixels.slice(), delay: FREEZE_DELAY_CS });
        }

        // Append freeze frames (copy of last frame)
        const lastPixels = frames[frames.length - 1].pixels;
        for (let i = 0; i < FREEZE_END; i++) {
            frames.push({ pixels: lastPixels.slice(), delay: FREEZE_DELAY_CS });
        }
    }

    function hasFrames() { return frames.length > 0; }
    function getFrames() { return frames; }
    function getDimensions() { return gifDimensions(); }

    return { captureFrame, start, stop, hasFrames, getFrames, getDimensions };
}
