// GIF89a multi-frame encoder
// Color quantization: exact palette (≤256 unique colors) or NeuQuant fallback.
// NeuQuant: Anthony Dekker (1994), public domain.
// LZW: standard GIF compression.

// ─── Palette building ──────────────────────────────────────────────────────

function collectColors(frames) {
    // Returns Map<packed_rgb, index> when ≤256 unique colors, else null.
    const map = new Map();
    for (const { pixels } of frames) {
        for (let i = 0; i < pixels.length; i += 4) {
            const key = (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
            if (!map.has(key)) {
                if (map.size >= 256) return null;
                map.set(key, map.size);
            }
        }
    }
    return map;
}

function exactPalette(colorMap) {
    const p = new Uint8Array(256 * 3);
    for (const [key, idx] of colorMap) {
        p[idx * 3]     = (key >> 16) & 0xff;
        p[idx * 3 + 1] = (key >> 8)  & 0xff;
        p[idx * 3 + 2] =  key        & 0xff;
    }
    return p;
}

// ─── NeuQuant (fallback when > 256 unique colors) ─────────────────────────

function neuQuant(rgba, sampleFac) {
    const N = 256, NSHIFT = 4, NCYC = 100;
    const INTS = 65536, GS = 10, BS = 10;
    const BETA = INTS >> BS, BGAMMA = INTS << (GS - BS);
    const RBS = 6, RB = 1 << RBS;
    const INITRAD = N >> 3, INITR = INITRAD * RB, RDEC = 30;
    const IA = 1 << 10, RADBS = 8, RADB = 1 << RADBS;

    const net = new Int32Array(N * 3);
    const bias = new Int32Array(N);
    const freq = new Int32Array(N);
    const radp = new Int32Array(INITRAD + 1);

    for (let i = 0; i < N; i++) {
        const v = (i << (NSHIFT + 8)) / N | 0;
        net[i * 3] = net[i * 3 + 1] = net[i * 3 + 2] = v;
        freq[i] = (INTS / N) | 0;
    }

    function mkRadp(r) {
        for (let i = 0; i < r; i++)
            radp[i + 1] = (alpha * ((r * r - i * i) * RADB / (r * r))) | 0;
    }

    const nPix = rgba.length >> 2;
    const adec = 30 + ((sampleFac - 1) / 3 | 0);
    const samp = Math.max(1, (nPix / sampleFac) | 0);
    let delta = Math.max(1, (samp / NCYC) | 0);
    let alpha = IA, radius = INITR;
    let rad = radius >> RBS;
    if (rad > 1) mkRadp(rad);

    const step = nPix % 499 !== 0 ? 499 * 4 :
                 nPix % 491 !== 0 ? 491 * 4 :
                 nPix % 487 !== 0 ? 487 * 4 : 503 * 4;

    let pix = 0;
    for (let i = 0; i < samp; i++) {
        const r = (rgba[pix]     & 0xff) << NSHIFT;
        const g = (rgba[pix + 1] & 0xff) << NSHIFT;
        const b = (rgba[pix + 2] & 0xff) << NSHIFT;

        // Find best biased neuron
        let bestd = 0x7fffffff, bestbd = 0x7fffffff, bestp = 0, bestbp = 0;
        for (let j = 0; j < N; j++) {
            const nr = net[j*3], ng = net[j*3+1], nb = net[j*3+2];
            const d = Math.abs(nr - r) + Math.abs(ng - g) + Math.abs(nb - b);
            if (d < bestd) { bestd = d; bestp = j; }
            const bd = d - (bias[j] >> (16 - NSHIFT));
            if (bd < bestbd) { bestbd = bd; bestbp = j; }
            const bf = freq[j] >> BS;
            freq[j] -= bf;
            bias[j] += bf << GS;
        }
        freq[bestp] += BETA;
        bias[bestp] -= BGAMMA;

        // Move best neuron toward pixel
        net[bestbp*3]   -= (alpha * (net[bestbp*3]   - r) / IA) | 0;
        net[bestbp*3+1] -= (alpha * (net[bestbp*3+1] - g) / IA) | 0;
        net[bestbp*3+2] -= (alpha * (net[bestbp*3+2] - b) / IA) | 0;

        // Move neighbors
        if (rad > 0) {
            const lo = Math.max(bestbp - rad, -1);
            const hi = Math.min(bestbp + rad, N);
            let jj = bestbp + 1, jk = bestbp - 1, m = 1;
            while (jj < hi || jk > lo) {
                const a = radp[m++];
                if (jj < hi) {
                    net[jj*3]   -= (a * (net[jj*3]   - r) / RADB) | 0;
                    net[jj*3+1] -= (a * (net[jj*3+1] - g) / RADB) | 0;
                    net[jj*3+2] -= (a * (net[jj*3+2] - b) / RADB) | 0;
                    jj++;
                }
                if (jk > lo) {
                    net[jk*3]   -= (a * (net[jk*3]   - r) / RADB) | 0;
                    net[jk*3+1] -= (a * (net[jk*3+1] - g) / RADB) | 0;
                    net[jk*3+2] -= (a * (net[jk*3+2] - b) / RADB) | 0;
                    jk--;
                }
            }
        }

        pix += step;
        if (pix >= rgba.length) pix -= rgba.length;

        if ((i + 1) % delta === 0) {
            alpha -= (alpha / adec) | 0;
            radius -= (radius / RDEC) | 0;
            rad = radius >> RBS;
            if (rad <= 1) rad = 0;
            if (rad > 1) mkRadp(rad);
        }
    }

    // Unbias network → palette
    const palette = new Uint8Array(N * 3);
    for (let i = 0; i < N; i++) {
        palette[i * 3]     = Math.min(255, Math.max(0, net[i*3]     >> NSHIFT));
        palette[i * 3 + 1] = Math.min(255, Math.max(0, net[i*3 + 1] >> NSHIFT));
        palette[i * 3 + 2] = Math.min(255, Math.max(0, net[i*3 + 2] >> NSHIFT));
    }

    // Lookup: nearest color via prebuilt lookup cache
    const cache = new Map();
    function lookup(r, g, b) {
        const key = (r << 16) | (g << 8) | b;
        if (cache.has(key)) return cache.get(key);
        let best = 0, bestd = Infinity;
        for (let i = 0; i < N; i++) {
            const dr = palette[i*3] - r, dg = palette[i*3+1] - g, db = palette[i*3+2] - b;
            const d = dr*dr + dg*dg + db*db;
            if (d < bestd) { bestd = d; best = i; }
        }
        cache.set(key, best);
        return best;
    }

    return { palette, lookup };
}

// ─── Pixel quantization ────────────────────────────────────────────────────

function quantizeFrame(pixels, colorMap, palette) {
    const indices = new Uint8Array(pixels.length >> 2);
    if (colorMap) {
        // Exact match (common case)
        for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
            const key = (pixels[i] << 16) | (pixels[i+1] << 8) | pixels[i+2];
            indices[p] = colorMap.get(key) ?? 0;
        }
    } else {
        // NeuQuant path — palette and lookup provided via closure
        for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
            indices[p] = palette.lookup(pixels[i], pixels[i+1], pixels[i+2]);
        }
    }
    return indices;
}

// ─── LZW encoder ──────────────────────────────────────────────────────────

function lzwEncode(indices, minCode) {
    const clear = 1 << minCode;
    const eoi   = clear + 1;
    const out   = [];
    let buf = 0, bufLen = 0, codeSize = minCode + 1, next = eoi + 1;
    const table = new Map();

    function emit(code) {
        buf |= code << bufLen;
        bufLen += codeSize;
        while (bufLen >= 8) { out.push(buf & 0xff); buf >>>= 8; bufLen -= 8; }
    }

    function reset() { table.clear(); codeSize = minCode + 1; next = eoi + 1; }

    emit(clear);
    let prefix = indices[0];

    for (let i = 1; i < indices.length; i++) {
        const px = indices[i];
        const key = prefix * 256 + px;
        if (table.has(key)) {
            prefix = table.get(key);
        } else {
            emit(prefix);
            if (next < 4096) {
                table.set(key, next++);
                if (next > (1 << codeSize) && codeSize < 12) codeSize++;
            } else {
                emit(clear);
                reset();
            }
            prefix = px;
        }
    }
    emit(prefix);
    emit(eoi);
    if (bufLen > 0) out.push(buf & 0xff);
    return out;
}

// ─── GIF binary builder ───────────────────────────────────────────────────

function u16le(n) { return [n & 0xff, (n >> 8) & 0xff]; }

function writeSubBlocks(bytes) {
    const out = [];
    for (let i = 0; i < bytes.length; i += 255) {
        const chunk = bytes.slice(i, i + 255);
        out.push(chunk.length, ...chunk);
    }
    out.push(0); // block terminator
    return out;
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Encodes an animated GIF.
 * @param {Array<{pixels: Uint8ClampedArray, delay: number}>} frames
 *   pixels: RGBA data; delay: frame delay in centiseconds (1/100 s)
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array} complete GIF89a file bytes
 */
export function encodeGif(frames, width, height) {
    if (!frames.length) throw new Error('No frames to encode');

    // Build global palette
    const colorMap = collectColors(frames);
    let palette, lookupFn;

    if (colorMap) {
        palette = exactPalette(colorMap);
        lookupFn = null; // use colorMap directly
    } else {
        // Sample from all frames combined for NeuQuant
        const totalPx = frames.reduce((s, f) => s + f.pixels.length, 0);
        const combined = new Uint8ClampedArray(totalPx);
        let off = 0;
        for (const { pixels } of frames) { combined.set(pixels, off); off += pixels.length; }
        const nq = neuQuant(combined, 3);
        palette = nq.palette;
        lookupFn = { lookup: nq.lookup };
    }

    const minCode = 8; // always 8 for 256-color GIF
    const gif = [];

    // Header
    gif.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // "GIF89a"

    // Logical Screen Descriptor
    gif.push(...u16le(width), ...u16le(height));
    gif.push(0xF7, 0, 0); // global color table (256 colors), bg=0, aspect=0

    // Global Color Table (256 × RGB)
    for (let i = 0; i < 256 * 3; i++) gif.push(palette[i]);

    // Netscape loop extension (infinite loop)
    gif.push(
        0x21, 0xFF, 0x0B,
        0x4E, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2E, 0x30, // "NETSCAPE2.0"
        0x03, 0x01, 0x00, 0x00, // loop count = 0 (infinite)
        0x00  // block terminator
    );

    // Frames
    for (const { pixels, delay } of frames) {
        const indices = quantizeFrame(pixels, colorMap, lookupFn);
        const lzwBytes = lzwEncode(indices, minCode);

        // Graphic Control Extension
        gif.push(0x21, 0xF9, 0x04);
        gif.push(0x00);                  // no disposal, no user input, no transparency
        gif.push(...u16le(delay));        // delay in centiseconds
        gif.push(0x00, 0x00);            // transparent color index, block terminator

        // Image Descriptor
        gif.push(0x2C);
        gif.push(...u16le(0), ...u16le(0)); // left=0, top=0
        gif.push(...u16le(width), ...u16le(height));
        gif.push(0x00); // no local color table, not interlaced

        // Image Data
        gif.push(minCode);
        gif.push(...writeSubBlocks(lzwBytes));
    }

    // Trailer
    gif.push(0x3B);

    return new Uint8Array(gif);
}
