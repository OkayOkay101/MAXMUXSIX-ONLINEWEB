const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SITE = 'https://maxmuxsix-demo.vercel.app/';
const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');

test('the auth redirect, auth mail and relay all use the Vercel address exactly', () => {
    assert.ok(read('auth-config.js').includes(`redirectUrl: '${SITE}'`));
    assert.ok(read('supabase/functions/send-auth-email/messages.mjs').includes(`SITE_URL = '${SITE}'`));
    assert.ok(read('supabase/functions/send-auth-email/relay.mjs').includes(`config.siteUrl === '${SITE}' &&`));
});

test('no shipped file still points at the old GitHub Pages address', () => {
    for (const file of ['auth-config.js', 'index.html', 'subscribe_welcome_email.html',
        'supabase/functions/send-auth-email/messages.mjs', 'supabase/functions/send-auth-email/relay.mjs'])
        assert.doesNotMatch(read(file), /okayokay101\.github\.io/i, file);
});
