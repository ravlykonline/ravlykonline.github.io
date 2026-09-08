const DEFAULT_ENCODING_TIMEOUT_MS = 30_000;

function createEncodingError(messageKey) {
    const error = new Error(messageKey);
    error.name = 'RavlykError';
    error.messageKey = messageKey;
    return error;
}

export function createGifEncodingController({
    WorkerCtor = globalThis.Worker,
    workerUrl = new URL('./gifEncoderWorker.js', import.meta.url),
    timeoutMs = DEFAULT_ENCODING_TIMEOUT_MS,
} = {}) {
    let active = null;

    function encode({ frames, width, height }) {
        if (active) return Promise.reject(createEncodingError('GIF_ENCODING_IN_PROGRESS'));
        if (typeof WorkerCtor !== 'function') {
            return Promise.reject(createEncodingError('GIF_WORKER_UNAVAILABLE'));
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            let worker;
            let timeoutId;

            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                if (timeoutId !== undefined) clearTimeout(timeoutId);
                worker?.terminate();
                active = null;
                callback(value);
            };

            try {
                worker = new WorkerCtor(workerUrl, { type: 'module' });
            } catch {
                finish(reject, createEncodingError('GIF_WORKER_UNAVAILABLE'));
                return;
            }

            active = {
                cancel: () => finish(reject, createEncodingError('GIF_ENCODING_CANCELLED')),
            };
            worker.addEventListener('message', (event) => {
                if (event.data?.type === 'result') {
                    const bytes = event.data.bytes instanceof Uint8Array
                        ? event.data.bytes
                        : new Uint8Array(event.data.bytes || []);
                    finish(resolve, bytes);
                    return;
                }
                finish(reject, createEncodingError('GIF_ENCODING_FAILED'));
            });
            worker.addEventListener('error', () => {
                finish(reject, createEncodingError('GIF_ENCODING_FAILED'));
            });
            worker.addEventListener('messageerror', () => {
                finish(reject, createEncodingError('GIF_ENCODING_FAILED'));
            });

            timeoutId = setTimeout(() => {
                finish(reject, createEncodingError('GIF_ENCODING_TIMEOUT'));
            }, timeoutMs);

            const transferables = [];
            const payloadFrames = frames.map(({ pixels, delay }) => {
                if (pixels?.buffer instanceof ArrayBuffer) transferables.push(pixels.buffer);
                return { pixels, delay };
            });
            worker.postMessage({ frames: payloadFrames, width, height }, transferables);
        });
    }

    return {
        encode,
        cancel() {
            if (!active) return false;
            active.cancel();
            return true;
        },
        isEncoding: () => active !== null,
    };
}

export { DEFAULT_ENCODING_TIMEOUT_MS };
