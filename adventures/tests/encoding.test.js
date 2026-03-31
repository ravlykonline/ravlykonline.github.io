const test = require('node:test');
const assert = require('node:assert/strict');

const { readBytes, readUtf8 } = require('./testHelpers.cjs');

test('index.html stays UTF-8 without BOM and keeps key UI markers', () => {
  const html = readUtf8('index.html');
  const bytes = readBytes('index.html');

  assert.equal(bytes[0], 0x3c);
  assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'BOM should be absent');
  assert.match(html, /<meta charset="UTF-8">/i);
  assert.ok(html.includes('progress-text'));
  assert.ok(html.includes('btn-map'));
  assert.ok(html.includes('debug-note'));
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.ok(html.includes('ravlyk.png'));
});

test('texts.uk.js stays UTF-8 without BOM and keeps readable Ukrainian strings', () => {
  const textsUk = readUtf8('js/texts.uk.js');
  const bytes = readBytes('js/texts.uk.js');

  assert.equal(bytes[0], 0x28);
  assert.ok(!bytes.subarray(0, 3).equals(Buffer.from([0xef, 0xbb, 0xbf])), 'BOM should be absent');
  assert.ok(textsUk.includes('\u041f\u0440\u0438\u0433\u043e\u0434\u0438 \u0420\u0430\u0432\u043b\u0438\u043a\u0430'));
  assert.ok(textsUk.includes('\u041e\u0437\u0432\u0443\u0447\u0435\u043d\u043d\u044f \u043d\u0435 \u043f\u0456\u0434\u0442\u0440\u0438\u043c\u0443\u0454\u0442\u044c\u0441\u044f \u0443 \u0446\u044c\u043e\u043c\u0443 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0456.'));
  assert.ok(!textsUk.includes('????????'));
  assert.ok(!textsUk.includes('\\u0420\\u0430\\u0432\\u043b\\u0438\\u043a'));
});

test('levels file contains no typical mojibake markers', () => {
  const levels = readUtf8('js/levels.js');

  assert.ok(levels.includes('\\u041f\\u0440\\u044f\\u043c\\u0430 \\u0434\\u043e\\u0440\\u0456\\u0436\\u043a\\u0430'));
  assert.ok(levels.includes('\\u0412\\u0435\\u043b\\u0438\\u043a\\u0430 \\u043f\\u043e\\u0434\\u043e\\u0440\\u043e\\u0436 \\u0440\\u0430\\u0432\\u043b\\u0438\\u043a\\u0430'));
  assert.ok(!levels.includes('?????????????????????????????????????????????????????????????'));
});
