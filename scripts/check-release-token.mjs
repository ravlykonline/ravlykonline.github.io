// Guards the release contract that a stale-cache incident exposed: every change
// to a published, cache-versioned asset must ship with a new release token.
//
// The Service Worker keys both its versioned asset URLs and its cache names on
// release-version.json. When published assets change but the token does not,
// sw.js stays byte-identical, the browser never detects an update, the old
// cache survives, and cache-first static handling keeps serving stale JS to
// returning visitors while network-first navigation hands them fresh HTML.
//
// Usage: node scripts/check-release-token.mjs [--base <ref>]

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const TOKEN_FILE = 'release-version.json';

// Only assets the release token actually governs: the root site files that are
// requested with ?v=<token> or precached by sw.js. Published subprojects
// (go/, artist/, game/, old/) are not versioned by the token.
export function isTokenGovernedAsset(filePath) {
    if (filePath === 'sw.js') return true;
    if (/^[^/]+\.html$/.test(filePath)) return true;
    if (filePath.startsWith('js/') && filePath.endsWith('.js')) return true;
    if (filePath.startsWith('css/') && filePath.endsWith('.css')) return true;
    return false;
}

export function evaluateReleaseTokenContract(changedFiles) {
    const governed = changedFiles.filter(isTokenGovernedAsset);
    const tokenChanged = changedFiles.includes(TOKEN_FILE);
    return {
        governed,
        tokenChanged,
        ok: governed.length === 0 || tokenChanged,
    };
}

function resolveBaseRef(argv) {
    const flagIndex = argv.indexOf('--base');
    if (flagIndex !== -1 && argv[flagIndex + 1]) return argv[flagIndex + 1];
    if (process.env.RELEASE_TOKEN_BASE_REF) return process.env.RELEASE_TOKEN_BASE_REF;
    return 'origin/main';
}

function listChangedFiles(baseRef) {
    const output = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], { encoding: 'utf8' });
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function main() {
    const baseRef = resolveBaseRef(process.argv.slice(2));

    let changedFiles;
    try {
        changedFiles = listChangedFiles(baseRef);
    } catch {
        // A shallow clone cannot answer the question. Fail loudly rather than
        // pass silently: a silent pass is exactly how the incident shipped.
        console.error(`Release token check could not diff against "${baseRef}".`);
        console.error('Fetch the base ref (actions/checkout with fetch-depth: 0) and retry.');
        process.exitCode = 1;
        return;
    }

    const { governed, tokenChanged, ok } = evaluateReleaseTokenContract(changedFiles);

    if (governed.length === 0) {
        console.log(`Release token check: no cache-versioned assets changed against ${baseRef}.`);
        return;
    }

    if (ok) {
        console.log(`Release token check: ${governed.length} versioned asset(s) changed and ${TOKEN_FILE} was updated.`);
        return;
    }

    console.error(`Release token check FAILED against ${baseRef}.`);
    console.error('');
    console.error(`These published assets changed without a new release token (${tokenChanged ? '' : `${TOKEN_FILE} untouched`}):`);
    for (const file of governed.slice(0, 20)) console.error(`  - ${file}`);
    if (governed.length > 20) console.error(`  ... and ${governed.length - 20} more`);
    console.error('');
    console.error('Returning visitors would keep the previously cached JS/CSS while receiving');
    console.error('fresh HTML, because sw.js and its cache names would stay unchanged.');
    console.error('');
    console.error('Fix: npm run release:sync-version -- YYYY-MM-DD-N');
    process.exitCode = 1;
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryPoint && import.meta.url === entryPoint) {
    main();
}
