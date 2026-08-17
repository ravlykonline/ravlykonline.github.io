import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootEntries = fs.readdirSync(rootDir, { withFileTypes: true });
const markdownFiles = rootEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name);

const failures = [];

for (const fileName of markdownFiles) {
    const source = fs.readFileSync(path.join(rootDir, fileName), 'utf8');
    const links = source.matchAll(/\[[^\]]+\]\(([^)]+)\)/g);

    for (const match of links) {
        const rawTarget = match[1].trim().replace(/^<|>$/g, '');
        if (/^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;

        const pathPart = rawTarget.split('#', 1)[0];
        if (!pathPart) continue;

        const resolvedTarget = path.resolve(rootDir, decodeURIComponent(pathPart));
        if (!fs.existsSync(resolvedTarget)) {
            failures.push(`${fileName}: broken local link ${rawTarget}`);
        }
    }
}

const constantsSource = fs.readFileSync(path.join(rootDir, 'js/modules/constants.js'), 'utf8');
const limitNames = [
    'MAX_RECURSION_DEPTH',
    'MAX_PARSE_DEPTH',
    'MAX_EXPRESSION_DEPTH',
    'MAX_REPEATS_IN_LOOP',
    'EXECUTION_TIMEOUT_MS',
    'MAX_CODE_LENGTH_CHARS',
    'MAX_AST_NODES',
    'MAX_COMMAND_QUEUE_LENGTH',
    'MAX_GAME_TICK_OPERATIONS',
];

const limitDocs = ['SECURITY.md', 'TECHNICAL_GUIDE.md'];
for (const limitName of limitNames) {
    const valueMatch = constantsSource.match(new RegExp(`export const ${limitName} = (\\d+);`));
    if (!valueMatch) {
        failures.push(`constants.js: cannot read ${limitName}`);
        continue;
    }

    const expectedText = `${limitName} = ${valueMatch[1]}`;
    for (const fileName of limitDocs) {
        const source = fs.readFileSync(path.join(rootDir, fileName), 'utf8');
        if (!source.includes(expectedText)) {
            failures.push(`${fileName}: expected current limit ${expectedText}`);
        }
    }
}

const canonicalLanguageDocs = ['LANGUAGE_SPEC.md', 'language-reference.md'];
const obsoleteIdentifierPatterns = [
    /цифри, _ або -/u,
    /дозволені `_` і `-`/u,
    /підкреслення або дефіс/u,
];

for (const fileName of canonicalLanguageDocs) {
    const source = fs.readFileSync(path.join(rootDir, fileName), 'utf8');
    for (const pattern of obsoleteIdentifierPatterns) {
        if (pattern.test(source)) {
            failures.push(`${fileName}: still describes a hyphen as part of an identifier`);
        }
    }
}

const engineeringDocs = [
    'AGENTS.md',
    'ARCHITECTURE.md',
    'SECURITY.md',
    'TECHNICAL_GUIDE.md',
    'TESTING.md',
];
const hardcodedReleaseToken = /\?v=20\d{2}-\d{2}-\d{2}-\d+/u;
for (const fileName of engineeringDocs) {
    const source = fs.readFileSync(path.join(rootDir, fileName), 'utf8');
    if (hardcodedReleaseToken.test(source)) {
        failures.push(`${fileName}: use ?v=<release-token> instead of a hardcoded release value`);
    }
}

if (failures.length > 0) {
    console.error('Documentation checks failed:');
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
} else {
    console.log(`Documentation checks passed for ${markdownFiles.length} root Markdown files.`);
}
