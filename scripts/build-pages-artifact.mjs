import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultProjectRoot = path.resolve(__dirname, '..');

export const PAGES_PUBLICATION_MANIFEST = {
    root: {
        files: [
            'index.html',
            'manual.html',
            'lessons.html',
            'quiz.html',
            'resources.html',
            'teacher_guidelines.html',
            'advice_for_parents.html',
            'zen.html',
            'about.html',
            'privacy.html',
            'site.webmanifest',
            'sw.js',
            'robots.txt',
            'sitemap.xml',
            'CNAME',
            'android-chrome-192x192.png',
            'android-chrome-512x512.png',
            'apple-touch-icon.png',
            'favicon-16x16.png',
            'favicon-32x32.png',
            'favicon.ico',
            'ravlyk.jpg',
        ],
        directories: ['assets', 'css', 'js', 'resources'],
        precache: {
            routeAliases: ['/'],
            extensions: [
                '.html', '.css', '.js', '.mjs',
                '.svg', '.png', '.jpg', '.jpeg', '.webp', '.ico',
                '.webmanifest', '.woff', '.woff2',
            ],
            excludes: ['sw.js'],
        },
    },
    old: {
        files: [
            'index.html',
            'lessons.html',
            'manual.html',
            'resources.html',
            'site.webmanifest',
            'android-chrome-192x192.png',
            'android-chrome-512x512.png',
            'apple-touch-icon.png',
            'favicon-16x16.png',
            'favicon-32x32.png',
            'favicon.ico',
        ],
        directories: ['assets', 'css', 'js'],
    },
    artist: {
        files: ['index.html'],
        directories: ['css', 'js'],
    },
    game: {
        files: [
            'index.html',
            'offline.html',
            'manifest.json',
            'style.css',
            'tokens.css',
            'sw.js',
        ],
        directories: ['css', 'icons', 'js'],
    },
    go: {
        files: [
            'index.html',
            'offline.html',
            'manifest.json',
            'ravlyk.png',
            'sw.js',
        ],
        directories: ['assets', 'css', 'js'],
        excludes: ['go/assets/assets.zip'],
    },
};

function isPathInside(parentPath, childPath) {
    const relative = path.relative(parentPath, childPath);
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function assertSafeOutputPath(projectRoot, outputRoot) {
    if (outputRoot === projectRoot || isPathInside(outputRoot, projectRoot)) {
        throw new Error('Pages artifact output must not contain the project root.');
    }

    if (isPathInside(projectRoot, outputRoot)) {
        const relative = path.relative(projectRoot, outputRoot);
        if (relative !== '.pages-artifact') {
            throw new Error('Pages artifact output inside the repository must be .pages-artifact.');
        }
    }
}

function copyRequiredPath({ projectRoot, outputRoot, sourceRelativePath, destinationRelativePath, excludes = [] }) {
    const sourcePath = path.join(projectRoot, sourceRelativePath);
    const destinationPath = path.join(outputRoot, destinationRelativePath);

    if (!fs.existsSync(sourcePath)) {
        throw new Error(`Missing required public path: ${sourceRelativePath}`);
    }

    const sourceStats = fs.statSync(sourcePath);
    if (!sourceStats.isDirectory()) {
        fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
        fs.copyFileSync(sourcePath, destinationPath);
        return;
    }

    const normalizedExcludes = new Set(excludes.map((item) => item.split('/').join(path.sep)));
    fs.cpSync(sourcePath, destinationPath, {
        recursive: true,
        filter: (candidatePath) => {
            const candidateRelativePath = path.relative(projectRoot, candidatePath);
            return !normalizedExcludes.has(candidateRelativePath);
        },
    });
}

export function buildPagesArtifact({
    projectRoot = defaultProjectRoot,
    outputRoot = path.join(projectRoot, '.pages-artifact'),
} = {}) {
    const resolvedProjectRoot = path.resolve(projectRoot);
    const resolvedOutputRoot = path.resolve(outputRoot);
    assertSafeOutputPath(resolvedProjectRoot, resolvedOutputRoot);

    fs.rmSync(resolvedOutputRoot, { recursive: true, force: true });
    fs.mkdirSync(resolvedOutputRoot, { recursive: true });

    const rootManifest = PAGES_PUBLICATION_MANIFEST.root;
    for (const relativePath of rootManifest.files) {
        copyRequiredPath({
            projectRoot: resolvedProjectRoot,
            outputRoot: resolvedOutputRoot,
            sourceRelativePath: relativePath,
            destinationRelativePath: relativePath,
        });
    }
    for (const relativePath of rootManifest.directories) {
        copyRequiredPath({
            projectRoot: resolvedProjectRoot,
            outputRoot: resolvedOutputRoot,
            sourceRelativePath: relativePath,
            destinationRelativePath: relativePath,
        });
    }

    for (const [projectName, manifest] of Object.entries(PAGES_PUBLICATION_MANIFEST)) {
        if (projectName === 'root') continue;

        for (const relativePath of manifest.files) {
            copyRequiredPath({
                projectRoot: resolvedProjectRoot,
                outputRoot: resolvedOutputRoot,
                sourceRelativePath: path.join(projectName, relativePath),
                destinationRelativePath: path.join(projectName, relativePath),
            });
        }
        for (const relativePath of manifest.directories) {
            copyRequiredPath({
                projectRoot: resolvedProjectRoot,
                outputRoot: resolvedOutputRoot,
                sourceRelativePath: path.join(projectName, relativePath),
                destinationRelativePath: path.join(projectName, relativePath),
                excludes: manifest.excludes || [],
            });
        }
    }

    fs.writeFileSync(path.join(resolvedOutputRoot, '.nojekyll'), '', 'utf8');
    return resolvedOutputRoot;
}

const isCliRun = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isCliRun) {
    const outputArgument = process.argv[2];
    const outputRoot = outputArgument
        ? path.resolve(defaultProjectRoot, outputArgument)
        : path.join(defaultProjectRoot, '.pages-artifact');
    const builtPath = buildPagesArtifact({ outputRoot });
    console.log(`GitHub Pages artifact built at ${builtPath}`);
}
