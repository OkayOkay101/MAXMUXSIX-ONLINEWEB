const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';

function metaContent(name) {
  const tag = head.match(new RegExp('<meta\\s+name="' + name + '"\\s+content="([^"]+)"', 'i'));
  return tag?.[1] || '';
}

test('page title identifies the brand and the product', () => {
  const title = head.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
  assert.match(title, /MAXMUXSIX/);
  assert.match(title, /ข้าวหลาม/);
  assert.match(title, /หนองมน/);
});

test('page description explains the product in Thai', () => {
  const description = metaContent('description');
  assert.match(description, /ข้าวหลาม/);
  assert.match(description, /เตาถ่าน/);
  assert.ok(description.length >= 50);
});

test('page declares at least fifteen distinct relevant keywords', () => {
  const keywords = metaContent('keywords').split(',').map(word => word.trim()).filter(Boolean);
  assert.ok(keywords.length >= 15, 'expected at least 15 keywords');
  assert.equal(new Set(keywords).size, keywords.length);
  assert.ok(keywords.includes('MAXMUXSIX'));
});
