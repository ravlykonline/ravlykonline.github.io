import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildPagesArtifact } from '../scripts/build-pages-artifact.mjs';
import { runTest } from './testUtils.js';

const projectRoot = process.cwd();
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ravlyk-pages-'));
const outputRoot = path.join(temporaryRoot, 'artifact');

function findHtmlFiles(directoryPath) {
    const htmlFiles = [];
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
        const entryPath = path.join(directoryPath, entry.name);
        if (entry.isDirectory()) {
            htmlFiles.push(...findHtmlFiles(entryPath));
        } else if (entry.name.endsWith('.html')) {
            htmlFiles.push(entryPath);
        }
    }
    return htmlFiles;
}

try {
    buildPagesArtifact({ projectRoot, outputRoot });

    runTest('pages artifact includes the main site and intended public projects', () => {
        const expectedPaths = [
            'index.html',
            'CNAME',
            'js/main.js',
            'old/index.html',
            'old/manual.html',
            'artist/index.html',
            'artist/js/main.js',
            'game/index.html',
            'game/offline.html',
            'game/js/main.js',
            'go/index.html',
            'go/offline.html',
            'go/js/main.js',
            '.nojekyll',
        ];

        for (const relativePath of expectedPaths) {
            assert.equal(
                fs.existsSync(path.join(outputRoot, relativePath)),
                true,
                `Expected public artifact path: ${relativePath}`
            );
        }
    });

    runTest('pages artifact excludes development, tests, logs, and duplicate archives', () => {
        const excludedPaths = [
            'maisternia',
            'old/deploy-backup-20260313-172820',
            'old/README.md',
            'artist/tests',
            'artist/server-err.log',
            'artist/server-out.log',
            'artist/legacy',
            'game/tests',
            'go/tests',
            'go/package.json',
            'go/assets/assets.zip',
            'tests',
            'node_modules',
            'AGENTS.md',
            'package.json',
        ];

        for (const relativePath of excludedPaths) {
            assert.equal(
                fs.existsSync(path.join(outputRoot, relativePath)),
                false,
                `Excluded path leaked into Pages artifact: ${relativePath}`
            );
        }
    });

    runTest('pages artifact keeps every local HTML asset reference resolvable', () => {
        const assetReferencePattern = /<(?:script|img|link)\b[^>]*(?:src|href)="([^"]+)"/gi;
        for (const htmlPath of findHtmlFiles(outputRoot)) {
            const html = fs.readFileSync(htmlPath, 'utf8');
            for (const match of html.matchAll(assetReferencePattern)) {
                const reference = match[1];
                if (/^(?:https?:|data:|#)/i.test(reference)) continue;

                const cleanReference = reference.split(/[?#]/, 1)[0];
                if (!cleanReference) continue;
                const targetPath = cleanReference.startsWith('/')
                    ? path.join(outputRoot, cleanReference.slice(1))
                    : path.resolve(path.dirname(htmlPath), cleanReference);
                assert.equal(
                    fs.existsSync(targetPath),
                    true,
                    `${path.relative(outputRoot, htmlPath)} references missing asset ${reference}`
                );
            }
        }
    });

    runTest('pages artifact refuses destructive repository output paths', () => {
        assert.throws(
            () => buildPagesArtifact({ projectRoot, outputRoot: projectRoot }),
            /must not contain the project root/
        );
        assert.throws(
            () => buildPagesArtifact({ projectRoot, outputRoot: path.join(projectRoot, 'js') }),
            /must be \.pages-artifact/
        );
    });

    runTest('about page links to the noindex museum', () => {
        const aboutHtml = fs.readFileSync('about.html', 'utf8');
        assert.match(aboutHtml, /href="old\/"/);

        for (const relativePath of [
            'old/index.html',
            'old/lessons.html',
            'old/manual.html',
            'old/resources.html',
        ]) {
            const html = fs.readFileSync(relativePath, 'utf8');
            assert.match(html, /<meta name="robots" content="noindex, follow"\s*\/?>/);
        }
    });
} finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log('GitHub Pages artifact tests completed.');
