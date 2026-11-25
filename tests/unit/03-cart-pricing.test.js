const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('03. Cart, Coupons & Pricing Engine (calculateTotalOrder, applyCoupon, changeQty)', () => {
    let app;
    let getElement;

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        getElement = instance.getElement;

        // Initialize cart to empty
        app.cart.length = 0;
        app.appliedDiscountRate = 0;
    });

    describe('Subtotal & Grand Total Calculation', () => {
        it('should return 0 subtotal and 0 grandTotal when cart is empty', () => {
            const result = app.calculateTotalOrder();
            assert.strictEqual(result.subtotal, 0);
            assert.strictEqual(result.discountAmount, 0);
            assert.strictEqual(result.shippingCost, 0);
            assert.strictEqual(result.grandTotal, 0);
        });

        it('should correctly calculate subtotal for multiple items with quantities', () => {
            app.cart.push(
                { id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 2 }, // 90
                { id: 'max_2', name: 'ข้าวหลามเผือก', price: 50, qty: 3 }   // 150
            );

            const result = app.calculateTotalOrder();
            assert.strictEqual(result.subtotal, 240);
            assert.strictEqual(result.grandTotal, 240);
        });

        it('should add shipping cost to grandTotal correctly', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 50, qty: 2 });
            getElement('shippingMethodSelect').value = '40'; // standard shipping 40 THB

            const result = app.calculateTotalOrder();
            assert.strictEqual(result.subtotal, 100);
            assert.strictEqual(result.shippingCost, 40);
            assert.strictEqual(result.grandTotal, 140);
        });

        it('should correctly round discountAmount and subtract from subtotal', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 });
            app.appliedDiscountRate = 0.10; // 10% of 45 = 4.5 -> rounds to 5

            const result = app.calculateTotalOrder();
            assert.strictEqual(result.subtotal, 45);
            assert.strictEqual(result.discountAmount, 5);
            assert.strictEqual(result.grandTotal, 40);
        });
    });

    describe('Coupon Validation & Discounts (applyCoupon)', () => {
        it('should accept MAX10 when subtotal >= 150 and apply 10% discount', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 50, qty: 3 }); // 150
            getElement('couponCodeInput').value = 'MAX10';

            app.applyCoupon();

            assert.strictEqual(app.appliedDiscountRate, 0.10);
            const couponMsg = getElement('couponMessage').textContent;
            assert.ok(couponMsg.includes('สำเร็จ'));
            assert.ok(couponMsg.includes('10%'));
        });

        it('should reject MAX10 when subtotal < 150 and warn about minimum order', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 50, qty: 2 }); // 100 < 150
            getElement('couponCodeInput').value = 'max10'; // lowercase test

            app.applyCoupon();

            assert.strictEqual(app.appliedDiscountRate, 0);
            const couponMsg = getElement('couponMessage').textContent;
            assert.ok(couponMsg.includes('ขั้นต่ำ 150 บาท'));
        });

        it('should accept WELCOME10 for any cart amount without minimum', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 }); // 45 < 150
            getElement('couponCodeInput').value = 'WELCOME10';

            app.applyCoupon();

            assert.strictEqual(app.appliedDiscountRate, 0.10);
            const couponMsg = getElement('couponMessage').textContent;
            assert.ok(couponMsg.includes('ต้อนรับสมาชิกใหม่'));
        });

        it('should accept valid referral codes matching MAX\\d{4}', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 });
            getElement('couponCodeInput').value = 'MAX7890';

            app.applyCoupon();

            assert.strictEqual(app.appliedDiscountRate, 0.10);
            const couponMsg = getElement('couponMessage').textContent;
            assert.ok(couponMsg.includes('แนะนำเพื่อน'));
        });

        it('should reject malformed referral codes (e.g. MAX12, MAX12345, MAXABCD)', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 });

            const invalidReferrals = ['MAX12', 'MAX12345', 'MAXABCD', 'REF1234'];
            invalidReferrals.forEach(code => {
                getElement('couponCodeInput').value = code;
                app.applyCoupon();
                assert.strictEqual(app.appliedDiscountRate, 0);
                assert.ok(getElement('couponMessage').textContent.includes('ไม่ถูกต้อง'));
            });
        });

        it('should reject invalid or gibberish coupon codes', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 100, qty: 2 });
            getElement('couponCodeInput').value = 'FAKE_DISCOUNT';

            app.applyCoupon();

            assert.strictEqual(app.appliedDiscountRate, 0);
            assert.ok(getElement('couponMessage').textContent.includes('ไม่ถูกต้อง'));
        });
    });

    describe('Cart Quantity Modification (changeQty)', () => {
        it('should increase item quantity when change is positive', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 });

            app.changeQty('max_1', 1);
            assert.strictEqual(app.cart[0].qty, 2);

            app.changeQty('max_1', 3);
            assert.strictEqual(app.cart[0].qty, 5);
        });

        it('should decrease item quantity when change is negative', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 3 });

            app.changeQty('max_1', -1);
            assert.strictEqual(app.cart[0].qty, 2);
        });

        it('should remove item from cart completely when quantity reaches 0 or negative', () => {
            app.cart.push(
                { id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 },
                { id: 'max_2', name: 'ข้าวหลามเผือก', price: 50, qty: 2 }
            );

            app.changeQty('max_1', -1); // qty becomes 0 -> removed

            assert.strictEqual(app.cart.length, 1);
            assert.strictEqual(app.cart[0].id, 'max_2');
        });

        it('should do nothing gracefully if productId does not exist in cart', () => {
            app.cart.push({ id: 'max_1', name: 'ข้าวหลามถั่วดำ', price: 45, qty: 1 });

            app.changeQty('non_existent_id', 1);
            assert.strictEqual(app.cart.length, 1);
            assert.strictEqual(app.cart[0].qty, 1);
        });
    });
});
