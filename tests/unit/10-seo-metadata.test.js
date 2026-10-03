const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');

// A bounded source scanner, not an HTML5 parser. Preserve source positions:
// a browser parser can repair misplaced tags and hide a broken source document.
// Consume complete quoted tags and raw-text elements so examples in comments,
// attributes, scripts and styles cannot masquerade as live SEO metadata.
function scan(source) {
  const tags = /<!--[\s\S]*?-->|<![^>]*>|<\/?([a-z][\w:-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi;
  const voidTags = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const stack = [];
  const records = [];
  let match;
  while ((match = tags.exec(source))) {
    if (!match[1]) continue;
    const name = match[1].toLowerCase();
    const closing = /^<\//.test(match[0]);
    const inert = stack.includes('template') || stack.includes('noscript');
    const record = {
      name, closing, attrs: match[2], start: match.index,
      end: tags.lastIndex, parent: stack.at(-1), inert
    };
    records.push(record);
    if (closing) {
      const index = stack.lastIndexOf(name);
      if (index >= 0) stack.length = index;
    } else if (['script', 'style', 'title', 'textarea'].includes(name)) {
      const close = new RegExp('</' + name + '\\s*>', 'gi');
      close.lastIndex = tags.lastIndex;
      const end = close.exec(source);
      assert.ok(end, 'unclosed ' + name + ' element');
      record.text = source.slice(tags.lastIndex, end.index);
      record.end = close.lastIndex;
      tags.lastIndex = close.lastIndex;
    } else if (!voidTags.has(name)) {
      stack.push(name);
    }
  }
  return records;
}

function decode(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: '\u00a0' };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (entity, key) => {
    if (!key.startsWith('#')) return named[key.toLowerCase()];
    const code = key[1].toLowerCase() === 'x'
      ? parseInt(key.slice(2), 16) : parseInt(key.slice(1), 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : '\ufffd';
  });
}

function attributes(record) {
  const result = Object.create(null);
  const attr = /\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/gy;
  let offset = 0;
  while (offset < record.attrs.length) {
    if (/^\s*\/?\s*$/.test(record.attrs.slice(offset))) break;
    attr.lastIndex = offset;
    const match = attr.exec(record.attrs);
    assert.ok(match, 'malformed attributes on ' + record.name);
    const name = match[1].toLowerCase();
    assert.ok(!Object.hasOwn(result, name), 'duplicate attribute: ' + name);
    result[name] = decode(match[2] ?? match[3] ?? match[4] ?? '');
    offset = attr.lastIndex;
  }
  return result;
}

function metadata(source) {
  const records = scan(source).filter(record => !record.inert);
  const heads = records.filter(record => record.name === 'head' && !record.closing);
  const ends = records.filter(record => record.name === 'head' && record.closing);
  const bodies = records.filter(record => record.name === 'body' && !record.closing);
  assert.equal(bodies.length, 1, 'expected one explicit body');
  const [body] = bodies;
  assert.equal(heads.length, 1, 'expected one explicit head');
  assert.equal(ends.length, 1, 'expected one explicit closing head');
  const [head] = heads;
  assert.equal(head.parent, 'html', 'head must be a direct child of html');
  assert.ok(body && head.end <= ends[0].start && ends[0].end <= body.start,
    'head must close before body');
  const allowedHead = new Set(['base', 'link', 'meta', 'title', 'style', 'script', 'template', 'noscript']);
  assert.ok(records.filter(record => !record.closing && record.parent === 'head')
    .every(record => allowedHead.has(record.name)), 'unexpected element in head');
  const titles = records.filter(record => record.name === 'title' && !record.closing);
  const metas = records.filter(record => record.name === 'meta' && !record.closing)
    .map(record => ({ ...record, values: attributes(record) }));
  const result = {};
  for (const name of ['title', 'description', 'keywords']) {
    const matches = name === 'title' ? titles
      : metas.filter(record => (record.values.name || '').toLowerCase() === name);
    assert.equal(matches.length, 1, 'expected exactly one ' + name);
    const [record] = matches;
    assert.ok(record.parent === 'head' && record.start >= head.end && record.end <= ends[0].start,
      name + ' must be a direct child of head');
    const value = name === 'title' ? decode(record.text) : record.values.content;
    assert.equal(typeof value, 'string', name + ' must have content');
    assert.ok(value.trim(), name + ' must not be blank');
    result[name] = value.trim();
  }
  return result;
}

function validate(source) {
  const values = metadata(source);
  for (const word of ['MAXMUXSIX', 'ข้าวหลาม', 'หนองมน', 'ชลบุรี']) {
    assert.ok(values.title.includes(word), 'title must include ' + word);
  }
  for (const word of ['MAXMUXSIX', 'ข้าวหลาม', 'เตาถ่าน', 'หนองมน', 'ชลบุรี']) {
    assert.ok(values.description.includes(word), 'description must include ' + word);
  }
  assert.ok(Array.from(values.description).length >= 50, 'description must have at least 50 characters');
  const keywords = values.keywords.split(',').map(word => word.trim());
  assert.ok(keywords.every(Boolean), 'keywords must not contain empty entries');
  assert.ok(keywords.length >= 15, 'expected at least 15 keywords');
  const normalized = keywords.map(word => word.normalize('NFC').toLowerCase());
  assert.equal(new Set(normalized).size, keywords.length, 'keywords must be distinct after normalization');
  for (const word of ['MAXMUXSIX', 'ข้าวหลาม', 'ข้าวหลามหนองมน', 'ข้าวหลามชลบุรี', 'ขนมไทย']) {
    assert.ok(keywords.includes(word), 'keywords must include ' + word);
  }
  return values;
}

test('index.html has unique, nonempty storefront metadata directly in its head', () => {
  validate(html);
});

// Keep parser regression fixtures independent of the source's formatting.
// Values come from the real page; the contract above always checks the full file.
const values = metadata(html);
const titleTag = '<title>' + values.title + '</title>';
const descriptionTag = '<meta name="description" content="' + values.description + '">';
const keywordsTag = '<meta name="keywords" content="' + values.keywords + '">';
const page = '<!DOCTYPE html><html lang="th"><head>\n' +
  titleTag + '\n' + descriptionTag + '\n' + keywordsTag + '\n</head>\n<body></body></html>';
const tags = { title: titleTag, description: descriptionTag, keywords: keywordsTag };
const withHead = value => page.replace('</head>', value + '\n</head>');
const metaValue = (tag, value) => tag.replace(/content="[^"]*"/, 'content="' + value + '"');

for (const [name, tag] of Object.entries(tags)) {
  for (const [label, mutate, error] of [
    ['missing', () => page.replace(tag, ''), 'expected exactly one ' + name],
    ['duplicate in head', () => withHead(tag), 'expected exactly one ' + name],
    ['duplicate in body', () => page.replace('<body>', '<body>' + tag), 'expected exactly one ' + name],
    ['only in body', () => page.replace(tag, '').replace('<body>', '<body>' + tag), 'must be a direct child of head'],
    ['commented out', () => page.replace(tag, '<!--' + tag + '-->'), 'expected exactly one ' + name],
    ['inside script', () => page.replace(tag, '<script>const example = ' + JSON.stringify(tag) + ';</script>'), 'expected exactly one ' + name],
    ['inside style', () => page.replace(tag, '<style>/* ' + tag + ' */</style>'), 'expected exactly one ' + name],
    ['inside template', () => page.replace(tag, '<template>' + tag + '</template>'), 'expected exactly one ' + name],
    ['inside noscript', () => page.replace(tag, '<noscript>' + tag + '</noscript>'), 'expected exactly one ' + name],
    ['nested in a div', () => page.replace(tag, '<div>' + tag + '</div>'), 'unexpected element in head'],
    ['blank', () => page.replace(tag, name === 'title' ? '<title> \n </title>' : metaValue(tag, ' \n ')), 'must not be blank']
  ]) {
    test(name + ': rejects ' + label, () => {
      assert.throws(() => validate(mutate()), errorValue => errorValue.message.includes(error));
    });
  }
}

for (const [label, mutate, error] of [
  ['head nested in a div', () => page.replace('<head>', '<div><head>'), 'head must be a direct child of html'],
  ['nonmetadata element in head', () => withHead('<div></div>'), 'unexpected element in head'],
  ['duplicate body', () => page.replace('<body>', '<body><body>'), 'expected one explicit body'],
  ['missing head', () => page.replace('<head>', ''), 'expected one explicit head'],
  ['missing closing head', () => page.replace('</head>', ''), 'expected one explicit closing head'],
  ['duplicate head', () => withHead('<head></head>'), 'expected one explicit head'],
  ['body before head closes', () => page.replace('</head>\n<body>', '<body>\n</head>'), 'head must close before body'],
  ['description without content', () => page.replace(descriptionTag, '<meta name="description">'), 'must have content'],
  ['data-name instead of name', () => page.replace(descriptionTag, descriptionTag.replace(' name=', ' data-name=')), 'expected exactly one description'],
  ['duplicate name attribute', () => page.replace(descriptionTag, descriptionTag.replace('<meta ', '<meta NAME="other" ')), 'duplicate attribute: name'],
  ['duplicate content attribute', () => page.replace(descriptionTag, descriptionTag.replace('<meta ', '<meta CONTENT="other" ')), 'duplicate attribute: content'],
  ['incomplete meta tag', () => page.replace(descriptionTag, descriptionTag.slice(0, -1)), 'expected exactly one description'],
  ['short description', () => page.replace(descriptionTag, metaValue(descriptionTag, 'MAXMUXSIX ข้าวหลามเตาถ่าน หนองมน ชลบุรี')), 'at least 50 characters'],
  ['missing title location', () => page.replace(titleTag, titleTag.replace('ชลบุรี', '')), 'title must include ชลบุรี'],
  ['missing description brand', () => page.replace(descriptionTag, descriptionTag.replace('MAXMUXSIX', 'ร้านค้า')), 'description must include MAXMUXSIX'],
  ['fewer than fifteen keywords', () => page.replace(keywordsTag, keywordsTag.replace(', ข้าวหลามเดลิเวอรี', '')), 'at least 15 keywords'],
  ['empty keyword', () => page.replace(keywordsTag, keywordsTag.replace('MAXMUXSIX,', 'MAXMUXSIX, ,')), 'empty entries'],
  ['trailing comma', () => page.replace(keywordsTag, keywordsTag.replace('เดลิเวอรี"', 'เดลิเวอรี,"')), 'empty entries'],
  ['case-insensitive duplicate keyword', () => page.replace(keywordsTag, keywordsTag.replace('ข้าวหลามเดลิเวอรี', ' maxmuxsix ')), 'distinct after normalization'],
  ['entity-encoded duplicate keyword', () => page.replace(keywordsTag, keywordsTag.replace('ข้าวหลามเดลิเวอรี', '&#77;AXMUXSIX')), 'distinct after normalization'],
  ['unrelated keywords with enough entries', () => page.replace(keywordsTag, metaValue(keywordsTag, ['MAXMUXSIX', ...Array.from({ length: 14 }, (_, i) => 'unrelated' + i)].join(','))), 'keywords must include ข้าวหลาม']
]) {
  test('metadata regressions: rejects ' + label, () => {
    assert.throws(() => validate(mutate()), errorValue => errorValue.message.includes(error));
  });
}

for (const [label, mutate] of [
  ['reordered attributes', () => page.replace(descriptionTag, '<meta content="' + values.description + '" name="description">')],
  ['single quotes, mixed case and multiline attributes', () => page.replace(descriptionTag,
    "<META\n CONTENT='" + values.description + "'\n NAME='DESCRIPTION' />")],
  ['unquoted name and extra attributes', () => page.replace(descriptionTag, descriptionTag.replace('name="description"', 'data-note="a > b" name=description'))],
  ['head attributes and uppercase boundaries', () => page.replace('<head>', '<HEAD data-page="store">').replace('</head>', '</HEAD>')],
  ['numeric character references', () => page.replace(/MAXMUXSIX/g, '&#77;AXMUXSIX')],
  ['ignored decoys', () => withHead('<!-- <head>' + descriptionTag + '</head> -->' +
    '<script>const decoy = ' + JSON.stringify(titleTag + keywordsTag + '</head>') + ';</script>' +
    '<style>/* ' + descriptionTag + ' */</style>' +
    '<template><template>' + descriptionTag + '</template></template>')],
  ['greater-than sign in a quoted value', () => page.replace(descriptionTag, metaValue(descriptionTag, values.description + ' > อ่านเพิ่มเติม'))]
]) {
  test('valid HTML variations: accepts ' + label, () => {
    assert.doesNotThrow(() => validate(mutate()));
  });
}

// Canonical, Open Graph, Twitter Card and JSON-LD are not present in index.html.
// Add URL/schema/consistency tests when those features and their expected origin
// are introduced; do not freeze their absence or invent a production URL here.
