const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('the photo of an unrelated person is gone and the store image is our own drawing', () => {
    assert.doesNotMatch(html, /OIP-625661642/);
    assert.ok(!fs.existsSync(path.join(root, 'OIP-625661642.jpg')));
    assert.ok(html.includes('src="store_front.jpg"'));
    assert.ok(fs.existsSync(path.join(root, 'store_front.jpg')));
});

// SHA-256 prefixes of the files that carried other shops' logos or captions.
test('third-party product pictures have been replaced', () => {
    const banned = JSON.parse(fs.readFileSync(path.join(__dirname, 'removed-images.json'), 'utf8'));
    assert.strictEqual(banned.length, 4);
    for (const name of ['max_3.jpg', 'max_5.jpg', 'max_8.jpg', 'store_front.jpg']) {
        const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
        assert.ok(!banned.includes(hash), name);
    }
});
