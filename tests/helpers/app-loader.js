const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const HTML_PATH = path.resolve(__dirname, '../../index.html');

/**
 * Creates an isolated mock browser environment and evaluates index.html script.
 */
function createAppInstance() {
    const rawHtml = fs.readFileSync(HTML_PATH, 'utf8');
    const scriptMatch = rawHtml.match(/<script>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
        throw new Error('Unable to find <script> block in index.html');
    }
    const scriptCode = scriptMatch[1];

    const store = {
        local: {},
        session: {}
    };

    const elements = {};

    function getOrCreateElement(id) {
        if (!elements[id]) {
            elements[id] = {
                id,
                value: '',
                _innerHTML: '',
                get innerHTML() {
                    return this._innerHTML;
                },
                set innerHTML(val) {
                    this._innerHTML = String(val);
                    this.children = [];
                },
                children: [],
                _textContent: '',
                get textContent() {
                    return this._textContent;
                },
                set textContent(val) {
                    this._textContent = String(val);
                },
                style: {},
                _attributes: {},
                _classes: new Set(),
                classList: {
                    add(c) { elements[id]._classes.add(c); },
                    remove(c) { elements[id]._classes.delete(c); },
                    contains(c) { return elements[id]._classes.has(c); },
                    toggle(c) {
                        if (elements[id]._classes.has(c)) {
                            elements[id]._classes.delete(c);
                        } else {
                            elements[id]._classes.add(c);
                        }
                    }
                },
                setAttribute(k, v) { this._attributes[k] = String(v); },
                getAttribute(k) { return this._attributes[k] || null; },
                removeAttribute(k) { delete this._attributes[k]; },
                appendChild(child) {
                    this.children.push(child);
                    this._innerHTML += (child.outerHTML || child.innerHTML || '');
                },
                remove() {},
                click() {},
                focus() { this._focused = true; },
                scrollIntoView() { this._scrolled = true; }
            };
        }
        return elements[id];
    }

    // Pre-populate template elements from index.html if needed
    const orderReceiptMatch = rawHtml.match(/<template id="orderReceiptTemplate">([\s\S]*?)<\/template>/);
    if (orderReceiptMatch) {
        const tmpl = getOrCreateElement('orderReceiptTemplate');
        tmpl.innerHTML = orderReceiptMatch[1];
    }

    const welcomeEmailMatch = rawHtml.match(/<template id="welcomeEmailTemplate">([\s\S]*?)<\/template>/);
    if (welcomeEmailMatch) {
        const tmpl = getOrCreateElement('welcomeEmailTemplate');
        tmpl.innerHTML = welcomeEmailMatch[1];
    }

    const sandbox = {
        console,
        Date,
        Math,
        JSON,
        Array,
        Object,
        String,
        Number,
        Boolean,
        RegExp,
        Set,
        Map,
        TextEncoder,
        TextDecoder,
        crypto: {
            subtle: {
                digest: async (algo, data) => {
                    const hash = crypto.createHash('sha256');
                    hash.update(Buffer.from(data));
                    return hash.digest().buffer;
                }
            }
        },
        setTimeout: (fn) => { fn(); return 1; },
        clearTimeout: () => {},
        localStorage: {
            getItem: (k) => (Object.prototype.hasOwnProperty.call(store.local, k) ? store.local[k] : null),
            setItem: (k, v) => { store.local[k] = String(v); },
            removeItem: (k) => { delete store.local[k]; },
            clear: () => { store.local = {}; }
        },
        sessionStorage: {
            getItem: (k) => (Object.prototype.hasOwnProperty.call(store.session, k) ? store.session[k] : null),
            setItem: (k, v) => { store.session[k] = String(v); },
            removeItem: (k) => { delete store.session[k]; },
            clear: () => { store.session = {}; }
        },
        document: {
            getElementById: (id) => getOrCreateElement(id),
            querySelectorAll: () => [],
            querySelector: (sel) => getOrCreateElement(sel.replace(/^[.#]/, '')),
            createElement: (tag) => getOrCreateElement('elem_' + Math.random().toString(36).substring(2)),
            body: getOrCreateElement('body')
        },
        URL,
        URLSearchParams,
        location: {
            search: '',
            hash: '',
            href: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/'
        },
        navigator: {
            userAgent: 'NodeTestRunner/1.0 (Windows NT 10.0; Win64; x64)'
        },
        window: {
            scrollTo: () => {},
            location: {
                search: '',
                hash: '',
                href: 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/'
            }
        },
        alert: () => {},
        confirm: () => true,
        prompt: () => '1234'
    };
    sandbox.window.location = sandbox.location;
    sandbox.window.navigator = sandbox.navigator;
    sandbox.window = sandbox;

    const bridgeCode = `
globalThis.__getAppState = () => ({
    get cart() { return cart; },
    set cart(v) { cart = v; },
    get appliedDiscountRate() { return appliedDiscountRate; },
    set appliedDiscountRate(v) { appliedDiscountRate = v; },
    get currentProducts() { return currentProducts; },
    set currentProducts(v) { currentProducts = v; },
    get orders() { return orders; },
    set orders(v) { orders = v; },
    get sentEmails() { return sentEmails; },
    set sentEmails(v) { sentEmails = v; },
    get currentUser() { return currentUser; },
    set currentUser(v) { currentUser = v; },
    get activeCategory() { return activeCategory; },
    set activeCategory(v) { activeCategory = v; },
    get isAdminMode() { return isAdminMode; },
    set isAdminMode(v) { isAdminMode = v; },
    get RATE_LIMITS() { return RATE_LIMITS; },
    get quizAnswers() { return quizAnswers; },
    set quizAnswers(v) { quizAnswers = v; },
    get quizQuestions() { return quizQuestions; }
});
`;

    vm.createContext(sandbox);
    vm.runInContext(scriptCode + '\n' + bridgeCode, sandbox);

    const state = sandbox.__getAppState();

    // Create a proxy so accessing app.cart, app.appliedDiscountRate, etc. works seamlessly
    const appProxy = new Proxy(sandbox, {
        get(target, prop) {
            if (prop in state) {
                return state[prop];
            }
            return target[prop];
        },
        set(target, prop, value) {
            if (prop in state) {
                state[prop] = value;
                return true;
            }
            target[prop] = value;
            return true;
        }
    });

    return {
        app: appProxy,
        state,
        store,
        elements,
        getElement: (id) => getOrCreateElement(id)
    };
}

module.exports = {
    createAppInstance
};
