const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildPublic, PUBLIC_FILES } = require('../../scripts/build-public.js');

const root = path.join(__dirname, '..', '..');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'mxs-public-'));
const listFiles = (dir, base = dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full, base) : [path.relative(base, full).split(path.sep).join('/')];
});

test('public build contains exactly the allowlist', () => {
    const out = path.join(tmp(), 'public');
    assert.deepEqual(buildPublic(root, out).sort(), [...PUBLIC_FILES].sort());
    assert.deepEqual(listFiles(out).sort(), [...PUBLIC_FILES].sort());
});

test('no server code, tests or docs are published', () => {
    for (const file of PUBLIC_FILES)
        assert.doesNotMatch(file, /^(supabase|tests|docs|scripts)\/|apps_script|package|\.sql$/);
});

test('every local file referenced by index.html and the mail templates is published', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const refs = [...html.matchAll(/(?:src|href|poster)=["']((?!https?:|data:|#|mailto:|tel:)[^"'?#$]+\.(?:js|css|jpg|png|mp4|txt))["']/g)].map(m => m[1]);
    const mailImages = Array.from({ length: 8 }, (_, i) => `max_${i + 1}.jpg`);
    assert.ok(refs.length > 5);
    for (const file of [...refs, ...mailImages]) assert.ok(PUBLIC_FILES.includes(file), file);
});

test('the build refuses to delete the project or its parent', () => {
    for (const out of [root, path.dirname(root)]) assert.throws(() => buildPublic(root, out), /Refusing/);
});

test('a rebuild removes files that are no longer listed', () => {
    const out = path.join(tmp(), 'public');
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'stale.txt'), 'old');
    buildPublic(root, out);
    assert.equal(fs.existsSync(path.join(out, 'stale.txt')), false);
});
