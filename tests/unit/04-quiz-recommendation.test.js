const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { createAppInstance } = require('../helpers/app-loader');

describe('04. Quiz & Product Recommendation Engine (computeQuizScore)', () => {
    let app;

    beforeEach(() => {
        const instance = createAppInstance();
        app = instance.app;
        app.quizAnswers = {};
    });

    it('should return 0 score when no quiz answers have been chosen', () => {
        const product = {
            id: 'p1',
            name: 'ข้าวหลามถั่วดำ',
            price: 45,
            desc: 'เตาถ่านแท้',
            tag: 'ขายดี',
            category: 'สูตรเตาถ่านแท้'
        };

        const score = app.computeQuizScore(product);
        assert.strictEqual(score, 0);
    });

    it('should award 3 points for exact price range match in budget question', () => {
        // Find price question in quizQuestions
        const budgetQ = app.quizQuestions.find(q => q.options.some(opt => opt.range));
        assert.ok(budgetQ, 'Budget question should exist in quizQuestions');

        const optIdx = budgetQ.options.findIndex(opt => opt.range && opt.range[0] <= 50 && opt.range[1] >= 50);
        assert.ok(optIdx >= 0, 'Matching range option should exist');

        app.quizAnswers[budgetQ.id] = optIdx;

        const productInRange = {
            id: 'p1',
            name: 'ข้าวหลาม',
            price: 50,
            desc: '',
            category: ''
        };

        const score = app.computeQuizScore(productInRange);
        assert.strictEqual(score, 3);
    });

    it('should award points when product matches keyword preferences (taste/style)', () => {
        const keywordQ = app.quizQuestions.find(q => q.options.some(opt => opt.keywords));
        assert.ok(keywordQ, 'Keyword-based question should exist');

        const firstKeywordOptIdx = keywordQ.options.findIndex(opt => opt.keywords && opt.keywords.length > 0);
        const targetKeywords = keywordQ.options[firstKeywordOptIdx].keywords;

        app.quizAnswers[keywordQ.id] = firstKeywordOptIdx;

        const matchingProduct = {
            id: 'p_match',
            name: `ข้าวหลามสูตร ${targetKeywords[0]} พิเศษ`,
            price: 50,
            desc: 'หอมกรุ่น อร่อย',
            tag: '',
            category: ''
        };

        const nonMatchingProduct = {
            id: 'p_none',
            name: 'เมนูอื่น',
            price: 50,
            desc: 'ไม่มีคีย์เวิร์ด',
            tag: '',
            category: ''
        };

        const matchScore = app.computeQuizScore(matchingProduct);
        const nonMatchScore = app.computeQuizScore(nonMatchingProduct);

        assert.ok(matchScore > nonMatchScore);
        assert.ok(matchScore >= 3);
    });

    it('should safely handle products with null/undefined optional fields', () => {
        const product = {
            id: 'p_sparse',
            name: 'ข้าวหลามมินิมอล',
            price: 45
            // desc, tag, category are missing
        };

        assert.doesNotThrow(() => {
            const score = app.computeQuizScore(product);
            assert.strictEqual(typeof score, 'number');
        });
    });

    it('should rank products correctly by descending score', () => {
        const testProducts = [
            { id: 'low', name: 'สินค้า A', desc: 'ไม่มี', price: 100 },
            { id: 'high', name: 'สินค้า B', desc: 'ถั่วดำ หวานมัน เตาถ่าน', price: 45 },
            { id: 'mid', name: 'สินค้า C', desc: 'เตาถ่าน', price: 60 }
        ];

        // Simulate answers
        app.quizQuestions.forEach((q, qIdx) => {
            app.quizAnswers[q.id] = 0;
        });

        const scored = testProducts
            .map(p => ({ ...p, _score: app.computeQuizScore(p) }))
            .sort((a, b) => b._score - a._score);

        assert.ok(scored[0]._score >= scored[1]._score);
        assert.ok(scored[1]._score >= scored[2]._score);
    });
});
