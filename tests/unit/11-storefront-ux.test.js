const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('11. Storefront UX Enhancements (Sort, Stock Badges, Quick Toast & Floating Cart)', () => {
    let app;
    let getElement;

    const mockCatalog = [
        { id: 'p1', name: 'ข้าวหลามถั่วดำเตาถ่าน', category: 'สูตรเตาถ่านแท้', desc: 'รสชาติดั้งเดิม', price: 45, stock: 20 },
        { id: 'p2', name: 'ข้าวหลามสังขยาโบราณ', category: 'รสพรีเมียม', desc: 'สังขยาหวานมัน', price: 65, stock: 3 },
        { id: 'p3', name: 'ข้าวหลามช็อตไฟลุก', category: 'เมนูช็อตไฟลุก', desc: 'สูตรเผ็ดร้อนพิเศษ', price: 55, stock: 12 }
    ];

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        getElement = instance.getElement;

        app.currentProducts = [...mockCatalog];
        app.cart = [];
        app.activeCategory = 'all';
        getElement('filterKeyword').value = '';
    });

    describe('Product Sorting (filterSort)', () => {
        it('should sort products by price ascending when price-asc is selected', () => {
            const sortElem = getElement('filterSort');
            sortElem.value = 'price-asc';

            app.applyFilters();
            const gridHtml = getElement('productDisplayGrid').innerHTML;

            const idxP1 = gridHtml.indexOf('ข้าวหลามถั่วดำเตาถ่าน'); // 45
            const idxP3 = gridHtml.indexOf('ข้าวหลามช็อตไฟลุก');      // 55
            const idxP2 = gridHtml.indexOf('ข้าวหลามสังขยาโบราณ');   // 65

            assert.ok(idxP1 !== -1 && idxP3 !== -1 && idxP2 !== -1);
            assert.ok(idxP1 < idxP3, 'p1 (45) should appear before p3 (55)');
            assert.ok(idxP3 < idxP2, 'p3 (55) should appear before p2 (65)');
        });

        it('should sort products by price descending when price-desc is selected', () => {
            const sortElem = getElement('filterSort');
            sortElem.value = 'price-desc';

            app.applyFilters();
            const gridHtml = getElement('productDisplayGrid').innerHTML;

            const idxP2 = gridHtml.indexOf('ข้าวหลามสังขยาโบราณ');   // 65
            const idxP3 = gridHtml.indexOf('ข้าวหลามช็อตไฟลุก');      // 55
            const idxP1 = gridHtml.indexOf('ข้าวหลามถั่วดำเตาถ่าน'); // 45

            assert.ok(idxP2 < idxP3, 'p2 (65) should appear before p3 (55)');
            assert.ok(idxP3 < idxP1, 'p3 (55) should appear before p1 (45)');
        });

        it('should sort products by stock descending when stock-desc is selected', () => {
            const sortElem = getElement('filterSort');
            sortElem.value = 'stock-desc';

            app.applyFilters();
            const gridHtml = getElement('productDisplayGrid').innerHTML;

            const idxP1 = gridHtml.indexOf('ข้าวหลามถั่วดำเตาถ่าน'); // 20
            const idxP3 = gridHtml.indexOf('ข้าวหลามช็อตไฟลุก');      // 12
            const idxP2 = gridHtml.indexOf('ข้าวหลามสังขยาโบราณ');   // 3

            assert.ok(idxP1 < idxP3, 'p1 (stock 20) should appear before p3 (stock 12)');
            assert.ok(idxP3 < idxP2, 'p3 (stock 12) should appear before p2 (stock 3)');
        });
    });

    describe('Stock Badges & Visual Cues', () => {
        it('should display "พร้อมส่ง" and stock-available class when stock > 5', () => {
            app.renderItems([mockCatalog[0]]); // stock: 20
            const gridHtml = getElement('productDisplayGrid').innerHTML;

            assert.ok(gridHtml.includes('stock-available'));
            assert.ok(gridHtml.includes('พร้อมส่ง'));
            assert.ok(gridHtml.includes('คงเหลือ 20 กระบอก'));
        });

        it('should display "ใกล้หมด" and stock-low warning class when stock <= 5', () => {
            app.renderItems([mockCatalog[1]]); // stock: 3
            const gridHtml = getElement('productDisplayGrid').innerHTML;

            assert.ok(gridHtml.includes('stock-low'));
            assert.ok(gridHtml.includes('ใกล้หมด'));
            assert.ok(gridHtml.includes('คงเหลือ 3 กระบอก'));
        });
    });

    describe('Quick Cart Toast Notification', () => {
        it('should render toast notification element and show message when showCartToast is called', () => {
            app.setTimeout = () => 1; // Prevent immediate dismissal in sync mock
            app.showCartToast('เพิ่มสินค้าลงตะกร้าแล้ว');
            const toastElem = getElement('cartToastNotification');

            assert.ok(toastElem);
            assert.ok(toastElem.innerHTML.includes('เพิ่มสินค้าลงตะกร้าแล้ว'));
            assert.ok(toastElem.classList.contains('show'));
        });

        it('should trigger toast notification upon adding item to cart', () => {
            app.setTimeout = () => 1; // Prevent immediate dismissal in sync mock
            app.addToCart('p1');
            const toastElem = getElement('cartToastNotification');

            assert.ok(toastElem);
            assert.ok(toastElem.innerHTML.includes('ข้าวหลามถั่วดำเตาถ่าน'));
            assert.ok(toastElem.classList.contains('show'));
        });
    });

    describe('Floating Mobile Cart Pill', () => {
        it('should update mobile floating cart badge and total amount when cart is updated', () => {
            const floatCart = getElement('floatingMobileCart');
            const floatBadge = getElement('floatCartBadge');
            const floatTotal = getElement('floatCartTotal');

            // Initially cart is empty
            app.updateCartCounter();
            assert.strictEqual(floatCart.classList.contains('visible'), false);

            // Add item to cart
            app.addToCart('p1'); // price 45, qty 1
            assert.strictEqual(floatCart.classList.contains('visible'), true);
            assert.strictEqual(floatBadge.textContent, '1');
            assert.strictEqual(floatTotal.textContent, '45 บาท');

            // Add another item
            app.addToCart('p3'); // price 55, qty 1
            assert.strictEqual(floatBadge.textContent, '2');
            assert.strictEqual(floatTotal.textContent, '100 บาท');
        });
    });
});
