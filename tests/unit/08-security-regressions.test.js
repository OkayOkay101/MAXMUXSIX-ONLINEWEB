const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createAppInstance } = require('../helpers/app-loader');

describe('08. Untrusted data stays inert in rendered UI', () => {
    it('does not turn product image URLs or IDs into HTML event handlers', () => {
        const { app, getElement } = createAppInstance();
        app.renderItems([{
            id: `max_1');alert(1);//`,
            name: 'ข้าวหลาม', category: 'สูตร', desc: 'อร่อย', price: 45,
            stock: 2, image: `x" onload="alert(1)`
        }]);
        const html = getElement('productDisplayGrid').innerHTML;
        assert.doesNotMatch(html, /src="x" onload="alert\(1\)/);
        const handler = html.match(/class="btn-order" onclick="([^"]+)"/)[1]
            .replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
        let receivedId;
        vm.runInNewContext(handler, {
            addToCart: id => { receivedId = id; },
            alert: () => { throw new Error('injected code ran'); }
        });
        assert.strictEqual(receivedId, `max_1');alert(1);//`);
    });

    it('escapes product content in quiz results', () => {
        const { app, getElement } = createAppInstance();
        app.currentProducts = [{
            id: 'max_1', name: '<img src=x onerror=alert(1)>',
            category: 'สูตร', desc: '', tag: '<svg onload=alert(1)>',
            image: `x" onload="alert(1)`, price: 45, stock: 2
        }];
        app.showQuizResults();
        const html = getElement('quizResultArea').innerHTML;
        assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
        assert.doesNotMatch(html, /<svg onload=alert\(1\)>/);
        assert.doesNotMatch(html, /src="x" onload="alert\(1\)/);
    });

    it('escapes persisted cart and cross-sell product names', () => {
        const { app, getElement } = createAppInstance();
        app.cart = [{ id: 'max_1', name: '<img src=x onerror=alert(1)>', price: 45, qty: 1 }];
        app.currentProducts = [{
            id: 'max_2', name: '<svg onload=alert(1)>',
            price: 50, stock: 2, image: 'max_2.jpg'
        }];
        app.renderCartItems();
        assert.doesNotMatch(getElement('cartItemsContainer').innerHTML, /<img src=x onerror=alert\(1\)>/);
        assert.doesNotMatch(getElement('crossSellContainer').innerHTML, /<svg onload=alert\(1\)>/);
    });

    it('escapes toast content and subscriber email', () => {
        const { app, getElement } = createAppInstance();
        app.setTimeout = () => 1;
        app.showEmailToast('<img src=x onerror=alert(1)>');
        assert.doesNotMatch(getElement('emailToastArea').innerHTML, /<img src=x onerror=alert\(1\)>/);
        app.showSubscribeSuccessFeedback({ email: '<svg onload=alert(1)>' }, {});
        assert.doesNotMatch(getElement('subscribeSuccessBox').innerHTML, /<svg onload=alert\(1\)>/);
    });

    it('escapes order history and preserves safe receipt button behavior', () => {
        const { app, getElement } = createAppInstance();
        app.orders = [{
            id: `MAX-1');alert(1);//`, status: '<svg onload=alert(1)>',
            date: 'วันนี้', items: [{ name: 'ข้าวหลาม', qty: 1 }],
            total: '<img src=x onerror=alert(1)>'
        }];
        app.openOrderHistoryModal();
        const html = getElement('orderHistoryContainer').innerHTML;
        assert.doesNotMatch(html, /<svg onload=alert\(1\)>/);
        assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
        const handler = html.match(/onclick="([^"]+)"/)[1]
            .replace(/&quot;/g, '"').replace(/&#x27;/g, "'")
            .replace(/&#x2F;/g, '/').replace(/&amp;/g, '&');
        let receivedOrderId;
        vm.runInNewContext(handler, {
            closeOrderHistoryModal: () => {},
            openOrderReceiptModal: id => { receivedOrderId = id; },
            alert: () => { throw new Error('injected code ran'); }
        });
        assert.strictEqual(receivedOrderId, `MAX-1');alert(1);//`);
    });

    it('escapes stored email metadata in the inbox and preview status', () => {
        const { app, getElement } = createAppInstance();
        app.sentEmails = [{
            id: 'EML-1', to: 'customer@example.com', toName: '<svg onload=alert(1)>',
            subject: '<img src=x onerror=alert(1)>', date: 'วันนี้',
            promoCode: 'WELCOME10', dispatchStatus: '<svg onload=alert(1)>',
            htmlContent: '<p>สวัสดี</p>', isRead: false
        }];
        app.openEmailInboxModal();
        assert.doesNotMatch(getElement('inboxListContainer').innerHTML, /<svg onload=alert\(1\)>/);
        assert.doesNotMatch(getElement('inboxListContainer').innerHTML, /<img src=x onerror=alert\(1\)>/);
        app.openWelcomeEmailModal('EML-1');
        assert.doesNotMatch(getElement('emailMetaStatus').innerHTML, /<svg onload=alert\(1\)>/);
    });

    it('escapes stored item image URLs inside generated order email HTML', () => {
        const { app } = createAppInstance();
        const html = app.generateOrderSummaryHtml({
            id: 'MAX-1', date: 'วันนี้', status: 'ใหม่', name: 'ลูกค้า',
            phone: '0123', email: 'customer@example.com', address: 'กรุงเทพ',
            subtotal: 45, shippingCost: 0, discountAmount: 0, total: 45,
            items: [{ name: 'ข้าวหลาม', image: `x" onload="alert(1)`, price: 45, qty: 1 }]
        });
        assert.doesNotMatch(html, /src="x" onload="alert\(1\)/);
    });

    it('escapes account details in desktop and mobile navigation', () => {
        const { app, getElement } = createAppInstance();
        app.currentUser = {
            id: 'USR-1', name: '<img src=x onerror=alert(1)>',
            email: '<svg onload=alert(1)>'
        };
        app.renderAuthUI();
        assert.doesNotMatch(getElement('authNavArea').innerHTML, /<img src=x onerror=alert\(1\)>/);
        assert.doesNotMatch(getElement('mobileAuthArea').innerHTML, /<img src=x onerror=alert\(1\)>/);
        assert.doesNotMatch(getElement('mobileAuthArea').innerHTML, /<svg onload=alert\(1\)>/);
    });

    it('escapes recommended product data', () => {
        const { app, getElement } = createAppInstance();
        app.currentProducts = [{
            id: 'max_1', name: '<img src=x onerror=alert(1)>',
            image: `x" onload="alert(1)`, tag: '<svg onload=alert(1)>ขายดี',
            rating: '4.9', price: 45, stock: 1
        }];
        app.renderRecommendedProducts('', 'all');
        const html = getElement('recommendedSection').innerHTML;
        assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
        assert.doesNotMatch(html, /<svg onload=alert\(1\)>/);
        assert.doesNotMatch(html, /src="x" onload="alert\(1\)/);
    });

    it('does not interpret a stored Web3Forms key as HTML', () => {
        const { app, getElement } = createAppInstance();
        app.autoSaveWeb3FormsKey('<svg onload=alert(1)>');
        assert.doesNotMatch(getElement('web3formsKeyBadge').innerHTML, /<svg/);
    });

    it('shows legacy HTML-encoded names as readable text without enabling markup', () => {
        const { app, getElement } = createAppInstance();
        app.currentUser = { id: 'USR-1', name: 'Chef&#x27;s &amp; Co', email: 'chef@example.com' };
        app.renderAuthUI();
        assert.match(getElement('authNavArea').innerHTML, /Chef&#x27;s &amp; Co/);
        assert.doesNotMatch(getElement('authNavArea').innerHTML, /&amp;#x27;/);

        app.renderItems([{
            id: 'max_1', name: 'Chef&#x27;s &amp; Co', category: 'สูตร',
            desc: '&lt;img src=x onerror=alert(1)&gt;', price: 45,
            stock: 1, image: 'max_1.jpg'
        }]);
        const html = getElement('productDisplayGrid').innerHTML;
        assert.match(html, /Chef&#x27;s &amp; Co/);
        assert.doesNotMatch(html, /&amp;#x27;/);
        assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
    });

    it('keeps ordinary relative image paths working', () => {
        const { app, getElement } = createAppInstance();
        app.renderItems([{
            id: 'max_custom', name: 'ข้าวหลาม', category: 'สูตร',
            desc: 'อร่อย', price: 45, stock: 1,
            image: 'assets/custom-photo.webp'
        }]);
        assert.match(getElement('productDisplayGrid').innerHTML, /src="assets&#x2F;custom-photo\.webp"/);
    });

    it('shows legacy encoded names naturally in email inbox and preview', () => {
        const { app, getElement } = createAppInstance();
        app.sentEmails = [{
            id: 'EML-1', to: 'chef@example.com', toName: 'Chef&#x27;s',
            subject: 'ยินดีต้อนรับ Chef&#x27;s', date: 'วันนี้',
            promoCode: 'WELCOME10', htmlContent: '<p>สวัสดี</p>', isRead: false
        }];
        app.openEmailInboxModal();
        const html = getElement('inboxListContainer').innerHTML;
        assert.match(html, /Chef&#x27;s/);
        assert.doesNotMatch(html, /Chef&amp;#x27;s/);
        app.openWelcomeEmailModal('EML-1');
        assert.strictEqual(getElement('emailMetaSubject').textContent, "ยินดีต้อนรับ Chef's");
    });
});
