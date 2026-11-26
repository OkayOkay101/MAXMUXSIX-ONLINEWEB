const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const load = () => JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'vercel.json'), 'utf8'));

test('vercel serves the public build and does not auto deploy from git', () => {
    const cfg = load();
    assert.equal(cfg.framework, null);
    assert.equal(cfg.installCommand, '');
    assert.equal(cfg.buildCommand, 'node scripts/build-public.js');
    assert.equal(cfg.outputDirectory, 'public');
    assert.equal(cfg.git.deploymentEnabled, false);
});

test('framing and sniffing protection are real HTTP headers', () => {
    const rule = load().headers.find(r => r.source === '/(.*)');
    const headers = Object.fromEntries(rule.headers.map(h => [h.key, h.value]));
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.equal(headers['Content-Security-Policy'], "frame-ancestors 'none'");
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
});
