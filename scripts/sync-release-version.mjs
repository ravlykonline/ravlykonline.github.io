import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const publicHtmlFiles = [
    'index.html',
    'manual.html',
    'lessons.html',
    'quiz.html',
    'resources.html',
    'teacher_guidelines.html',
    'advice_for_parents.html',
    'zen.html',
    'about.html',
];

const targetFiles = [
    'sw.js',
    'js/registerServiceWorker.js',
    ...publicHtmlFiles,
];

function exitWithUsage(message) {
    if (message) {
        console.error(message);
        console.error('');
    }
    console.error('Usage: npm run release:sync-version -- <YYYY-MM-DD-N>');
    process.exit(1);
}

function replaceOrThrow(source, pattern, replacement, description, relativePath) {
    if (!pattern.test(source)) {
        throw new Error(`Could not update ${description} in ${relativePath}`);
    }

    return source.replace(pattern, replacement);
}

const nextVersion = process.argv[2]?.trim();
if (!nextVersion) {
    exitWithUsage('Missing release version.');
}

if (!/^\d{4}-\d{2}-\d{2}-\d+$/.test(nextVersion)) {
    exitWithUsage(`Invalid release version: ${nextVersion}`);
}

for (const relativePath of targetFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    const original = fs.readFileSync(absolutePath, 'utf8');
    let updated = original;

    if (relativePath === 'sw.js') {
        updated = replaceOrThrow(
            updated,
            /const CACHE_VERSION = '[^']+';/,
            `const CACHE_VERSION = '${nextVersion}';`,
            'CACHE_VERSION',
            relativePath
        );
    }

    if (relativePath === 'js/registerServiceWorker.js') {
        updated = replaceOrThrow(
            updated,
            /const SERVICE_WORKER_URL = '\/sw\.js\?v=[^']+';/,
            `const SERVICE_WORKER_URL = '/sw.js?v=${nextVersion}';`,
            'SERVICE_WORKER_URL',
            relativePath
        );
    }

    if (relativePath.endsWith('.html')) {
        updated = replaceOrThrow(
            updated,
            /Release token for GitHub Pages cache busting: [^-<]+(?:-[^-<]+){3}/,
            `Release token for GitHub Pages cache busting: ${nextVersion} `,
            'release comment',
            relativePath
        );
        updated = updated.replace(/site\.webmanifest\?v=[^"]+/g, `site.webmanifest?v=${nextVersion}`);
        updated = updated.replace(/js\/registerServiceWorker\.js\?v=[^"]+/g, `js/registerServiceWorker.js?v=${nextVersion}`);
        updated = updated.replace(/css\/([a-z0-9-]+\.css)\?v=[^"]+/gi, 'css/$1?v=' + nextVersion);
        updated = updated.replace(/js\/([a-zA-Z0-9/-]+\.js)\?v=[^"]+/g, 'js/$1?v=' + nextVersion);
    }

    if (updated !== original) {
        fs.writeFileSync(absolutePath, updated, 'utf8');
        console.log(`Updated ${relativePath}`);
    } else {
        console.log(`No changes needed in ${relativePath}`);
    }
}

console.log(`Release version synchronized to ${nextVersion}.`);
