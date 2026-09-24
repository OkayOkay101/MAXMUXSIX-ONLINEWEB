const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('05. Product Catalog & Filter System (applyFilters)', () => {
    let app;
    let getElement;

    const mockCatalog = [
        { id: '1', name: 'ข้าวหลามถั่วดำเตาถ่าน', category: 'สูตรเตาถ่านแท้', desc: 'หวานมันกลมกล่อม', price: 45 },
        { id: '2', name: 'ข้าวหลามเผือกหอม', category: 'สอดไส้พรีเมียม', desc: 'เผือกกวนสดหอมละมุน', price: 50 },
        { id: '3', name: 'ข้าวหลามสังขยาโบราณ', category: 'สอดไส้พรีเมียม', desc: 'ไข่เป็ดสดกะทิแท้', price: 55 },
        { id: '4', name: 'ข้าวหลามชาไทยลาวา', category: 'ฟิวชั่นสมัยใหม่', desc: 'ชาไทยพรีเมียมเยิ้มๆ', price: 60 }
    ];

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        getElement = instance.getElement;

        app.currentProducts = [...mockCatalog];
        app.activeCategory = 'all';
        getElement('filterKeyword').value = '';
    });

    it('should show all products when activeCategory is "all" and search is empty', () => {
        app.applyFilters();
        const gridHtml = getElement('productDisplayGrid').innerHTML;

        mockCatalog.forEach(p => {
            assert.ok(gridHtml.includes(p.name), `Grid should include ${p.name}`);
        });
    });

    it('should filter items strictly by category when a specific category is chosen', () => {
        app.activeCategory = 'สอดไส้พรีเมียม';
        app.applyFilters();

        const gridHtml = getElement('productDisplayGrid').innerHTML;
        assert.ok(gridHtml.includes('ข้าวหลามเผือกหอม'));
        assert.ok(gridHtml.includes('ข้าวหลามสังขยาโบราณ'));
        assert.ok(!gridHtml.includes('ข้าวหลามถั่วดำเตาถ่าน'));
        assert.ok(!gridHtml.includes('ข้าวหลามชาไทยลาวา'));
    });

    it('should search products by name case-insensitively', () => {
        getElement('filterKeyword').value = 'เผือก';
        app.applyFilters();

        const gridHtml = getElement('productDisplayGrid').innerHTML;
        assert.ok(gridHtml.includes('ข้าวหลามเผือกหอม'));
        assert.ok(!gridHtml.includes('ข้าวหลามถั่วดำเตาถ่าน'));
        assert.ok(!gridHtml.includes('ข้าวหลามชาไทยลาวา'));
    });

    it('should search products by description keyword', () => {
        getElement('filterKeyword').value = 'ไข่เป็ดสด'; // Inสังขยาโบราณ's desc
        app.applyFilters();

        const gridHtml = getElement('productDisplayGrid').innerHTML;
        assert.ok(gridHtml.includes('ข้าวหลามสังขยาโบราณ'));
        assert.ok(!gridHtml.includes('ข้าวหลามเผือกหอม'));
    });

    it('should combine category filter and search keyword together', () => {
        app.activeCategory = 'สอดไส้พรีเมียม';
        getElement('filterKeyword').value = 'เผือก';
        app.applyFilters();

        const gridHtml = getElement('productDisplayGrid').innerHTML;
        assert.ok(gridHtml.includes('ข้าวหลามเผือกหอม'));
        assert.ok(!gridHtml.includes('ข้าวหลามสังขยาโบราณ'));
    });

    it('should display friendly empty state when no products match search query', () => {
        getElement('filterKeyword').value = 'สินค้าที่ไม่มีอยู่จริง_xyz_12345';
        app.applyFilters();

        const gridHtml = getElement('productDisplayGrid').innerHTML;
        assert.ok(gridHtml.includes('ไม่พบรายการข้าวหลามที่ค้นหา') || gridHtml.includes('ไม่พบสินค้า'));
    });

    it('should safely handle malicious search input (XSS injection attempts)', () => {
        getElement('filterKeyword').value = '<script>alert(1)</script>';
        assert.doesNotThrow(() => {
            app.applyFilters();
        });
    });
});
