const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('09. Storefront & LINE Official Account Integration (Deep Link, QR Modal, Store Navigation)', () => {
    let app;
    let getElement;

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        getElement = instance.getElement;
    });

    describe('Storefront Navigation & QR Modal Controls', () => {
        it('should scroll to #storeContactSection and close mobile drawer if open', () => {
            const section = getElement('storeContactSection');
            let scrolled = false;
            section.scrollIntoView = (opts) => {
                if (opts && opts.behavior === 'smooth') scrolled = true;
            };

            const drawer = getElement('mobileMenuDrawer');
            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), true);

            app.scrollToStoreContact();

            assert.strictEqual(drawer.classList.contains('active'), false);
            assert.strictEqual(scrolled, true);
        });

        it('should open and close LINE QR code modal properly', () => {
            const modal = getElement('lineQrModal');
            assert.strictEqual(modal.classList.contains('active'), false);

            app.openLineQrModal();
            assert.strictEqual(modal.classList.contains('active'), true);

            app.closeLineQrModal();
            assert.strictEqual(modal.classList.contains('active'), false);
        });
    });

    describe('LINE OA Welcome Banner Lifecycle', () => {
        it('should display the LINE welcome banner after header and be dismissible', () => {
            const header = getElement('header');
            const parent = getElement('appRoot');
            header.parentNode = parent;
            parent.insertBefore = (child, next) => {
                parent.children.push(child);
            };

            app.document.querySelector = (sel) => {
                if (sel === 'header') return header;
                return getElement(sel.replace(/^[.#]/, ''));
            };

            app.showLineWelcomeBanner();

            const banner = getElement('lineWelcomeBanner');
            assert.strictEqual(banner.id, 'lineWelcomeBanner');
            assert.match(banner.innerHTML, /LINE Official Account/);
            assert.match(banner.innerHTML, /WELCOME10/);

            // Dismiss
            let removed = false;
            banner.remove = () => { removed = true; };
            app.dismissLineBanner();
            assert.strictEqual(removed, true);
        });

        it('should not create duplicate banners if showLineWelcomeBanner is called again', () => {
            const header = getElement('header');
            const parent = getElement('appRoot');
            header.parentNode = parent;
            header.nextSibling = null;
            let insertCount = 0;
            parent.insertBefore = (child, next) => {
                insertCount++;
                parent.children.push(child);
            };
            app.document.querySelector = (sel) => {
                if (sel === 'header') return header;
                return getElement(sel.replace(/^[.#]/, ''));
            };

            // First call attaches banner
            app.showLineWelcomeBanner();
            assert.strictEqual(insertCount, 1);

            // Second call when banner already exists and is attached
            app.showLineWelcomeBanner();
            assert.strictEqual(insertCount, 1); // Should not insert again
        });
    });

    describe('LINE Deep Link Generation & Select Box', () => {
        it('should populate #lineProductSelect with options for each product in currentProducts', () => {
            const select = getElement('lineProductSelect');
            app.currentProducts = [
                { id: 'prod_1', name: 'ข้าวหลามถั่วดำ', price: 45, category: 'สูตรเตาถ่านแท้' },
                { id: 'prod_2', name: 'ข้าวหลามมะพร้าวอ่อน', price: 55, category: 'ไส้ฟิวชั่นยอดฮิต' }
            ];

            app.populateLineProductSelect();

            assert.strictEqual(select.children.length, 3); // 1 default + 2 products
            assert.strictEqual(select.children[0].value, '');
            assert.strictEqual(select.children[1].value, 'prod_1');
            assert.match(select.children[1].textContent, /ข้าวหลามถั่วดำ/);
            assert.strictEqual(select.children[2].value, 'prod_2');
            assert.match(select.children[2].textContent, /ข้าวหลามมะพร้าวอ่อน/);
        });

        it('should format generated LINE URL with product parameter when product is selected', () => {
            const select = getElement('lineProductSelect');
            const preview = getElement('generatedLineUrlPreview');
            select.value = 'max_2';

            app.updateGeneratedLineLink();

            assert.match(preview.textContent, /\?product=max_2&from=line/);
        });

        it('should format generated LINE URL with from=line only when no product is selected', () => {
            const select = getElement('lineProductSelect');
            const preview = getElement('generatedLineUrlPreview');
            select.value = '';

            app.updateGeneratedLineLink();

            assert.match(preview.textContent, /\?from=line/);
            assert.doesNotMatch(preview.textContent, /product=/);
        });

        it('should copy product deep link to clipboard via copyLineProductLink', async () => {
            let copiedText = '';
            app.navigator.clipboard = {
                writeText: async (text) => {
                    copiedText = text;
                    return Promise.resolve();
                }
            };

            app.currentProducts = [
                { id: 'max_special', name: 'ข้าวหลามเผือกหอม', price: 50, category: 'สูตรเตาถ่านแท้' }
            ];

            let toastMessage = '';
            app.showEmailToast = (msg) => { toastMessage = msg; };

            app.copyLineProductLink('max_special');

            // Wait for microtask / Promise tick
            await new Promise(resolve => setImmediate(resolve));

            assert.match(copiedText, /\?product=max_special&from=line/);
            assert.match(toastMessage, /ข้าวหลามเผือกหอม/);
        });
    });

    describe('LINE Deep Link Highlighting (highlightLineProduct)', () => {
        it('should add line-selected-pulse class and badge to target product card', () => {
            app.currentProducts = [
                { id: 'max_lava', name: 'ข้าวหลามลาวา', price: 70, category: 'ไส้ฟิวชั่นยอดฮิต' }
            ];

            const cardElem = getElement('product-card-max_lava');
            const cardBody = getElement('card-body-max_lava');
            cardElem.querySelector = (sel) => {
                if (sel === '.card-body') return cardBody;
                if (sel === '.line-oa-pick-badge') return null;
                return null;
            };

            let scrolled = false;
            cardElem.scrollIntoView = (opts) => {
                if (opts && opts.block === 'center') scrolled = true;
            };

            let insertedBadge = null;
            cardBody.insertBefore = (elem) => {
                insertedBadge = elem;
            };

            // highlightLineProduct uses setTimeout(..., 600)
            app.setTimeout = (fn) => fn();

            app.highlightLineProduct('max_lava');

            assert.strictEqual(cardElem.classList.contains('line-selected-pulse'), true);
            assert.strictEqual(scrolled, true);
            assert.notStrictEqual(insertedBadge, null);
            assert.strictEqual(insertedBadge.className, 'line-oa-pick-badge');
            assert.match(insertedBadge.innerHTML, /เมนูที่คุณเลือกจาก LINE/);
        });

        it('should reset activeCategory to "all" if current filtered category does not match product', () => {
            app.currentProducts = [
                { id: 'max_charcoal', name: 'ข้าวหลามถั่วดำ', price: 45, category: 'สูตรเตาถ่านแท้' }
            ];
            app.activeCategory = 'ไส้ฟิวชั่นยอดฮิต';

            let filtersApplied = false;
            app.applyFilters = () => { filtersApplied = true; };
            app.setTimeout = (fn) => fn();

            const cardElem = getElement('product-card-max_charcoal');
            cardElem.querySelector = () => null;

            app.highlightLineProduct('max_charcoal');

            assert.strictEqual(app.activeCategory, 'all');
            assert.strictEqual(filtersApplied, true);
        });
    });

    describe('URL Query Parameter Routing (handleUrlParametersOnLoad)', () => {
        it('should show LINE welcome banner when ?from=line is in URL', () => {
            app.window.location.search = '?from=line';
            let welcomeBannerShown = false;
            app.showLineWelcomeBanner = () => { welcomeBannerShown = true; };

            app.handleUrlParametersOnLoad();

            assert.strictEqual(welcomeBannerShown, true);
        });

        it('should highlight product when ?product=max_1 is in URL', () => {
            app.window.location.search = '?product=max_1';
            let highlightedId = null;
            app.highlightLineProduct = (id) => { highlightedId = id; };

            app.handleUrlParametersOnLoad();

            assert.strictEqual(highlightedId, 'max_1');
        });

        it('should scroll to store contact section when ?action=store is in URL', () => {
            app.window.location.search = '?action=store';
            app.setTimeout = (fn) => fn();
            let storeScrolled = false;
            app.scrollToStoreContact = () => { storeScrolled = true; };

            app.handleUrlParametersOnLoad();

            assert.strictEqual(storeScrolled, true);
        });
    });
});
