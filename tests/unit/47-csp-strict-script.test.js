const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const actions = require('../../assets/js/actions.js');
const { createAppInstance } = require('../helpers/app-loader');

const cspMeta = () => /http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html)[1].replace(/\s+/g, ' ');
const directive = name => (new RegExp(`(?:^|;)\\s*${name}\\s+([^;]*)`).exec(cspMeta()) || [])[1] || '';
const inlineScripts = () => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);

describe('47. Strict CSP: no inline event handlers, hashed inline script only', () => {
    it('has no on*= event handler attributes in markup or rendered templates', () => {
        const found = html.match(/\son[a-z]+\s*=\s*["'\\]/gi) || [];
        assert.deepEqual(found, []);
    });

    it('drops unsafe-inline from script-src and blocks plugins', () => {
        assert.doesNotMatch(directive('script-src'), /'unsafe-inline'|'unsafe-eval'|'unsafe-hashes'/);
        assert.match(directive('object-src'), /^'none'\s*$/);
    });

    it('allows each inline script by an exact sha256 hash', () => {
        const scripts = inlineScripts();
        assert.ok(scripts.length >= 1);
        for (const code of scripts) {
            const hash = crypto.createHash('sha256').update(code, 'utf8').digest('base64');
            assert.ok(directive('script-src').includes(`'sha256-${hash}'`), 'stale CSP hash: run npm run csp:hash');
        }
    });

    it('loads the action dispatcher before the app script and publishes it', () => {
        assert.ok(html.indexOf('<script src="assets/js/actions.js"></script>') > 0);
        assert.ok(html.indexOf('assets/js/actions.js') < html.indexOf('<script>\n'));
        assert.ok(require('../../scripts/build-public.js').PUBLIC_FILES.includes('assets/js/actions.js'));
    });

    it('allowlists every action used by data-on-* attributes, and only real app functions', () => {
        const used = new Set();
        for (const m of html.matchAll(/data-on-[a-z]+="([^"]*)"/g)) {
            // `${htmlJsArg(x)}` runs while the template is built, not as an action.
            for (const name of m[1].matchAll(/(?<!\$\{)\b([A-Za-z_$][\w$]*)\s*\(/g)) used.add(name[1]);
        }
        assert.ok(used.size > 20);
        for (const name of used) assert.ok(actions.ALLOWED_ACTIONS.includes(name), `not allowlisted: ${name}`);
        const { app } = createAppInstance();
        for (const name of actions.ALLOWED_ACTIONS) assert.equal(typeof app[name], 'function', `missing app function: ${name}`);
    });
});

describe('47b. Action parser accepts calls with literal arguments only', () => {
    const parse = actions.parseActions;

    it('parses a sequence of calls with strings, numbers, event, this and this.value', () => {
        assert.deepEqual(parse(`closeMobileMenu(); openAuthModal('login');`), [
            { name: 'closeMobileMenu', args: [] },
            { name: 'openAuthModal', args: [{ value: 'login' }] }
        ]);
        assert.deepEqual(parse('changeQty("max_1", -1)'), [{ name: 'changeQty', args: [{ value: 'max_1' }, { value: -1 }] }]);
        assert.deepEqual(parse('selectCategory(\'all\', this)'), [{ name: 'selectCategory', args: [{ value: 'all' }, { ref: 'this' }] }]);
        assert.deepEqual(parse('autoSaveGasUrl(this.value)'), [{ name: 'autoSaveGasUrl', args: [{ ref: 'this.value' }] }]);
        assert.deepEqual(parse('handleLogin(event)'), [{ name: 'handleLogin', args: [{ ref: 'event' }] }]);
    });

    it('keeps an injection payload inside a JSON string argument as plain data', () => {
        const id = `max_1');alert(1);//"\\`;
        assert.deepEqual(parse(`addToCart(${JSON.stringify(id)})`), [{ name: 'addToCart', args: [{ value: id }] }]);
    });

    it('rejects anything that is not a plain call list', () => {
        for (const bad of ['alert(1)+x', 'a.b()', 'fn(x)', 'fn(1 + 1)', 'fn(`x`)', 'fn("a") fn("b")', 'fn(', 'this.onerror=null', 'fn(this.constructor)', '']) {
            assert.equal(parse(bad), null, bad);
        }
    });

    it('runs only allowlisted functions and passes element, event and value', () => {
        const calls = [];
        const scope = {
            addToCart: (...a) => calls.push(['addToCart', ...a]),
            closeQuizModal: () => calls.push(['closeQuizModal']),
            alert: () => calls.push(['alert'])
        };
        const el = { value: 'v' };
        const ev = { type: 'click' };
        assert.equal(actions.runActions('addToCart("x", this, event, this.value); closeQuizModal();', el, ev, scope), true);
        assert.deepEqual(calls, [['addToCart', 'x', el, ev, 'v'], ['closeQuizModal']]);
        calls.length = 0;
        assert.equal(actions.runActions('alert(1)', el, ev, scope), false);
        assert.equal(actions.runActions('addToCart("x"); alert(1)', el, ev, scope), false);
        assert.deepEqual(calls, []);
    });
});

describe('47c. Delegated events behave like the old inline handlers', () => {
    function makeDom() {
        const listeners = {};
        const doc = { addEventListener: (type, fn, capture) => { (listeners[type] ||= []).push({ fn, capture }); } };
        const fire = (type, target) => {
            const event = { type, target, cancelBubble: false, stopPropagation() { this.cancelBubble = true; } };
            for (const l of listeners[type] || []) l.fn(event);
            return event;
        };
        return { doc, fire, listeners };
    }
    function el(attrs, parent = null) {
        return { attrs, parentElement: parent, nodeType: 1, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }, removeAttribute(k) { delete this.attrs[k]; } };
    }

    it('runs the nearest handler then bubbles to ancestors until stopPropagation', () => {
        const calls = [];
        const scope = { openCartModal: () => calls.push('outer'), addToCart: (id, ev) => { calls.push(id); ev.stopPropagation(); }, closeMobileMenu: () => calls.push('inner') };
        const { doc, fire } = makeDom();
        actions.installActions(doc, scope);
        const outer = el({ 'data-on-click': 'openCartModal()' });
        const inner = el({ 'data-on-click': 'closeMobileMenu()' }, outer);
        fire('click', el({}, inner));
        assert.deepEqual(calls, ['inner', 'outer']);
        calls.length = 0;
        fire('click', el({ 'data-on-click': 'addToCart("a", event)' }, outer));
        assert.deepEqual(calls, ['a']);
    });

    it('swaps a broken image to its data-fallback once', () => {
        const { doc, fire, listeners } = makeDom();
        actions.installActions(doc, {});
        assert.ok(listeners.error.some(l => l.capture === true));
        const img = el({ 'data-fallback': 'max_1.jpg' });
        img.tagName = 'IMG';
        fire('error', img);
        assert.equal(img.src, 'max_1.jpg');
        assert.equal(img.getAttribute('data-fallback'), null);
        img.src = 'still-broken';
        fire('error', img);
        assert.equal(img.src, 'still-broken');
    });
});
