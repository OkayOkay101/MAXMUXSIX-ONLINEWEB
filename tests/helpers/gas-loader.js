const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const GAS_PATH = path.resolve(__dirname, '../../google_apps_script.js');

const TEST_RELAY_TOKEN = 'unit-test-only-relay-value-not-a-real-secret';

/**
 * Creates an isolated mock Google Apps Script environment and evaluates google_apps_script.js.
 */
function createGasInstance(customOptions = {}) {
    const rawCode = fs.readFileSync(GAS_PATH, 'utf8');

    const sentEmails = [];
    let remainingDailyQuota = customOptions.initialQuota !== undefined ? customOptions.initialQuota : 100;
    let lockAcquired = true;

    const mockLock = {
        tryLock: (ms) => lockAcquired,
        releaseLock: () => {}
    };

    const mockLockService = {
        getScriptLock: () => mockLock
    };

    const mockMailApp = {
        getRemainingDailyQuota: () => remainingDailyQuota,
        sendEmail: (opts) => {
            if (remainingDailyQuota < 1) {
                throw new Error('Service invoked too many times for one day: email.');
            }
            remainingDailyQuota--;
            sentEmails.push(opts);
        }
    };

    const mockContentService = {
        MimeType: {
            JSON: 'application/json'
        },
        createTextOutput: (text) => ({
            _text: text,
            _mimeType: null,
            setMimeType(mime) {
                this._mimeType = mime;
                return this;
            },
            getContent() {
                return this._text;
            },
            getMimeType() {
                return this._mimeType;
            },
            getJson() {
                return JSON.parse(this._text);
            }
        })
    };

    const relayToken = customOptions.relayToken !== undefined ? customOptions.relayToken : TEST_RELAY_TOKEN;
    const properties = relayToken === null ? {} : { ORDER_RELAY_TOKEN: relayToken };
    let uuidCounter = 0;

    const mockPropertiesService = {
        getScriptProperties: () => ({
            getProperty: (key) => (key in properties ? properties[key] : null),
            setProperty: (key, value) => { properties[key] = value; }
        })
    };

    const mockUtilities = {
        getUuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`
    };

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
        LockService: mockLockService,
        MailApp: mockMailApp,
        ContentService: mockContentService,
        PropertiesService: mockPropertiesService,
        Utilities: mockUtilities
    };

    vm.createContext(sandbox);
    vm.runInContext(rawCode, sandbox);

    return {
        gas: sandbox,
        sentEmails,
        properties,
        setQuota: (q) => { remainingDailyQuota = q; },
        setLockAcquired: (v) => { lockAcquired = v; }
    };
}

module.exports = {
    TEST_RELAY_TOKEN,
    createGasInstance
};
