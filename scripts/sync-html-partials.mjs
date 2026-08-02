import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');

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
    'privacy.html',
];

const siteLinks = {
    editor: {
        href: 'index.html',
        buttonClass: 'btn-success',
        iconClass: 'icon-paint-brush',
        label: 'До Редактора',
    },
    lessons: {
        href: 'lessons.html',
        buttonClass: 'btn-primary',
        iconClass: 'icon-graduation-cap',
        label: 'До Уроків',
    },
    manual: {
        href: 'manual.html',
        buttonClass: 'btn-primary',
        iconClass: 'icon-book-open',
        label: 'До Посібника',
    },
    resources: {
        href: 'resources.html',
        buttonClass: 'btn-primary',
        iconClass: 'icon-puzzle-piece',
        label: 'До Ресурсів',
    },
    about: {
        href: 'about.html',
        buttonClass: 'btn-info',
        iconClass: 'icon-info-circle',
        label: 'Про проєкт',
    },
};

const partials = [
    {
        name: 'accessibility-panel',
        path: 'partials/accessibility-panel.html',
        fallbackStart: '<div class="accessibility-floating-layer">',
    },
    {
        name: 'main-footer',
        path: 'partials/main-footer.html',
        fallbackStart: '<footer class="main-footer">',
        tagName: 'footer',
        files: {
            'index.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> Мова програмування РАВЛИК | Автор: пан Артем - вчитель інформатики <a href="https://www.facebook.com/panaptem" target="_blank" rel="noopener noreferrer" class="footer-link">(Facebook)</a>',
            },
            'manual.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> Мова програмування РАВЛИК | Автор: пан Артем - вчитель інформатики <a href="https://www.facebook.com/panaptem" target="_blank" rel="noopener noreferrer" class="footer-link">(Facebook)</a>',
            },
            'lessons.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> Мова програмування РАВЛИК | Автор: пан Артем - вчитель інформатики <a href="https://www.facebook.com/panaptem" target="_blank" rel="noopener noreferrer" class="footer-link">(Facebook)</a>',
            },
            'resources.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> Мова програмування РАВЛИК | Автор: пан Артем - вчитель інформатики <a href="https://www.facebook.com/panaptem" target="_blank" rel="noopener noreferrer" class="footer-link">(Facebook)</a>',
            },
            'quiz.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> РАВЛИК | Навчальна вікторина',
            },
            'teacher_guidelines.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> РАВЛИК | Методичні матеріали для вчителя',
            },
            'advice_for_parents.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> РАВЛИК | Поради для батьків',
            },
            'about.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> РАВЛИК | Про проєкт',
            },
            'privacy.html': {
                FOOTER_TEXT: '&copy;<span class="current-year">2026</span> РАВЛИК | Приватність',
            },
        },
    },
    {
        name: 'site-nav-links:support',
        legacyNames: ['support-quick-links'],
        render: () => renderSiteNavLinks(['editor', 'lessons', 'manual', 'resources']),
        fallbackStart: '<a class="btn btn-success" href="index.html">',
        fallbackEnd: '<a class="btn btn-primary" href="resources.html"><span class="ui-icon icon-puzzle-piece" aria-hidden="true"></span>До Ресурсів</a>',
        files: {
            'quiz.html': {},
            'teacher_guidelines.html': {},
            'advice_for_parents.html': {},
            'about.html': {},
            'privacy.html': {},
        },
    },
    {
        name: 'site-nav-links:footer-about',
        legacyNames: ['footer-about-nav'],
        render: () => renderSiteNavLinks(['about'], {
            wrapperClass: 'footer-site-nav site-links-uniform',
            ariaLabel: 'Нижня навігація сайтом',
        }),
        fallbackStart: '<nav class="footer-site-nav site-links-uniform" aria-label="Нижня навігація сайтом">',
        tagName: 'nav',
        files: {
            'index.html': {},
            'quiz.html': {},
            'teacher_guidelines.html': {},
            'advice_for_parents.html': {},
        },
    },
    {
        name: 'site-nav-links:resources-footer',
        render: () => renderSiteNavLinks(['editor', 'lessons', 'manual', 'about'], {
            wrapperClass: 'nav-buttons-footer site-links-uniform',
            ariaLabel: 'Основна навігація сайтом',
        }),
        fallbackStart: '<nav class="nav-buttons-footer site-links-uniform" aria-label="Основна навігація сайтом">',
        tagName: 'nav',
        files: {
            'resources.html': {},
        },
    },
    {
        name: 'site-nav-links:lessons-footer',
        render: () => renderSiteNavLinks(['editor', 'manual', 'about'], {
            wrapperClass: 'bottom-nav-buttons',
            ariaLabel: 'Основна навігація сайтом',
            innerWrapperClass: 'site-links-uniform',
        }),
        fallbackStart: '<nav class="bottom-nav-buttons" aria-label="Основна навігація сайтом">',
        tagName: 'nav',
        files: {
            'lessons.html': {},
        },
    },
];

function renderSiteNavLinks(linkKeys, options = {}) {
    const links = linkKeys.map((key) => {
        const link = siteLinks[key];
        if (!link) {
            throw new Error(`Unknown site link key: ${key}`);
        }

        return `<a href="${link.href}" class="btn ${link.buttonClass}"><span class="ui-icon ${link.iconClass}" aria-hidden="true"></span>${link.label}</a>`;
    }).join('\n');

    if (!options.wrapperClass) {
        return links;
    }

    if (options.innerWrapperClass) {
        return [
            `<nav class="${options.wrapperClass}" aria-label="${options.ariaLabel}">`,
            `  <div class="${options.innerWrapperClass}">`,
            `    ${links.replaceAll('\n', '\n    ')}`,
            '  </div>',
            '</nav>',
        ].join('\n');
    }

    return [
        `<nav class="${options.wrapperClass}" aria-label="${options.ariaLabel}">`,
        `  ${links.replaceAll('\n', '\n  ')}`,
        '</nav>',
    ].join('\n');
}

function renderPartial(content, variables = {}) {
    return content.replace(/\{\{([A-Z0-9_]+)\}\}/g, (match, key) => {
        if (!Object.hasOwn(variables, key)) {
            throw new Error(`Missing partial variable: ${key}`);
        }
        return variables[key];
    });
}

function withSharedMarkers(name, content, variables = {}) {
    return [
        `<!-- BEGIN shared:${name} -->`,
        renderPartial(content, variables).trimEnd(),
        `<!-- END shared:${name} -->`,
    ].join('\n');
}

function findElementBlock(source, startNeedle, tagName, relativePath, fromIndex = 0) {
    const start = source.indexOf(startNeedle, fromIndex);
    if (start === -1) {
        throw new Error(`Could not find fallback block "${startNeedle}" in ${relativePath}`);
    }

    const tagPattern = new RegExp(`<\\/?${tagName}\\b[^>]*>`, 'gi');
    tagPattern.lastIndex = start;
    let depth = 0;
    let match = null;

    while ((match = tagPattern.exec(source)) !== null) {
        const tag = match[0];
        if (tag.startsWith('</')) {
            depth -= 1;
        } else {
            depth += 1;
        }

        if (depth === 0) {
            return {
                start,
                end: tagPattern.lastIndex,
            };
        }
    }

    throw new Error(`Could not find end of fallback block in ${relativePath}`);
}

function findDivBlock(source, startNeedle, relativePath, fromIndex = 0) {
    return findElementBlock(source, startNeedle, 'div', relativePath, fromIndex);
}

function findSharedMarkedBlock(source, names, relativePath) {
    for (const name of names) {
        const begin = `<!-- BEGIN shared:${name} -->`;
        const end = `<!-- END shared:${name} -->`;
        const beginIndex = source.indexOf(begin);
        const endIndex = source.indexOf(end);

        if (beginIndex === -1 && endIndex === -1) {
            continue;
        }

        if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
            throw new Error(`Broken shared markers for ${name} in ${relativePath}`);
        }

        return {
            start: beginIndex,
            end: endIndex + end.length,
        };
    }

    return null;
}

function replaceSharedBlock(source, partial, replacement, relativePath) {
    const markedBlock = findSharedMarkedBlock(source, [partial.name, ...(partial.legacyNames || [])], relativePath);
    if (markedBlock) {
        return source.slice(0, markedBlock.start)
            + replacement
            + source.slice(markedBlock.end);
    }

    const block = findLegacyBlock(source, partial, relativePath);
    return source.slice(0, block.start)
        + replacement
        + source.slice(block.end);
}

function findLegacyBlock(source, partial, relativePath) {
    if (partial.fallbackEnd) {
        const start = source.indexOf(partial.fallbackStart);
        if (start === -1) {
            throw new Error(`Could not find fallback block "${partial.fallbackStart}" in ${relativePath}`);
        }

        const endStart = source.indexOf(partial.fallbackEnd, start);
        if (endStart === -1) {
            throw new Error(`Could not find fallback block end "${partial.fallbackEnd}" in ${relativePath}`);
        }

        return {
            start,
            end: endStart + partial.fallbackEnd.length,
        };
    }

    if (partial.tagName) {
        return findElementBlock(source, partial.fallbackStart, partial.tagName, relativePath);
    }

    const wrappedStart = source.indexOf(partial.fallbackStart);
    if (wrappedStart !== -1) {
        return findDivBlock(source, partial.fallbackStart, relativePath);
    }

    const buttonStart = source.indexOf('<button id="accessibility-toggle"');
    if (buttonStart === -1) {
        throw new Error(`Could not find accessibility toggle in ${relativePath}`);
    }

    const panelStartNeedle = '<div id="accessibility-panel"';
    const panelBlock = findDivBlock(source, panelStartNeedle, relativePath, buttonStart);
    return {
        start: buttonStart,
        end: panelBlock.end,
    };
}

for (const partial of partials.filter((partial) => partial.path)) {
    const partialPath = path.join(projectRoot, partial.path);
    partial.content = fs.readFileSync(partialPath, 'utf8').trimEnd();
}

const changedFiles = [];

for (const relativePath of publicHtmlFiles) {
    const absolutePath = path.join(projectRoot, relativePath);
    const original = fs.readFileSync(absolutePath, 'utf8');
    let updated = original;

    for (const partial of partials) {
        if (partial.files && !partial.files[relativePath]) {
            continue;
        }
        const content = partial.render
            ? partial.render(partial.files?.[relativePath])
            : partial.content;
        updated = replaceSharedBlock(
            updated,
            partial,
            withSharedMarkers(partial.name, content, partial.files?.[relativePath]),
            relativePath
        );
    }

    if (updated !== original) {
        changedFiles.push(relativePath);
        if (checkOnly) {
            console.log(`Needs update ${relativePath}`);
        } else {
            fs.writeFileSync(absolutePath, updated, 'utf8');
            console.log(`Updated ${relativePath}`);
        }
    } else {
        console.log(`No changes needed in ${relativePath}`);
    }
}

if (checkOnly && changedFiles.length > 0) {
    console.error(`Shared HTML partials are out of sync: ${changedFiles.join(', ')}`);
    process.exitCode = 1;
}
