const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', '..', 'index.html'), 'utf8');

test('index.html does not hardcode a Google Apps Script deployment URL', () => {
    // A /macros/s/<id>/exec URL is a bearer secret for the mail relay.
    assert.doesNotMatch(html, /https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec/);
    assert.doesNotMatch(html, /DEFAULT_GAS_URL/);
});

test('email settings default to an empty gasUrl that an admin must configure', () => {
    assert.match(html, /gasUrl:\s*''/);
    assert.doesNotMatch(html, /gasUrl:\s*DEFAULT_GAS_URL/);
});