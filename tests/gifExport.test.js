import assert from 'node:assert/strict';
import {
    createGifCapture,
    MAX_GIF_FRAMES,
    MAX_GIF_RAW_BYTES,
} from '../js/modules/gifCapture.js';
import { encodeGif } from '../js/modules/gifEncoder.js';
import { createGifEncodingController } from '../js/modules/gifEncodingController.js';
import { runAsyncTest, runTest } from './testUtils.js';

function installFakeCanvasDocument() {
    const previousDocument = global.document;
    global.document = {
        createElement(tag) {
            assert.equal(tag, 'canvas');
            return {
                width: 0,
                height: 0,
                getContext() {
                    return {
                        fillStyle: '',
                        fillRect() {},
                        drawImage() {},
                        getImageData(_x, _y, width, height) {
                            return { data: new Uint8ClampedArray(width * height * 4) };
                        },
                    };
                },
            };
        },
    };
    return () => { global.document = previousDocument; };
}

runTest('gif export scales a tall canvas by its longest side and fixes dimensions at start', () => {
    const restore = installFakeCanvasDocument();
    const canvas = { width: 80, height: 640 };
    const capture = createGifCapture({ canvas });
    capture.start();
    assert.deepEqual(capture.getDimensions(), { w: 40, h: 320 });
    capture.captureFrame(101);
    canvas.width = 1000;
    canvas.height = 100;
    capture.captureFrame(101);
    capture.stop();
    assert.deepEqual(capture.getDimensions(), { w: 40, h: 320 });
    assert.ok(capture.getFrames().every((frame) => frame.pixels.length === 40 * 320 * 4));
    restore();
});

runTest('gif export reports the frame limit once and stop is idempotent', () => {
    const restore = installFakeCanvasDocument();
    const limits = [];
    const capture = createGifCapture({
        canvas: { width: 1, height: 1 },
        onLimit: (reason) => limits.push(reason),
    });
    capture.start();
    for (let index = 0; index < MAX_GIF_FRAMES + 5; index++) capture.captureFrame(101);
    capture.stop();
    const delays = capture.getFrames().map((frame) => frame.delay);
    capture.stop();
    assert.equal(capture.getFrames().length, MAX_GIF_FRAMES);
    assert.deepEqual(limits, ['frames']);
    assert.deepEqual(capture.getFrames().map((frame) => frame.delay), delays);
    restore();
});

runTest('gif export keeps retained RGBA buffers within the 24 MiB raw-pixel budget', () => {
    const restore = installFakeCanvasDocument();
    const limits = [];
    const capture = createGifCapture({
        canvas: { width: 320, height: 320 },
        onLimit: (reason) => limits.push(reason),
    });
    capture.start();
    for (let index = 0; index < MAX_GIF_FRAMES; index++) capture.captureFrame(101);
    capture.stop();
    assert.ok(capture.getRawBytes() <= MAX_GIF_RAW_BYTES);
    assert.deepEqual(limits, ['pixels']);
    assert.equal(capture.getFrames().length, Math.floor(MAX_GIF_RAW_BYTES / (320 * 320 * 4)));
    capture.releaseFrames();
    assert.equal(capture.getRawBytes(), 0);
    assert.equal(capture.getFrames().length, 0);
    restore();
});

class SuccessfulWorker {
    static instances = [];

    constructor(_url, options) {
        this.options = options;
        this.listeners = new Map();
        this.terminated = false;
        SuccessfulWorker.instances.push(this);
    }

    addEventListener(type, callback) { this.listeners.set(type, callback); }

    postMessage(data, transferables) {
        this.transferables = transferables;
        queueMicrotask(() => {
            const bytes = encodeGif(data.frames, data.width, data.height);
            this.listeners.get('message')({ data: { type: 'result', bytes } });
        });
    }

    terminate() { this.terminated = true; }
}

await runAsyncTest('gif worker encoding returns GIF89a bytes and transfers frame buffers', async () => {
    SuccessfulWorker.instances.length = 0;
    const pixels = new Uint8ClampedArray([255, 255, 255, 255]);
    const controller = createGifEncodingController({ WorkerCtor: SuccessfulWorker });
    const bytes = await controller.encode({ frames: [{ pixels, delay: 10 }], width: 1, height: 1 });
    assert.equal(new TextDecoder().decode(bytes.slice(0, 6)), 'GIF89a');
    assert.deepEqual(SuccessfulWorker.instances[0].transferables, [pixels.buffer]);
    assert.equal(SuccessfulWorker.instances[0].options.type, 'module');
    assert.equal(SuccessfulWorker.instances[0].terminated, true);

    const second = await controller.encode({
        frames: [{ pixels: new Uint8ClampedArray([0, 0, 0, 255]), delay: 10 }],
        width: 1,
        height: 1,
    });
    assert.equal(new TextDecoder().decode(second.slice(0, 6)), 'GIF89a');
});

await runAsyncTest('gif worker errors and cancellation settle and terminate encoding', async () => {
    class ErrorWorker extends SuccessfulWorker {
        postMessage() {
            queueMicrotask(() => this.listeners.get('error')({}));
        }
    }
    const failing = createGifEncodingController({ WorkerCtor: ErrorWorker });
    await assert.rejects(
        failing.encode({ frames: [{ pixels: new Uint8ClampedArray(4), delay: 10 }], width: 1, height: 1 }),
        (error) => error?.messageKey === 'GIF_ENCODING_FAILED'
    );

    class PendingWorker extends SuccessfulWorker { postMessage() {} }
    const cancellable = createGifEncodingController({ WorkerCtor: PendingWorker });
    const pending = cancellable.encode({
        frames: [{ pixels: new Uint8ClampedArray(4), delay: 10 }], width: 1, height: 1,
    });
    assert.equal(cancellable.cancel(), true);
    await assert.rejects(pending, (error) => error?.messageKey === 'GIF_ENCODING_CANCELLED');
    assert.equal(cancellable.isEncoding(), false);
});

await runAsyncTest('gif export fails safely when Worker is unavailable', async () => {
    const controller = createGifEncodingController({ WorkerCtor: null });
    await assert.rejects(
        controller.encode({ frames: [], width: 1, height: 1 }),
        (error) => error?.messageKey === 'GIF_WORKER_UNAVAILABLE'
    );
});

console.log('GIF export tests completed.');
