const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createGasInstance } = require('../helpers/gas-loader');

const read = (file) => fs.readFileSync(path.resolve(__dirname, '../..', file), 'utf8');
const post = (gas, token) => gas.doPost({
    postData: { contents: JSON.stringify({ token, to: 'victim@example.com', subject: 's', text: 't' }) }
}).getJson();

describe('14. Order mail relay secret never ships to clients', () => {
    for (const file of ['index.html', 'google_apps_script.js']) {
        it(`${file} contains no relay token literal`, () => {
            const source = read(file);
            assert.doesNotMatch(source, /SECRET_TOKEN\s*:/);
            assert.doesNotMatch(source, /gasToken\s*[:=]\s*['"`][^'"`]+['"`]/);
            assert.doesNotMatch(source, /(gasToken|tokenVal|tokenInput\.value)[^\n;]*\|\|\s*['"`][^'"`]+['"`]/);
            assert.doesNotMatch(source, /MAXMUXSIX_[A-Za-z0-9_!@#$%-]*(SEC|TOKEN|KEY)/);
        });
    }

    it('rejects every request while no token is configured', () => {
        const env = createGasInstance({ relayToken: null });
        for (const token of ['', undefined, 'null', 'anything-at-all']) {
            assert.strictEqual(post(env.gas, token).success, false);
        }
        assert.strictEqual(env.sentEmails.length, 0);
    });

    it('rejects a configured token that is too short to be safe', () => {
        const env = createGasInstance({ relayToken: 'short' });
        assert.strictEqual(post(env.gas, 'short').success, false);
        assert.strictEqual(env.sentEmails.length, 0);
    });

    it('rotateRelayToken stores a fresh secret, revokes the old one, and does not return it', () => {
        const env = createGasInstance();
        const before = env.properties.ORDER_RELAY_TOKEN;
        const result = env.gas.rotateRelayToken();
        const after = env.properties.ORDER_RELAY_TOKEN;
        assert.notStrictEqual(after, before);
        assert.ok(after.length >= 32);
        assert.ok(!JSON.stringify(result).includes(after));
        assert.strictEqual(post(env.gas, before).success, false);
        assert.strictEqual(post(env.gas, after).success, true);
    });
});
