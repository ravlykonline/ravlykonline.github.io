import { encodeGif } from './gifEncoder.js';

self.addEventListener('message', (event) => {
    try {
        const { frames, width, height } = event.data || {};
        const bytes = encodeGif(frames || [], width, height);
        self.postMessage({ type: 'result', bytes }, [bytes.buffer]);
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: typeof error?.message === 'string' ? error.message : 'GIF_ENCODING_FAILED',
        });
    }
});
