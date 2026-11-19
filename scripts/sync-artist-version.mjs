// Versions every asset URL of the «Равлик Художник» game (artist/) with the
// release token.
//
// Cloudflare Pages serves static files with `Cache-Control: max-age=14400` and
// ignores overrides from `_headers`. artist/ is a tree of ES modules that import
// each other by plain relative paths, so after a deploy a returning browser
// could combine fresh index.html with up to four-hour-old CSS and modules and
// break. Two things fix that:
//   1. stylesheet and entry-script URLs in artist/index.html carry `?v=<token>`;
//   2. a generated import map remaps every module under artist/js/ to
//      `<module>?v=<token>`, so relative imports between modules get new URLs
//      too, without touching the module sources.
// Browsers without import maps still work; they just keep the old caching.

import fs from 'node:fs';
import path from 'node:path';

export const ARTIST_INDEX = 'artist/index.html';
export const IMPORTMAP_BEGIN = '<!-- BEGIN generated:artist-importmap -->';
export const IMPORTMAP_END = '<!-- END generated:artist-importmap -->';

export function listArtistModules(projectRoot) {
    const jsRoot = path.join(projectRoot, 'artist', 'js');
    const modules = [];
    const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const absolute = path.join(dir, entry.name);
            if (entry.isDirectory()) walk(absolute);
            else if (entry.name.endsWith('.js')) {
                modules.push(`./js/${path.relative(jsRoot, absolute).split(path.sep).join('/')}`);
            }
        }
    };
    walk(jsRoot);
    return modules;
}

export function buildArtistImportMap(modules, version) {
    const imports = Object.fromEntries(modules.map((specifier) => [specifier, `${specifier}?v=${version}`]));
    const json = JSON.stringify({ imports }, null, 2);
    return `${IMPORTMAP_BEGIN}\n<script type="importmap">\n${json}\n</script>\n${IMPORTMAP_END}`;
}

export function versionArtistIndex(html, modules, version) {
    let updated = html
        .replace(/href="css\/([a-z0-9-]+\.css)(?:\?v=[^"]*)?"/gi, `href="css/$1?v=${version}"`)
        .replace(/src="js\/main\.js(?:\?v=[^"]*)?"/, `src="js/main.js?v=${version}"`);

    const block = buildArtistImportMap(modules, version);
    const begin = updated.indexOf(IMPORTMAP_BEGIN);
    const end = updated.indexOf(IMPORTMAP_END);
    if (begin !== -1 && end > begin) {
        updated = updated.slice(0, begin) + block + updated.slice(end + IMPORTMAP_END.length);
    } else {
        // The import map must come before the first module script.
        const firstStylesheet = updated.indexOf('<link rel="stylesheet"');
        if (firstStylesheet === -1) throw new Error(`Could not place the import map in ${ARTIST_INDEX}`);
        updated = `${updated.slice(0, firstStylesheet)}${block}\n${updated.slice(firstStylesheet)}`;
    }

    if (!updated.includes(`src="js/main.js?v=${version}"`)) {
        throw new Error(`Could not version js/main.js in ${ARTIST_INDEX}`);
    }
    return updated;
}

export function syncArtistEntryPoint({ projectRoot, version }) {
    const absolutePath = path.join(projectRoot, ARTIST_INDEX);
    const original = fs.readFileSync(absolutePath, 'utf8');
    const updated = versionArtistIndex(original, listArtistModules(projectRoot), version);
    if (updated !== original) {
        fs.writeFileSync(absolutePath, updated, 'utf8');
        console.log(`Updated ${ARTIST_INDEX}`);
    } else {
        console.log(`No changes needed in ${ARTIST_INDEX}`);
    }
}
