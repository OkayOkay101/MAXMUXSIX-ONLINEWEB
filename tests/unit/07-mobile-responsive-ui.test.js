const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('07. Mobile Responsive & UI State (updateCartCounter, toggleMobileMenu, closeMobileMenu, focusSearch)', () => {
    let app;
    let getElement;

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        getElement = instance.getElement;

        app.cart.length = 0;
    });

    describe('Dual Cart Counter Synchronization (Desktop & Mobile Dock)', () => {
        it('should update both #cartCount (desktop) and #cartCountBottom (mobile) to total item quantity', () => {
            app.cart.push(
                { id: '1', name: 'ข้าวหลาม A', price: 45, qty: 2 },
                { id: '2', name: 'ข้าวหลาม B', price: 50, qty: 3 }
            );

            app.updateCartCounter();

            const topCount = getElement('cartCount').textContent;
            const bottomCount = getElement('cartCountBottom').textContent;

            assert.strictEqual(topCount, '5');
            assert.strictEqual(bottomCount, '5');
        });

        it('should set both badges to 0 when cart is emptied', () => {
            app.updateCartCounter();

            assert.strictEqual(getElement('cartCount').textContent, '0');
            assert.strictEqual(getElement('cartCountBottom').textContent, '0');
        });
    });

    describe('Mobile Menu Drawer (toggleMobileMenu & closeMobileMenu)', () => {
        it('should toggle active class on mobileMenuDrawer and update toggle button icon', () => {
            const drawer = getElement('mobileMenuDrawer');
            const toggleBtn = getElement('btnMobileMenuToggle');

            assert.strictEqual(drawer.classList.contains('active'), false);

            // Open drawer
            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), true);
            assert.strictEqual(toggleBtn.textContent, '✕');

            // Close drawer
            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), false);
            assert.strictEqual(toggleBtn.textContent, '☰');
        });

        it('should close mobile drawer explicitly with closeMobileMenu', () => {
            const drawer = getElement('mobileMenuDrawer');
            const toggleBtn = getElement('btnMobileMenuToggle');

            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), true);

            app.closeMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), false);
            assert.strictEqual(toggleBtn.textContent, '☰');
        });
    });

    describe('Mobile Dock Actions (scrollToTop & focusSearch)', () => {
        it('should close mobile drawer when focusSearch is called and focus the search input', () => {
            const drawer = getElement('mobileMenuDrawer');
            const searchInput = getElement('filterKeyword');

            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), true);

            app.focusSearch();

            assert.strictEqual(drawer.classList.contains('active'), false);
            assert.strictEqual(searchInput._focused, true);
            assert.strictEqual(searchInput._scrolled, true);
        });

        it('should close mobile drawer when scrollToTop is called', () => {
            const drawer = getElement('mobileMenuDrawer');
            let scrolled = false;
            app.window.scrollTo = (opts) => {
                if (opts && opts.top === 0) scrolled = true;
            };

            app.toggleMobileMenu();
            assert.strictEqual(drawer.classList.contains('active'), true);

            app.scrollToTop();
            assert.strictEqual(drawer.classList.contains('active'), false);
            assert.strictEqual(scrolled, true);
        });
    });

    describe('Admin Controls Synchronization (Desktop Header & Mobile Drawer)', () => {
        it('should hide add-product buttons on both desktop and mobile drawer when not in admin mode', () => {
            app.isAdminMode = false;
            app.renderAdminControls();

            const desktopBtn = getElement('btnHeaderAddProduct');
            const mobileBtn = getElement('btnMobileAddProduct');

            assert.strictEqual(desktopBtn.style.display, 'none');
            assert.strictEqual(mobileBtn.style.display, 'none');
        });

        it('should show add-product buttons on both desktop and mobile drawer when admin mode is enabled', () => {
            app.isAdminMode = true;
            app.renderAdminControls();

            const desktopBtn = getElement('btnHeaderAddProduct');
            const mobileBtn = getElement('btnMobileAddProduct');

            assert.strictEqual(desktopBtn.style.display, 'inline-flex');
            assert.strictEqual(mobileBtn.style.display, 'flex');
        });
    });
});
