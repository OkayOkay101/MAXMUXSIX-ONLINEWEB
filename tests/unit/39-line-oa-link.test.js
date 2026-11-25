const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

// LINE OA basic ID read from the owner's LINE OA Manager on 2026-11-26.
const OA_ID = '@052edqsq';
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

test('every add-friend link opens the shop LINE account', () => {
  const links = html.match(/https:\/\/line\.me\/R\/ti\/p\/[^"'\s<]+/g) || [];
  assert.strictEqual(links.length, 2);
  for (const link of links) assert.strictEqual(link, `https://line.me/R/ti/p/${OA_ID}`);
});

test('the page shows no other LINE ID', () => {
  assert.doesNotMatch(html, /LINE( ID| OA)?:?\s*(<strong>)?@MAXMUXSIX/i);
});

test('the QR code is the official LINE image for the shop account', () => {
  const modal = html.slice(html.indexOf('id="lineQrModalTitle"'));
  assert.match(modal.slice(0, 2000), /<img[^>]+src="https:\/\/qr-official\.line\.me\/gs\/M_052edqsq_GW\.png"/);
  assert.match(html, /img-src [^;]*https:\/\/qr-official\.line\.me/);
});
