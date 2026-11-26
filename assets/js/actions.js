// Runs data-on-<event>="fn('a', 1); other(this, event)" without inline JavaScript, so CSP needs no 'unsafe-inline'.
// Only plain calls to allowlisted functions, with literal or this/event/this.value arguments, are accepted.
(function (root) {
    'use strict';

    var ALLOWED_ACTIONS = Object.freeze([
        'acceptCookieConsent', 'addToCart', 'applyCoupon', 'applyFilters', 'autoSaveGasUrl', 'autoSaveWeb3FormsKey',
        'backToCart', 'backupToJson', 'calculateTotalOrder', 'cancelMemberEdit', 'changeQty', 'closeAuthModal',
        'closeCartModal', 'closeCrudModal', 'closeEmailInboxModal', 'closeEmailToast', 'closeLineQrModal',
        'closeMembersModal', 'closeMobileMenu', 'closeOrderHistoryModal', 'closeOrderReceiptModal',
        'closePaymentModal', 'closeQuizModal', 'closeRealEmailSettingsModal', 'closeReferralModal',
        'closeSubscribeModal', 'closeWelcomeEmailModal', 'confirmOrder', 'copyCurrentGeneratedLineLink',
        'copyGasScriptToClipboard', 'copyLineProductLink', 'copyReferralCode', 'copyWelcomeCoupon', 'deleteProduct',
        'dismissCookieConsent', 'dismissLineBanner', 'editProduct', 'focusSearch', 'handleInviteMember',
        'handleLogin', 'handleLogout', 'handlePasswordReset', 'handleQuickSubscribe', 'handleRegister',
        'handleSetPassword', 'handleUpdateMember', 'loadMembersNextPage', 'loadMembersPrevPage',
        'nextQuizStep', 'openAuthModal', 'openCartModal', 'openCrudModal', 'openEmailInboxModal', 'openJsonUpload',
        'openLineQrModal', 'openMembersModal', 'openOrderHistoryModal', 'openOrderReceiptModal',
        'openOrderReceiptModalFromEmailId', 'openQuizModal', 'openRealEmailSettingsModal', 'openReferralModal',
        'openStoreMap', 'openSubscribeModal', 'openWelcomeEmailModal', 'prevQuizStep', 'previewImageUpload',
        'printOrderReceipt', 'printWelcomeEmail', 'proceedToPayment', 'promptAdminMode', 'renderCartItems',
        'resendCurrentEmailReal', 'resendCurrentOrderEmail', 'resetToDefault', 'restartQuiz', 'restoreFromJson',
        'saveEmailSettings', 'saveProduct', 'scrollToProducts', 'scrollToStoreContact', 'scrollToTop',
        'selectCategory', 'selectQuizOption', 'setEmailViewMode', 'setReceiptViewMode', 'switchAuthTab',
        'switchProviderView', 'testGasConnection', 'testSendRealEmailFromSettings', 'toggleMobileMenu',
        'updateGeneratedLineLink'
    ]);
    var EVENTS = ['click', 'submit', 'change', 'input'];

    var IDENT = /^[A-Za-z_$][\w$]*/;
    var NUMBER = /^-?\d+(?:\.\d+)?/;
    var DQ = /^"(?:[^"\\\u0000-\u001f]|\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4})*"/;
    var SQ = /^'[^'\\\r\n]*'/;
    var REF = /^(?:this\.value|this|event)(?![\w$.])/;

    // Returns [{ name, args: [{ value } | { ref }] }] or null when the text is anything but a call list.
    function parseActions(source) {
        if (typeof source !== 'string') return null;
        var s = source.trim();
        var calls = [];
        var m;
        while (s) {
            m = IDENT.exec(s);
            if (!m) return null;
            var call = { name: m[0], args: [] };
            s = s.slice(m[0].length).replace(/^\s+/, '');
            if (s[0] !== '(') return null;
            s = s.slice(1).replace(/^\s+/, '');
            if (s[0] === ')') s = s.slice(1);
            else {
                while (true) {
                    if ((m = REF.exec(s))) call.args.push({ ref: m[0] });
                    else if ((m = DQ.exec(s))) call.args.push({ value: JSON.parse(m[0]) });
                    else if ((m = SQ.exec(s))) call.args.push({ value: m[0].slice(1, -1) });
                    else if ((m = NUMBER.exec(s))) call.args.push({ value: Number(m[0]) });
                    else return null;
                    s = s.slice(m[0].length).replace(/^\s+/, '');
                    if (s[0] === ',') { s = s.slice(1).replace(/^\s+/, ''); continue; }
                    if (s[0] === ')') { s = s.slice(1); break; }
                    return null;
                }
            }
            calls.push(call);
            s = s.replace(/^\s+/, '');
            if (!s) break;
            if (s[0] !== ';') return null;
            s = s.slice(1).replace(/^\s+/, '');
        }
        return calls.length ? calls : null;
    }

    // Runs every call, or none when any call is unknown. Returns whether it ran.
    function runActions(source, element, event, scope) {
        var calls = parseActions(source);
        if (!calls) return false;
        for (var i = 0; i < calls.length; i++) {
            if (ALLOWED_ACTIONS.indexOf(calls[i].name) < 0 || typeof scope[calls[i].name] !== 'function') return false;
        }
        calls.forEach(function (call) {
            scope[call.name].apply(null, call.args.map(function (arg) {
                if (!('ref' in arg)) return arg.value;
                return arg.ref === 'event' ? event : arg.ref === 'this' ? element : element.value;
            }));
        });
        return true;
    }

    function installActions(doc, scope) {
        EVENTS.forEach(function (type) {
            var attr = 'data-on-' + type;
            doc.addEventListener(type, function (event) {
                for (var node = event.target; node && !event.cancelBubble; node = node.parentElement) {
                    if (node.nodeType !== 1) continue;
                    var source = node.getAttribute(attr);
                    if (source === null) continue;
                    if (!runActions(source, node, event, scope) && root.console) root.console.error('Blocked action: ' + source);
                }
            });
        });
        // Image errors do not bubble: listen in the capture phase. One swap only, so a broken fallback cannot loop.
        doc.addEventListener('error', function (event) {
            var img = event.target;
            if (!img || img.tagName !== 'IMG') return;
            var fallback = img.getAttribute('data-fallback');
            if (fallback === null) return;
            img.removeAttribute('data-fallback');
            img.src = fallback;
        }, true);
    }

    var api = { ALLOWED_ACTIONS: ALLOWED_ACTIONS, parseActions: parseActions, runActions: runActions, installActions: installActions };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else {
        root.MaxmuxsixActions = api;
        installActions(root.document, root);
    }
})(typeof window !== 'undefined' ? window : globalThis);
