const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { root } = require('./testHelpers.cjs');

const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.json', '.md']);

function listTextFiles(dir = root) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '.git' || entry.name === 'node_modules') {
        continue;
      }
      files.push(...listTextFiles(absolutePath));
      continue;
    }

    if (TEXT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

test('source files avoid persistent storage, dynamic code execution and document.write', () => {
  const runtimeFiles = listTextFiles().filter((file) => {
    const relativePath = path.relative(root, file).replace(/\\/g, '/');
    return !relativePath.startsWith('tests/') && !relativePath.endsWith('.md');
  });

  for (const file of runtimeFiles) {
    const relativePath = path.relative(root, file).replace(/\\/g, '/');
    const source = fs.readFileSync(file, 'utf8');

    assert.doesNotMatch(source, /\blocalStorage\b/, `${relativePath} must not use localStorage`);
    assert.doesNotMatch(source, /\beval\s*\(/, `${relativePath} must not use eval`);
    assert.doesNotMatch(source, /\bnew\s+Function\b/, `${relativePath} must not use new Function`);
    assert.doesNotMatch(source, /\bdocument\.write\s*\(/, `${relativePath} must not use document.write`);
  }
});

test('runtime source files do not introduce external URLs', () => {
  const runtimeFiles = listTextFiles().filter((file) => {
    const relativePath = path.relative(root, file).replace(/\\/g, '/');
    return !relativePath.startsWith('tests/') && !relativePath.endsWith('.md');
  });

  for (const file of runtimeFiles) {
    const relativePath = path.relative(root, file).replace(/\\/g, '/');
    const source = fs.readFileSync(file, 'utf8');

    assert.doesNotMatch(source, /https?:\/\//i, `${relativePath} must not reference external URLs`);
  }
});
