// Frame capture controller for GIF export.
// Captures composited canvas frames at a fixed interval,
// independent of the animation's requestAnimationFrame rate.

const MAX_GIF_WIDTH  = 480;
const CAPTURE_MS     = 100;  // capture one frame every 100 ms of animation time
const MAX_FRAMES     = 200;  // cap at ~20 seconds

export function createGifCapture({ canvas, backgroundCanvas, getCanvasBackgroundColor }) {
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

    function captureFrame(deltaMs) {
        if (!active || frames.length >= MAX_FRAMES) return;
        elapsed += deltaMs;
        if (elapsed - lastCapture < CAPTURE_MS) return;
        lastCapture = elapsed;

        const { w, h } = gifDimensions();
        const tmp = document.createElement('canvas');
        tmp.width = w;
        tmp.height = h;
        const ctx = tmp.getContext('2d');

        const bg = getCanvasBackgroundColor?.() || 'white';
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        if (backgroundCanvas) ctx.drawImage(backgroundCanvas, 0, 0, w, h);
        ctx.drawImage(canvas, 0, 0, w, h);

        frames.push({
            pixels: ctx.getImageData(0, 0, w, h).data,
            delay: 5, // 5 centiseconds = 50 ms → playback at 2× real speed
        });
    }

    function start()  { frames.length = 0; elapsed = 0; lastCapture = -Infinity; active = true; }
    function stop()   { active = false; }
    function hasFrames() { return frames.length > 0; }
    function getFrames() { return frames; }
    function getDimensions() { return gifDimensions(); }

    return { captureFrame, start, stop, hasFrames, getFrames, getDimensions };
}
