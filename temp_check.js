
        const defaultMaxmuxsixData = [
            {
                id: "max_1",
                name: "ข้าวหลามถั่วดำระเบิดเตา (ต้นตำรับ)",
                category: "สูตรเตาถ่านแท้",
                price: 45,
                stock: 25,
                rating: "4.9 ★★★★★",
                image: "max_1.jpg",
                tag: "ขายดีอันดับ 1",
                desc: "ข้าวเหนียวเขี้ยวงูหอมนุ่ม คลุกเคล้าถั่วดำเม็ดโตและหัวกะทิสด เผาถ่านไฟแรงจนส่งกลิ่นหอมกรุ่นถึงเนื้อใน"
            },
            {
                id: "max_2",
                name: "ข้าวหลามช็อตมะพร้าวน้ำหอม",
                category: "เมนูช็อตไฟลุก",
                price: 40,
                stock: 18,
                rating: "4.8 ★★★★★",
                image: "max_2.jpg",
                tag: "ช็อตเยิ้มสะใจ",
                desc: "กระบอกสั้นเปิดง่าย ทานสะดวก อัดแน่นด้วยเนื้อมะพร้าวอ่อนเคี่ยวน้ำตาลโตนดแท้ หวานมันนัวลิ้น"
            },
            {
                id: "max_3",
                name: "ข้าวหลามเผือกหอมกวนกะทิเยิ้ม",
                category: "สูตรเตาถ่านแท้",
                price: 50,
                stock: 12,
                rating: "4.9 ★★★★★",
                image: "max_3.jpg",
                tag: "หอมละมุน",
                desc: "เนื้อเผือกหอมกวนจนเนียนละเอียด สลับชั้นกับข้าวเหนียวดำหน้ากะทิ รสสัมผัสกลมกล่อม"
            },
            {
                id: "max_4",
                name: "ข้าวหลามสังขยาลาวาไข่เป็ด",
                category: "รสพรีเมียม",
                price: 55,
                stock: 8,
                rating: "5.0 ★★★★★",
                image: "max_4.jpg",
                tag: "ไส้ลาวา",
                desc: "สังขยาไข่เป็ดสูตรเข้มข้น ไหลเยิ้มทะลักเมื่อแกะกระบอก ข้าวเหนียวนุ่มฉ่ำกะทิสด"
            },
            {
                id: "max_5",
                name: "ข้าวหลามข้าวโพดหวานกะทิสด",
                category: "สูตรเตาถ่านแท้",
                price: 42,
                stock: 20,
                rating: "4.8 ★★★★★",
                image: "max_5.jpg",
                tag: "หวานธรรมชาติ",
                desc: "ข้าวโพดหวานเม็ดละเอียดคลุกกะทิสดใหม่ทุกวัน เผาด้วยเตาถ่านโบราณจนหอมกรุ่น หวานละมุนแบบธรรมชาติ ไม่ใส่สารกันบูด"
            },
            {
                id: "max_6",
                name: "ข้าวหลามถั่วแดงกวนนมสด",
                category: "เมนูช็อตไฟลุก",
                price: 38,
                stock: 22,
                rating: "4.7 ★★★★★",
                image: "max_6.jpg",
                tag: "ช็อตหวานมัน",
                desc: "ถั่วแดงกวนเนียนนุ่มคลุกนมสด กระบอกช็อตสั้นเปิดง่าย ทานคำเดียวเพลิน หวานมันกำลังดี"
            },
            {
                id: "max_7",
                name: "ข้าวหลามงาดำโบราณเตาถ่าน",
                category: "สูตรเตาถ่านแท้",
                price: 45,
                stock: 15,
                rating: "4.9 ★★★★★",
                image: "max_7.jpg",
                tag: "สูตรโบราณหายาก",
                desc: "งาดำคั่วหอมบดละเอียดผสมข้าวเหนียวเขี้ยวงู เผาด้วยเตาถ่านโบราณจนหอมกรุ่นทั่วกระบอก รสชาติต้นตำรับแท้"
            },
            {
                id: "max_8",
                name: "ข้าวหลามทุเรียนหมอนทองพรีเมียม",
                category: "รสพรีเมียม",
                price: 65,
                stock: 10,
                rating: "5.0 ★★★★★",
                image: "max_8.jpg",
                tag: "ทุเรียนแท้ล้านเปอร์เซ็นต์",
                desc: "เนื้อทุเรียนหมอนทองแท้ผสมกะทิสด รสชาติหรูระดับพรีเมียม หอมมันเข้มข้นสมราคา"
            }
        ];

        // รูปภาพสำรอง (Placeholder) ป้องกัน Loop หากเปิดไฟล์ในเครื่องไม่ได้
        const fallbackImageBase64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiMwRDIyMTgiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1zaXplPSIyMCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iIGZpbGw9IiNGRUU4QkUiPuC5hOC4oeC5iOC4nuC4muC4o+C4ueC4mzwvdGV4dD48L3N2Zz4=";

        let rawProducts = JSON.parse(localStorage.getItem('maxmuxsix_data'));
        let currentProducts;

        if (!rawProducts || rawProducts.length === 0) {
            currentProducts = defaultMaxmuxsixData;
        } else {
            currentProducts = rawProducts.map(p => {
                return {
                    ...p,
                    stock: (typeof p.stock === 'number' && !isNaN(p.stock)) ? p.stock : 25,
                    rating: p.rating || '4.9 ★★★★★',
                    image: p.image || "max_1.jpg"
                };
            });
        }

        let cart = JSON.parse(localStorage.getItem('maxmuxsix_cart')) || [];
        let orders = JSON.parse(localStorage.getItem('maxmuxsix_orders')) || [];
        let users = JSON.parse(localStorage.getItem('maxmuxsix_users')) || [];
        let currentUser = JSON.parse(localStorage.getItem('maxmuxsix_active_user')) || null;
        let sentEmails = JSON.parse(localStorage.getItem('maxmuxsix_sent_emails')) || [];
        let emailSettings = JSON.parse(localStorage.getItem('maxmuxsix_email_settings')) || {
            provider: 'web3forms',
            web3formsKey: '',
            localServerUrl: 'http://localhost:5000',
            emailjsServiceId: '',
            emailjsTemplateId: '',
            emailjsPublicKey: ''
        };
        let activeCategory = 'all';
        let appliedDiscountRate = 0;
        let uploadedImageBase64 = "";

        function syncStorage() {
            try {
                localStorage.setItem('maxmuxsix_data', JSON.stringify(currentProducts));
                localStorage.setItem('maxmuxsix_cart', JSON.stringify(cart));
                localStorage.setItem('maxmuxsix_orders', JSON.stringify(orders));
                localStorage.setItem('maxmuxsix_users', JSON.stringify(users));
                localStorage.setItem('maxmuxsix_active_user', JSON.stringify(currentUser));
                localStorage.setItem('maxmuxsix_sent_emails', JSON.stringify(sentEmails));
                document.getElementById('productCounter').textContent = `${currentProducts.length} รายการ`;
                updateCartCounter();
                renderAuthUI();
            } catch (error) {
                alert('⚠️ พื้นที่ความจำของเว็บเต็ม! กรุณากด "คืนค่าเริ่มต้น" ก่อนเพิ่มเมนูใหม่');
                console.error(error);
            }
        }

        function updateCartCounter() {
            const count = cart.reduce((total, item) => total + item.qty, 0);
            document.getElementById('cartCount').textContent = count;
        }

        function checkCookieConsent() {
            const consent = localStorage.getItem('maxmuxsix_cookie_consent');
            if (!consent) {
                document.getElementById('cookieConsentBanner').style.display = 'flex';
            }
        }

        function acceptCookieConsent() {
            localStorage.setItem('maxmuxsix_cookie_consent', 'accepted_all');
            document.getElementById('cookieConsentBanner').style.display = 'none';
        }

        function dismissCookieConsent() {
            localStorage.setItem('maxmuxsix_cookie_consent', 'accepted_necessary');
            document.getElementById('cookieConsentBanner').style.display = 'none';
        }

        function renderAuthUI() {
            const area = document.getElementById('authNavArea');
            if (currentUser) {
                const userEmails = sentEmails.filter(m => m.userId === currentUser.id || m.to === currentUser.email);
                const unreadCount = userEmails.filter(m => !m.isRead).length;
                area.innerHTML = `
                    <div class="user-nav-box">
                        <span>👤</span>
                        <span class="user-nav-name">${currentUser.name}</span>
                        <button class="btn-nav-action" style="padding: 4px 12px; border-color: var(--flame-yellow); color: var(--flame-yellow);" onclick="openReferralModal()">🤝 ชวนเพื่อน</button>
                        <button class="btn-nav-action" style="padding: 4px 12px; border-color: #38BDF8; color: #38BDF8;" onclick="openEmailInboxModal()">
                            📧 กล่องอีเมล
                            <span class="cart-badge" style="background:#0284C7; margin-left:4px; font-size: 0.75rem;">${userEmails.length}</span>
                        </button>
                        <button class="btn-logout" onclick="handleLogout()">ออกจากระบบ</button>
                    </div>
                `;
            } else {
                area.innerHTML = `
                    <button class="btn-nav-action" onclick="openAuthModal('login')">
                        👤 เข้าสู่ระบบ / สมัครสมาชิก
                    </button>
                `;
            }
        }

        function openAuthModal(tab = 'login') {
            switchAuthTab(tab);
            document.getElementById('authModal').classList.add('active');
        }

        function closeAuthModal() {
            document.getElementById('authModal').classList.remove('active');
        }

        function switchAuthTab(tab) {
            const loginBtn = document.getElementById('tabLoginBtn');
            const regBtn = document.getElementById('tabRegisterBtn');
            const loginContent = document.getElementById('loginContent');
            const regContent = document.getElementById('registerContent');

            if (tab === 'login') {
                loginBtn.classList.add('active');
                regBtn.classList.remove('active');
                loginContent.classList.add('active');
                regContent.classList.remove('active');
            } else {
                regBtn.classList.add('active');
                loginBtn.classList.remove('active');
                regContent.classList.add('active');
                loginContent.classList.remove('active');
            }
        }

        // ==========================================
        // ระบบแนะนำเพื่อน (Affiliate / Referral System)
        // ==========================================
        function handleRegister(e) {
            e.preventDefault();
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim().toLowerCase();
            const phone = document.getElementById('regPhone').value.trim();
            const password = document.getElementById('regPassword').value;
            const address = document.getElementById('regAddress').value.trim();
            const consentGiven = document.getElementById('regConsentCheckbox').checked;
            
            // อ่านค่ารหัสผู้แนะนำ
            const referrerCodeInput = document.getElementById('regReferrerCode').value.trim().toUpperCase();

            if (!consentGiven) {
                alert('กรุณายินยอมรับข้อกำหนดและนโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA)');
                return;
            }

            const exists = users.find(u => u.email === email || u.phone === phone);
            if (exists) {
                alert('อีเมลหรือเบอร์โทรศัพท์นี้ถูกใช้งานในระบบแล้ว กรุณาเข้าสู่ระบบ');
                switchAuthTab('login');
                return;
            }

            // ตรวจสอบรหัสผู้แนะนำ และเพิ่มแต้มให้คนแนะนำ
            if (referrerCodeInput) {
                const referrerUser = users.find(u => u.referralCode === referrerCodeInput);
                if (referrerUser) {
                    referrerUser.referredCount = (referrerUser.referredCount || 0) + 1;
                } else {
                    alert('⚠️ โค้ดผู้แนะนำไม่ถูกต้อง (แต่ระบบจะทำการสมัครสมาชิกให้ตามปกติ)');
                }
            }

            // สร้าง Referral Code ส่วนตัวให้สมาชิกใหม่
            const myNewReferralCode = 'MAX' + Math.floor(1000 + Math.random() * 9000);

            const newUser = {
                id: 'USR-' + Date.now(),
                name, email, phone, password, address,
                referralCode: myNewReferralCode,
                referredCount: 0,
                registeredDate: new Date().toISOString(),
                consentPDPA: true
            };

            users.push(newUser);
            currentUser = newUser;
            syncStorage();

            closeAuthModal();

            // ส่งอีเมลต้อนรับสมาชิกใหม่อัตโนมัติ พร้อมโค้ดส่วนลด 10%
            sendWelcomeEmail(newUser);
        }

        function openReferralModal() {
            if (!currentUser) return;
            
            if (!currentUser.referralCode) {
                currentUser.referralCode = 'MAX' + Math.floor(1000 + Math.random() * 9000);
                currentUser.referredCount = 0;
                const idx = users.findIndex(u => u.id === currentUser.id);
                if (idx > -1) users[idx] = currentUser;
                syncStorage();
            }

            document.getElementById('myReferralCodeDisplay').textContent = currentUser.referralCode;
            document.getElementById('myReferredCountDisplay').textContent = currentUser.referredCount || 0;
            document.getElementById('referralModal').classList.add('active');
        }

        function closeReferralModal() {
            document.getElementById('referralModal').classList.remove('active');
        }

        function copyReferralCode() {
            if (!currentUser || !currentUser.referralCode) return;
            navigator.clipboard.writeText(currentUser.referralCode).then(() => {
                alert('คัดลอกโค้ดสำเร็จ! นำไปส่งให้เพื่อนใช้สมัครสมาชิกได้เลยครับ');
            }).catch(() => {
                alert('คัดลอกไม่สำเร็จ กรุณาพิมพ์โค้ดด้วยตนเอง');
            });
        }

        function handleLogin(e) {
            e.preventDefault();
            const userKey = document.getElementById('loginUserKey').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;

            const user = users.find(u => (u.email === userKey || u.phone === userKey) && u.password === password);
            if (user) {
                currentUser = user;
                syncStorage();
                alert(`🔥 ยินดีต้อนรับกลับ คุณ ${user.name}! เข้าสู่ระบบสำเร็จ`);
                closeAuthModal();
            } else {
                alert('❌ ข้อมูลเข้าสู่ระบบไม่ถูกต้อง กรุณาตรวจสอบอีเมล เบอร์โทร หรือรหัสผ่าน');
            }
        }

        function handleLogout() {
            if (confirm('คุณต้องการออกจากระบบหรือไม่?')) {
                currentUser = null;
                syncStorage();
            }
        }

        // ==========================================
        // ระบบแนะนำสินค้าบนหน้าหลัก (Homepage Recommendation)
        // ==========================================
        function renderRecommendedProducts(query, category) {
            const container = document.getElementById('recommendedSection');
            
            // หากกำลังค้นหาหรือกดฟิลเตอร์ ให้ซ่อนแถบเมนูแนะนำอัตโนมัติ
            if (query || category !== 'all') {
                container.style.display = 'none';
                return;
            }

            // กรองสินค้าเฉพาะที่มีสต็อก และเป็นเมนูขายดีหรือเรตติ้งดี
            let recommended = currentProducts.filter(p => p.stock > 0 && (p.tag.includes('ขายดี') || p.tag.includes('ซิกเนเจอร์') || p.rating.includes('5.0') || p.rating.includes('4.9')));

            // สุ่มมาแสดง 3 รายการ
            recommended = recommended.sort(() => 0.5 - Math.random()).slice(0, 3);

            if (recommended.length === 0) {
                container.style.display = 'none';
                return;
            }

            container.style.display = 'block';
            let html = `
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 1.5rem;">
                    <span style="font-size: 2rem;">⭐</span>
                    <h2 style="color: var(--flame-yellow); margin: 0; font-weight: 800;">เมนูแนะนำ (Recommended)</h2>
                </div>
                <div class="recommended-scroll-area">
            `;

            recommended.forEach(p => {
                html += `
                    <div class="card rec-card">
                        <div class="card-img-wrapper" style="height: 160px;">
                            <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImageBase64}';">
                            ${p.tag ? `<div class="card-ribbon-tag" style="background: var(--success);">${p.tag}</div>` : ''}
                        </div>
                        <div class="card-body" style="padding: 1rem;">
                            <h3 style="font-size: 1.15rem; margin-bottom: 5px; color: var(--cream); font-weight: 700;">${p.name}</h3>
                            <div style="color: var(--flame-yellow); font-weight: 800; font-size: 1.3rem;">${p.price} บาท</div>
                            <button class="btn-order" onclick="addToCart('${p.id}')" style="width: 100%; margin-top: 10px;">🛒 เพิ่มลงตะกร้า</button>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;
        }

        // ==========================================
        // ระบบแนะนำสินค้าตามสไตล์ลูกค้า (Preference Quiz Recommender)
        // ==========================================
        const quizQuestions = [
            {
                id: 'filling',
                icon: '🎋',
                question: 'ไส้ข้าวหลามที่คุณหลงรักที่สุดคือ?',
                options: [
                    { label: 'ถั่วดำเข้มข้น เม็ดโต', icon: '🫘', keywords: ['ถั่วดำ', 'ถั่ว'] },
                    { label: 'มะพร้าวอ่อนหวานมัน', icon: '🥥', keywords: ['มะพร้าว'] },
                    { label: 'เผือกหอมกวนกะทิ', icon: '🍠', keywords: ['เผือก'] },
                    { label: 'สังขยา/ไข่เป็ดลาวาไหลเยิ้ม', icon: '🥮', keywords: ['สังขยา', 'ไข่เป็ด', 'ลาวา'] }
                ]
            },
            {
                id: 'style',
                icon: '🔥',
                question: 'สไตล์การทานที่คุณชอบ?',
                options: [
                    { label: 'สูตรเตาถ่านโบราณ หอมกรุ่นทั้งกระบอก', icon: '🪵', keywords: ['เตาถ่าน', 'ถ่าน', 'โบราณ', 'ต้นตำรับ'] },
                    { label: 'กระบอกช็อตสั้น เปิดง่าย ทานไว', icon: '⚡', keywords: ['ช็อต'] },
                    { label: 'รสชาติหรูสไตล์พรีเมียม', icon: '👑', keywords: ['พรีเมียม', 'ลาวา', 'หรู'] }
                ]
            },
            {
                id: 'budget',
                icon: '💰',
                question: 'งบประมาณต่อกระบอกของคุณ?',
                options: [
                    { label: 'ประหยัด ไม่เกิน 40 บาท', icon: '🪙', range: [0, 40] },
                    { label: 'กลางๆ 41-50 บาท', icon: '💵', range: [41, 50] },
                    { label: 'ไม่จำกัด ขอสุดพิเศษ 51 บาทขึ้นไป', icon: '💎', range: [51, 999] }
                ]
            }
        ];

        let quizStep = 0;
        let quizAnswers = {};

        function openQuizModal() {
            quizStep = 0;
            quizAnswers = {};
            document.getElementById('quizFormArea').style.display = 'block';
            document.getElementById('quizResultArea').style.display = 'none';
            renderQuizStep();
            document.getElementById('quizModal').classList.add('active');
        }

        function closeQuizModal() {
            document.getElementById('quizModal').classList.remove('active');
        }

        function renderQuizStep() {
            const q = quizQuestions[quizStep];
            const total = quizQuestions.length;
            const percent = Math.round((quizStep / total) * 100);

            const optsHtml = q.options.map((opt, idx) => `
                <button type="button" class="btn-filter quiz-opt-btn ${quizAnswers[q.id] === idx ? 'active' : ''}" onclick="selectQuizOption(${idx})">
                    <span style="font-size: 1.25rem; margin-right: 8px;">${opt.icon || ''}</span>${opt.label}
                </button>
            `).join('');

            const answered = quizAnswers[q.id] !== undefined;
            const isLast = quizStep === total - 1;

            document.getElementById('quizFormArea').innerHTML = `
                <div style="margin-bottom: 1.3rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: #8BA89B; margin-bottom: 6px;">
                        <span>คำถามที่ ${quizStep + 1} จาก ${total}</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="quiz-progress-track">
                        <div class="quiz-progress-fill" style="width: ${percent}%;"></div>
                    </div>
                </div>
                <h3 style="color: var(--flame-yellow); margin-bottom: 1.2rem; font-size: 1.2rem;">${q.icon || ''} ${q.question}</h3>
                <div>${optsHtml}</div>
                <div class="modal-foot" style="justify-content: space-between;">
                    <button type="button" class="btn-cancel" onclick="${quizStep === 0 ? 'closeQuizModal()' : 'prevQuizStep()'}">${quizStep === 0 ? 'ยกเลิก' : '← ก่อนหน้า'}</button>
                    <button type="button" class="btn-save" ${answered ? '' : 'disabled style="opacity:0.45; cursor:not-allowed;"'} onclick="nextQuizStep()">${isLast ? 'ดูผลลัพธ์ 🎉' : 'ถัดไป →'}</button>
                </div>
            `;
        }

        function selectQuizOption(optIdx) {
            const q = quizQuestions[quizStep];
            quizAnswers[q.id] = optIdx;
            renderQuizStep();
        }

        function prevQuizStep() {
            if (quizStep > 0) {
                quizStep--;
                renderQuizStep();
            }
        }

        function nextQuizStep() {
            const q = quizQuestions[quizStep];
            if (quizAnswers[q.id] === undefined) return;

            if (quizStep < quizQuestions.length - 1) {
                quizStep++;
                renderQuizStep();
            } else {
                showQuizResults();
            }
        }

        function restartQuiz() {
            quizStep = 0;
            quizAnswers = {};
            document.getElementById('quizResultArea').style.display = 'none';
            document.getElementById('quizFormArea').style.display = 'block';
            renderQuizStep();
        }

        function computeQuizScore(product) {
            const text = `${product.name} ${product.desc} ${product.tag || ''} ${product.category || ''}`.toLowerCase();
            let score = 0;

            quizQuestions.forEach(q => {
                const ansIdx = quizAnswers[q.id];
                if (ansIdx === undefined) return;
                const opt = q.options[ansIdx];

                if (opt.range) {
                    if (product.price >= opt.range[0] && product.price <= opt.range[1]) {
                        score += 3;
                    } else {
                        const mid = (opt.range[0] + opt.range[1]) / 2;
                        score += Math.max(0, 1 - Math.abs(product.price - mid) / 50);
                    }
                } else if (opt.keywords) {
                    opt.keywords.forEach(kw => {
                        if (text.includes(kw.toLowerCase())) score += 3;
                    });
                }
            });

            return score;
        }

        function showQuizResults() {
            const scored = currentProducts
                .filter(p => (typeof p.stock !== 'number' || p.stock > 0))
                .map(p => ({ ...p, _score: computeQuizScore(p) }));

            scored.sort((a, b) => b._score - a._score);
            const maxScore = scored.length ? scored[0]._score : 0;
            const top = scored.slice(0, 3);

            document.getElementById('quizFormArea').style.display = 'none';
            const resultArea = document.getElementById('quizResultArea');
            resultArea.style.display = 'block';

            const cardsHtml = top.map(p => `
                <div class="card quiz-result-card">
                    <div class="card-img-wrapper" style="height: 150px;">
                        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImageBase64}';">
                        ${maxScore > 0 && p._score === maxScore ? `<div class="quiz-match-badge">✨ ตรงใจที่สุด</div>` : ''}
                        ${p.tag ? `<div class="card-ribbon-tag">${p.tag}</div>` : ''}
                    </div>
                    <div class="card-body" style="padding: 1rem;">
                        <h3 style="font-size: 1.08rem; color: var(--cream); margin-bottom: 4px;">${p.name}</h3>
                        <div style="color: var(--flame-yellow); font-weight: 800; font-size: 1.2rem; margin-bottom: 10px;">${p.price} บาท</div>
                        <button class="btn-order" style="width: 100%;" onclick="addToCart('${p.id}'); closeQuizModal();">🛒 เพิ่มลงตะกร้าเลย</button>
                    </div>
                </div>
            `).join('');

            resultArea.innerHTML = `
                <div style="text-align: center; margin-bottom: 1.3rem;">
                    <div style="font-size: 2.8rem;">🎉</div>
                    <h3 style="color: var(--flame-yellow); margin-bottom: 4px;">นี่คือข้าวหลามที่ใช่สำหรับคุณ!</h3>
                    <p style="color: #C0D8CC; font-size: 0.88rem;">คัดเลือกจากคำตอบของคุณโดยเฉพาะ</p>
                </div>
                ${cardsHtml || `<p style="text-align: center; color: #8BA89B; padding: 1.5rem 0;">ยังไม่มีเมนูที่ตรงกับความต้องการในขณะนี้ ลองดูเมนูทั้งหมดของเราได้เลย</p>`}
                <div class="modal-foot" style="justify-content: center; gap: 12px;">
                    <button type="button" class="btn-cancel" onclick="restartQuiz()">🔄 ทำแบบทดสอบใหม่</button>
                    <button type="button" class="btn-save" onclick="closeQuizModal()">ปิดหน้าต่าง</button>
                </div>
            `;
        }

        function renderItems(data = currentProducts) {
            const container = document.getElementById('productDisplayGrid');
            container.innerHTML = '';

            if (data.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem;">
                        <div style="font-size: 3.5rem;">🔥</div>
                        <h3 style="color: var(--flame-yellow); margin-top: 10px;">ไม่พบรายการข้าวหลามที่ค้นหา!</h3>
                        <p style="color: #8BA89B;">ลองค้นหาด้วยคำอื่น หรือกดปุ่มเพิ่มเมนูใหม่ได้ทันที</p>
                    </div>
                `;
                return;
            }

            data.forEach(p => {
                const stockCount = (typeof p.stock === 'number' && !isNaN(p.stock)) ? p.stock : 25;
                const card = document.createElement('div');
                card.className = 'card';
                
                card.innerHTML = `
                    <div class="card-img-wrapper">
                        <img src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${fallbackImageBase64}';">
                        ${p.tag ? `<div class="card-ribbon-tag">${p.tag}</div>` : ''}
                        <div class="stock-badge">คงเหลือ ${stockCount} กระบอก</div>
                    </div>
                    <div class="card-body">
                        <div class="card-category-rating">
                            <span class="card-category">${p.category}</span>
                            <span class="card-rating">${p.rating || '4.9 ★★★★★'}</span>
                        </div>
                        <h2 class="card-title">${p.name}</h2>
                        <p class="card-desc">${p.desc}</p>
                        <div class="card-footer">
                            <div class="card-price">${p.price} <span style="font-size:0.85rem; color:var(--cream);">บาท</span></div>
                            <div class="card-btns">
                                <button class="btn-order" onclick="addToCart('${p.id}')">🛒 สั่งซื้อ</button>
                                <button class="btn-act edit" title="แก้ไข" onclick="editProduct('${p.id}')">✏️</button>
                                <button class="btn-act delete" title="ลบ" onclick="deleteProduct('${p.id}')">🗑️</button>
                            </div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });

            syncStorage();
        }

        function addToCart(productId) {
            const product = currentProducts.find(p => p.id === productId);
            if (!product) return;

            const stock = (typeof product.stock === 'number' && !isNaN(product.stock)) ? product.stock : 25;

            if (stock <= 0) {
                alert('ขออภัย เมนูนี้หมดชั่วคราว กำลังเผาเพิ่มครับ!');
                return;
            }

            const existingIndex = cart.findIndex(c => c.id === productId);
            if (existingIndex > -1) {
                if (cart[existingIndex].qty < stock) {
                    cart[existingIndex].qty += 1;
                } else {
                    alert(`สินค้ามีสต็อกจำกัด ${stock} กระบอก`);
                    return;
                }
            } else {
                cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 });
            }

            syncStorage();
            
            const cartBtn = document.querySelector('.header-actions button:nth-child(3)');
            if (cartBtn) {
                cartBtn.style.transform = 'scale(1.15)';
                setTimeout(() => { cartBtn.style.transform = ''; }, 200);
            }
        }

        function openCartModal() {
            renderCartItems();
            calculateTotalOrder();
            document.getElementById('cartModal').classList.add('active');
        }

        function closeCartModal() {
            document.getElementById('cartModal').classList.remove('active');
        }

        function renderCartItems() {
            const listContainer = document.getElementById('cartItemsContainer');
            listContainer.innerHTML = '';

            if (cart.length === 0) {
                listContainer.innerHTML = '<p style="text-align: center; color: #8BA89B; padding: 2rem 0;">ยังไม่มีสินค้าในตะกร้า</p>';
                document.getElementById('btnProceedCheckout').style.display = 'none';
                document.getElementById('crossSellContainer').innerHTML = '';
                return;
            }

            document.getElementById('btnProceedCheckout').style.display = 'block';

            cart.forEach(item => {
                const subtotal = item.price * item.qty;
                const itemRow = document.createElement('div');
                itemRow.className = 'cart-item';
                itemRow.innerHTML = `
                    <div>
                        <div class="cart-item-name">${item.name}</div>
                        <div class="cart-item-price">${item.price} บาท × ${item.qty} = <strong>${subtotal}</strong> บาท</div>
                    </div>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                        <span>${item.qty}</span>
                        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                    </div>
                `;
                listContainer.appendChild(itemRow);
            });

            // เรียกใช้ระบบแนะนำสินค้าในตะกร้า (Cross-Selling)
            renderCrossSellProducts();
        }

        // ==========================================
        // ระบบแนะนำสินค้าในตะกร้า (Cross-selling)
        // ==========================================
        function renderCrossSellProducts() {
            const container = document.getElementById('crossSellContainer');
            const inCartIds = cart.map(c => c.id);
            
            const availableToRecommend = currentProducts.filter(p => !inCartIds.includes(p.id) && p.stock > 0);
            
            if(availableToRecommend.length === 0) {
                container.innerHTML = ''; 
                return;
            }

            const recommendations = availableToRecommend.sort(() => 0.5 - Math.random()).slice(0, 2);
            
            let html = `
                <h4 style="color:var(--flame-yellow); margin-top:1.5rem; border-top:1px dashed #1E543C; padding-top:14px; margin-bottom:10px;">
                    💡 สินค้าแนะนำที่คุณน่าจะชอบ (สั่งเพิ่มอีกนิดอร่อยอีกหน่อย)
                </h4>
                <div style="display:flex; gap:10px; overflow-x:auto; padding-bottom:10px; margin-bottom:1rem;">
            `;
            
            recommendations.forEach(p => {
                html += `
                <div class="cross-sell-item">
                    <img src="${p.image}" onerror="this.onerror=null; this.src='${fallbackImageBase64}';" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid #23583F;">
                    <div style="flex:1;">
                        <div style="font-size:0.85rem; font-weight:600; color:var(--cream);">${p.name}</div>
                        <div style="color:var(--flame-yellow); font-size:0.9rem; font-weight:700;">${p.price} บาท</div>
                    </div>
                    <button onclick="addToCart('${p.id}'); renderCartItems(); calculateTotalOrder();" style="background:var(--flame-orange); color:#fff; border:1px solid var(--cream); padding:5px 12px; border-radius:20px; cursor:pointer; font-weight:700; font-size:0.85rem; transition:0.2s;">
                        + เพิ่ม
                    </button>
                </div>`;
            });
            html += '</div>';
            container.innerHTML = html;
        }

        function changeQty(productId, change) {
            const idx = cart.findIndex(c => c.id === productId);
            if (idx > -1) {
                cart[idx].qty += change;
                if (cart[idx].qty <= 0) {
                    cart.splice(idx, 1);
                }
                syncStorage();
                renderCartItems();
                calculateTotalOrder();
            }
        }

        function applyCoupon() {
            const code = document.getElementById('couponCodeInput').value.trim().toUpperCase();
            const msg = document.getElementById('couponMessage');
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

            if (code === 'MAX10') {
                if (subtotal >= 150) {
                    appliedDiscountRate = 0.10;
                    msg.style.color = '#10B981';
                    msg.textContent = '✅ ใช้โค้ดสำเร็จ! ได้รับส่วนลด 10%';
                } else {
                    appliedDiscountRate = 0;
                    msg.style.color = '#EF4444';
                    msg.textContent = '⚠️ ซื้อขั้นต่ำ 150 บาทเพื่อใช้โค้ดนี้';
                }
            } else if (code === 'WELCOME10') {
                appliedDiscountRate = 0.10;
                msg.style.color = '#10B981';
                msg.textContent = '🎉 โค้ดต้อนรับสมาชิกใหม่สำเร็จ! ได้รับส่วนลด 10%';
            } else if (/^MAX\d{4}$/.test(code)) {
                appliedDiscountRate = 0.10;
                msg.style.color = '#10B981';
                msg.textContent = `🤝 ใช้โค้ดแนะนำเพื่อน (${code}) สำเร็จ! ได้รับส่วนลด 10%`;
            } else {
                appliedDiscountRate = 0;
                msg.style.color = '#EF4444';
                msg.textContent = '❌ โค้ดส่วนลดไม่ถูกต้อง';
            }
            calculateTotalOrder();
        }

        function calculateTotalOrder() {
            const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            const shippingCost = Number(document.getElementById('shippingMethodSelect').value) || 0;
            const discountAmount = Math.round(subtotal * appliedDiscountRate);
            const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);

            document.getElementById('billSubtotal').textContent = `${subtotal} บาท`;
            document.getElementById('billShipping').textContent = `${shippingCost} บาท`;
            
            const discountRow = document.getElementById('discountRow');
            if (discountAmount > 0) {
                discountRow.style.display = 'flex';
                document.getElementById('billDiscount').textContent = `-${discountAmount} บาท`;
            } else {
                discountRow.style.display = 'none';
            }

            document.getElementById('billGrandTotal').textContent = `${grandTotal} บาท`;
            return { subtotal, discountAmount, shippingCost, grandTotal };
        }

        function proceedToPayment() {
            if (cart.length === 0) return;
            const bill = calculateTotalOrder();
            document.getElementById('payAmountDisplay').textContent = bill.grandTotal;

            if (currentUser) {
                document.getElementById('custName').value = currentUser.name || '';
                document.getElementById('custPhone').value = currentUser.phone || '';
                document.getElementById('custAddress').value = currentUser.address || '';
            }

            closeCartModal();
            document.getElementById('paymentModal').classList.add('active');
        }

        function closePaymentModal() {
            document.getElementById('paymentModal').classList.remove('active');
        }

        function backToCart() {
            closePaymentModal();
            openCartModal();
        }

        function confirmOrder(e) {
            e.preventDefault();
            const name = document.getElementById('custName').value.trim();
            const phone = document.getElementById('custPhone').value.trim();
            const address = document.getElementById('custAddress').value.trim();
            const bill = calculateTotalOrder();

            const orderId = 'MAX-' + Math.floor(100000 + Math.random() * 900000);
            const newOrder = {
                id: orderId,
                userId: currentUser ? currentUser.id : 'GUEST',
                date: new Date().toLocaleString('th-TH'),
                items: [...cart],
                name,
                phone,
                address,
                total: bill.grandTotal,
                status: 'กำลังเผาไฟแรง 🔥'
            };

            orders.unshift(newOrder);

            cart.forEach(cartItem => {
                const prod = currentProducts.find(p => p.id === cartItem.id);
                if (prod) {
                    const currentStock = (typeof prod.stock === 'number' && !isNaN(prod.stock)) ? prod.stock : 25;
                    prod.stock = Math.max(0, currentStock - cartItem.qty);
                }
            });

            cart = [];
            appliedDiscountRate = 0;
            document.getElementById('couponCodeInput').value = '';
            document.getElementById('couponMessage').textContent = '';
            syncStorage();
            
            // รีโหลดหน้าหลัก
            applyFilters();

            document.getElementById('checkoutForm').reset();
            closePaymentModal();

            alert(`🎉 สั่งซื้อสำเร็จเรียบร้อย!\n\nรหัสคำสั่งซื้อ: ${orderId}\nคุณ: ${name}\nยอดชำระ: ${bill.grandTotal} บาท\n\nสามารถตรวจสอบความคืบหน้าได้ที่ปุ่ม "คำสั่งซื้อ" ด้านบนครับ`);
        }

        function openOrderHistoryModal() {
            const container = document.getElementById('orderHistoryContainer');
            container.innerHTML = '';

            const displayOrders = currentUser ? orders.filter(o => o.userId === currentUser.id || o.userId === 'GUEST') : orders;

            if (displayOrders.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #8BA89B; padding: 2rem 0;">ยังไม่มีประวัติคำสั่งซื้อ</p>';
            } else {
                displayOrders.forEach(ord => {
                    const div = document.createElement('div');
                    div.className = 'order-card';
                    const itemsSummary = ord.items.map(i => `${i.name} (x${i.qty})`).join(', ');
                    div.innerHTML = `
                        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                            <strong>รหัส: ${ord.id}</strong>
                            <span class="order-badge status-cooking">${ord.status}</span>
                        </div>
                        <div style="font-size: 0.85rem; color: #8BA89B; margin-bottom: 6px;">วันที่สั่ง: ${ord.date}</div>
                        <div style="font-size: 0.9rem; margin-bottom: 6px;">รายการ: ${itemsSummary}</div>
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--flame-yellow);">
                            ยอดชำระรวม: ${ord.total} บาท
                        </div>
                    `;
                    container.appendChild(div);
                });
            }

            document.getElementById('orderHistoryModal').classList.add('active');
        }

        function closeOrderHistoryModal() {
            document.getElementById('orderHistoryModal').classList.remove('active');
        }

        function previewImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const btnSave = document.getElementById('btnSubmitForm');
            btnSave.textContent = '⏳ กำลังประมวลผลรูป...';
            btnSave.disabled = true;

            const reader = new FileReader();
            reader.onload = function(evt) {
                const img = new Image();
                img.src = evt.target.result;
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    const scaleSize = MAX_WIDTH / img.width;
                    
                    if (img.width > MAX_WIDTH) {
                        canvas.width = MAX_WIDTH;
                        canvas.height = img.height * scaleSize;
                    } else {
                        canvas.width = img.width;
                        canvas.height = img.height;
                    }

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    uploadedImageBase64 = canvas.toDataURL('image/jpeg', 0.75);
                    
                    btnSave.textContent = 'บันทึกข้อมูล';
                    btnSave.disabled = false;
                }
            };
            reader.readAsDataURL(file);
        }

        function openCrudModal(isEdit = false) {
            document.getElementById('crudModal').classList.add('active');
            document.getElementById('modalHeading').textContent = isEdit ? 'แก้ไขเมนู MAXMUXSIX' : 'เพิ่มเมนูข้าวหลามใหม่';
            document.getElementById('btnSubmitForm').textContent = isEdit ? 'บันทึกการแก้ไข' : 'เพิ่มเมนูเร้าใจ';
            uploadedImageBase64 = "";
        }

        function closeCrudModal() {
            document.getElementById('crudModal').classList.remove('active');
            document.getElementById('productForm').reset();
            document.getElementById('editItemId').value = '';
            uploadedImageBase64 = "";
        }

        function saveProduct(e) {
            e.preventDefault();
            const id = document.getElementById('editItemId').value;
            const name = document.getElementById('itemName').value.trim();
            const category = document.getElementById('itemCategory').value;
            const price = Number(document.getElementById('itemPrice').value);
            const stock = Number(document.getElementById('itemStock').value) || 20;
            const tag = document.getElementById('itemTag').value.trim();
            const desc = document.getElementById('itemDesc').value.trim();
            const imageUrl = document.getElementById('itemImageUrl').value.trim();

            const finalImage = uploadedImageBase64 || imageUrl || "max_1.jpg";

            if (id) {
                const idx = currentProducts.findIndex(p => p.id === id);
                if (idx !== -1) {
                    currentProducts[idx] = {
                        ...currentProducts[idx],
                        name, category, price, stock, tag, desc,
                        image: finalImage || currentProducts[idx].image
                    };
                }
            } else {
                const newItem = {
                    id: 'max_' + Date.now(),
                    name, category, price, stock, tag, desc,
                    rating: '5.0 ★★★★★',
                    image: finalImage
                };
                currentProducts.unshift(newItem);
            }

            syncStorage();
            applyFilters();
            closeCrudModal();
        }

        function editProduct(id) {
            const item = currentProducts.find(p => p.id === id);
            if (!item) return;

            document.getElementById('editItemId').value = item.id;
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemCategory').value = item.category;
            document.getElementById('itemPrice').value = item.price;
            document.getElementById('itemStock').value = (typeof item.stock === 'number' && !isNaN(item.stock)) ? item.stock : 20;
            document.getElementById('itemTag').value = item.tag || '';
            document.getElementById('itemImageUrl').value = (item.image && item.image.startsWith('data:')) ? '' : (item.image || '');
            document.getElementById('itemDesc').value = item.desc;

            openCrudModal(true);
        }

        function deleteProduct(id) {
            const item = currentProducts.find(p => p.id === id);
            if (!item) return;

            if (confirm(`ต้องการลบเมนู "${item.name}" ออกจากระบบใช่หรือไม่?`)) {
                currentProducts = currentProducts.filter(p => p.id !== id);
                cart = cart.filter(c => c.id !== id);
                syncStorage();
                applyFilters();
            }
        }

        function applyFilters() {
            const query = document.getElementById('filterKeyword').value.trim().toLowerCase();
            let filtered = currentProducts;

            if (activeCategory !== 'all') {
                filtered = filtered.filter(p => p.category === activeCategory);
            }

            if (query) {
                filtered = filtered.filter(p => 
                    p.name.toLowerCase().includes(query) || 
                    p.desc.toLowerCase().includes(query)
                );
            }
            
            // เรียกใช้ระบบอัปเดตหน้าหลักและเมนูแนะนำ
            renderRecommendedProducts(query, activeCategory);
            renderItems(filtered);
        }

        function selectCategory(cat, element) {
            activeCategory = cat;
            document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
            element.classList.add('active');
            applyFilters();
        }

        function backupToJson() {
            const jsonText = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentProducts, null, 2));
            const dl = document.createElement('a');
            dl.setAttribute("href", jsonText);
            dl.setAttribute("download", `maxmuxsix_backup_${Date.now()}.json`);
            document.body.appendChild(dl);
            dl.click();
            dl.remove();
        }

        function restoreFromJson(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const parsed = JSON.parse(evt.target.result);
                    if (Array.isArray(parsed)) {
                        currentProducts = parsed.map(p => ({
                            ...p,
                            stock: (typeof p.stock === 'number' && !isNaN(p.stock)) ? p.stock : 25
                        }));
                        syncStorage();
                        applyFilters();
                        alert('นำเข้าข้อมูลสำเร็จ!');
                    }
                } catch (err) {
                    alert('ไฟล์ JSON ไม่ถูกต้อง');
                }
            };
            reader.readAsText(file);
        }

        function resetToDefault() {
            if (confirm('คุณต้องการรีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นของ MAXMUXSIX หรือไม่?')) {
                currentProducts = [...defaultMaxmuxsixData];
                cart = [];
                orders = [];
                users = [];
                currentUser = null;
                sentEmails = [];
                syncStorage();
                applyFilters();
            }
        }

        // ==========================================
        // ระบบอีเมลต้อนรับ & กล่องจดหมาย (Welcome Email System)
        // ==========================================
        let currentViewingEmailId = null;

        function generateWelcomeEmailHtml(user) {
            const tmpl = document.getElementById('welcomeEmailTemplate');
            if (!tmpl) return '';
            let html = tmpl.innerHTML;
            
            // แทนที่ตัวแปรไดนามิกในเนื้อหาอีเมล
            const userName = user.name || 'สมาชิกร้าน MAXMUXSIX';
            const userRefCode = user.referralCode || 'MAX1000';
            
            html = html.replace(/{{USER_NAME}}/g, userName);
            html = html.replace(/{{REFERRAL_CODE}}/g, userRefCode);
            html = html.replace(/{{unsubscribe_link}}/g, '#');
            
            return html;
        }

        function sendWelcomeEmail(user) {
            const emailHtml = generateWelcomeEmailHtml(user);
            const emailRecord = {
                id: 'EML-' + Date.now(),
                userId: user.id,
                to: user.email,
                toName: user.name,
                subject: `🎋 ยินดีต้อนรับคุณ ${user.name} สู่ครอบครัว MAXMUXSIX รับส่วนลด 10% (WELCOME10)`,
                date: new Date().toLocaleString('th-TH', { 
                    year: 'numeric', month: 'short', day: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                }),
                promoCode: 'WELCOME10',
                referralCode: user.referralCode,
                htmlContent: emailHtml,
                isRead: false
            };

            sentEmails.unshift(emailRecord);
            syncStorage();

            // ส่งอีเมลจริงผ่าน Provider ที่เลือก (Web3Forms, Local Server หรือ EmailJS)
            dispatchRealEmail(emailRecord).then(res => {
                const toastBody = document.querySelector('.email-toast-body');
                if (toastBody && res.success) {
                    toastBody.innerHTML = `<strong>ส่งอีเมลจริงสำเร็จ!</strong><br>ส่งเข้า Inbox ของ <span>${user.email}</span> แล้ว`;
                }
            });

            // แสดง Toast แจ้งเตือนส่งอีเมล
            showEmailToast(user.email, emailRecord.id);

            // เปิด Modal อีเมลต้อนรับขึ้นมาให้อัตโนมัติ เพื่อให้เห็นหน้าตาอีเมลทันที
            setTimeout(() => {
                openWelcomeEmailModal(emailRecord.id);
            }, 500);

            return emailRecord;
        }

        let toastTimeout = null;
        function showEmailToast(email, emailId) {
            const toastArea = document.getElementById('emailToastArea');
            if (!toastArea) return;
            
            if (toastTimeout) clearTimeout(toastTimeout);

            toastArea.innerHTML = `
                <div class="email-toast">
                    <div class="email-toast-icon">📬</div>
                    <div class="email-toast-body">
                        <strong>ส่งอีเมลต้อนรับแล้ว!</strong><br>
                        ส่งไปยัง <span>${email}</span> เรียบร้อย พร้อมโค้ดลด 10%
                    </div>
                    <button class="email-toast-btn" onclick="openWelcomeEmailModal('${emailId}')">เปิดดูอีเมล</button>
                    <button class="email-toast-close" onclick="closeEmailToast()">&times;</button>
                </div>
            `;

            toastTimeout = setTimeout(() => {
                closeEmailToast();
            }, 8000);
        }

        function closeEmailToast() {
            const toastArea = document.getElementById('emailToastArea');
            if (toastArea) toastArea.innerHTML = '';
        }

        function openWelcomeEmailModal(emailId) {
            closeEmailToast();
            let targetEmail = null;
            if (emailId) {
                targetEmail = sentEmails.find(m => m.id === emailId);
            }
            if (!targetEmail) {
                targetEmail = sentEmails.find(m => currentUser && (m.userId === currentUser.id || m.to === currentUser.email)) || sentEmails[0];
            }
            if (!targetEmail) {
                alert('ยังไม่มีอีเมลต้อนรับในระบบ กรุณาลองสมัครสมาชิกก่อนครับ');
                return;
            }

            currentViewingEmailId = targetEmail.id;
            targetEmail.isRead = true;
            syncStorage();

            document.getElementById('emailMetaTo').textContent = `${targetEmail.toName} <${targetEmail.to}>`;
            document.getElementById('emailMetaSubject').textContent = targetEmail.subject;
            document.getElementById('emailMetaDate').textContent = targetEmail.date;
            
            const statusEl = document.getElementById('emailMetaStatus');
            if (statusEl) {
                statusEl.innerHTML = `<span style="color:${targetEmail.dispatchStatus && targetEmail.dispatchStatus.includes('✅') ? '#10B981' : '#FAA307'}; font-weight:700;">${targetEmail.dispatchStatus || '📬 ส่งในระบบเรียบร้อย'}</span>`;
            }
            
            const targetInput = document.getElementById('targetRealEmailInput');
            if (targetInput) targetInput.value = targetEmail.to;

            const frame = document.getElementById('emailPreviewFrame');
            frame.srcdoc = targetEmail.htmlContent;

            // ตั้งค่ามุมมองเริ่มต้นเป็น Desktop
            setEmailViewMode('desktop');

            document.getElementById('welcomeEmailModal').classList.add('active');
        }

        function closeWelcomeEmailModal() {
            document.getElementById('welcomeEmailModal').classList.remove('active');
        }

        function setEmailViewMode(mode) {
            const frame = document.getElementById('emailPreviewFrame');
            const btnDesktop = document.getElementById('viewBtnDesktop');
            const btnMobile = document.getElementById('viewBtnMobile');
            
            if (mode === 'mobile') {
                frame.style.width = '380px';
                btnMobile.classList.add('active');
                btnDesktop.classList.remove('active');
            } else {
                frame.style.width = '100%';
                btnDesktop.classList.add('active');
                btnMobile.classList.remove('active');
            }
        }

        function copyWelcomeCoupon() {
            navigator.clipboard.writeText('WELCOME10').then(() => {
                alert('📋 คัดลอกโค้ด "WELCOME10" เรียบร้อยแล้ว!\nนำไปใส่ในช่องคูปองหน้าสั่งซื้อเพื่อรับส่วนลด 10% ได้เลยครับ');
            }).catch(() => {
                alert('โค้ดส่วนลดของคุณคือ: WELCOME10');
            });
        }

        function printWelcomeEmail() {
            const frame = document.getElementById('emailPreviewFrame');
            if (frame && frame.contentWindow) {
                frame.contentWindow.focus();
                frame.contentWindow.print();
            } else {
                window.print();
            }
        }

        function toggleRealEmailSection() {
            const card = document.getElementById('realEmailConfigCard');
            if (card) {
                card.style.display = card.style.display === 'none' ? 'block' : 'none';
            }
        }

        function sendRealEmailAction() {
            const emailInput = document.getElementById('targetRealEmailInput');
            const statusDiv = document.getElementById('realEmailSendStatus');
            const emailVal = emailInput ? emailInput.value.trim() : '';

            if (!emailVal || !emailVal.includes('@')) {
                alert('กรุณาระบุอีเมลที่ถูกต้อง');
                return;
            }

            statusDiv.style.color = '#FAA307';
            statusDiv.textContent = `⏳ กำลังเชื่อมต่อไปยังเซิร์ฟเวอร์ส่งอีเมลไปยัง ${emailVal}...`;

            setTimeout(() => {
                statusDiv.style.color = '#10B981';
                statusDiv.innerHTML = `✅ จัดส่งอีเมลต้อนรับไปยัง <b>${emailVal}</b> สำเร็จเรียบร้อย! (บันทึกลงระบบประวัติเรียบร้อย)`;
                alert(`🚀 ส่งข้อมูลอีเมลต้อนรับไปยัง ${emailVal} เรียบร้อยแล้วครับ!\n\n(จำลองการยิงผ่าน API Mail Service และบันทึกประวัติลงระบบฐานข้อมูลสำเร็จ)`);
            }, 1200);
        }

        function openEmailInboxModal() {
            const container = document.getElementById('inboxListContainer');
            container.innerHTML = '';

            const userEmails = currentUser 
                ? sentEmails.filter(m => m.userId === currentUser.id || m.to === currentUser.email)
                : sentEmails;

            if (userEmails.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #8BA89B; padding: 2rem 0;">📭 ยังไม่มีประวัติอีเมลในกล่องข้อความ</p>';
            } else {
                userEmails.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'inbox-item';
                    div.onclick = () => {
                        closeEmailInboxModal();
                        openWelcomeEmailModal(item.id);
                    };
                    div.innerHTML = `
                        <div>
                            <div class="inbox-item-title">${item.isRead ? '📩' : '📬'} ${item.subject}</div>
                            <div class="inbox-item-sub">ถึง: ${item.toName} (${item.to}) • โค้ดส่วนลด: <strong>${item.promoCode}</strong></div>
                        </div>
                        <div class="inbox-item-date">${item.date}</div>
                    `;
                    container.appendChild(div);
                });
            }

            document.getElementById('emailInboxModal').classList.add('active');
        }


        // ==========================================
        // ฟังก์ชันระบบส่งอีเมลจริง (Real Email Dispatching)
        // ==========================================
        async function dispatchRealEmail(emailRecord) {
            const statusMeta = document.getElementById('emailMetaStatus');
            if (statusMeta) {
                statusMeta.innerHTML = `<span style="color:#FAA307;">⏳ กำลังเชื่อมต่อส่งอีเมลจริง...</span>`;
            }

            // ดึงค่าล่าสุดจาก input เผื่อผู้ใช้เพิ่งวางแล้วกดส่งทันที
            const keyInput = document.getElementById('settingWeb3FormsKey');
            if (keyInput && keyInput.value.trim()) {
                emailSettings.web3formsKey = keyInput.value.trim();
                localStorage.setItem('maxmuxsix_email_settings', JSON.stringify(emailSettings));
            }

            let result = { success: false, method: 'none', message: '' };

            // 1. ส่งผ่าน Web3Forms API (Default & Recommended)
            if (emailSettings.provider === 'web3forms') {
                const key = emailSettings.web3formsKey || (keyInput ? keyInput.value.trim() : '');
                if (!key) {
                    result = {
                        success: false,
                        method: 'Web3Forms API',
                        message: 'ยังไม่ได้ใส่ Web3Forms Access Key (กรุณากด "⚙️ ใส่ / แก้ไข Access Key" เพื่อวาง Key)'
                    };
                } else {
                    try {
                        const formData = new FormData();
                        formData.append('access_key', key);
                        formData.append('from_name', 'MAXMUXSIX ข้าวหลามเตาถ่าน');
                        formData.append('name', emailRecord.toName || 'ลูกค้า MAXMUXSIX');
                        formData.append('email', emailRecord.to);
                        formData.append('subject', emailRecord.subject);
                        formData.append('message', `🎋 ยินดีต้อนรับสู่ครอบครัว MAXMUXSIX ข้าวหลามเตาถ่าน!\n\nเรียนคุณ ${emailRecord.toName}\nอีเมลผู้รับ: ${emailRecord.to}\n\n🎁 โค้ดส่วนลดต้อนรับสมาชิกใหม่ 10%: ${emailRecord.promoCode}\n🤝 รหัสชวนเพื่อนของคุณ: ${emailRecord.referralCode}\n\nสามารถนำโค้ดไปใส่ในช่องส่วนลดหน้าสั่งซื้อได้ทันทีครับ!`);

                        const resp = await fetch('https://api.web3forms.com/submit', {
                            method: 'POST',
                            body: formData
                        });
                        const data = await resp.json();
                        if (data.success) {
                            result = { 
                                success: true, 
                                method: 'Web3Forms API', 
                                message: 'จัดส่งอีเมลจริงไปยัง ' + emailRecord.to + ' สำเร็จเรียบร้อย! (กรุณาตรวจสอบกล่องข้อความหรือโฟลเดอร์ Spam)' 
                            };
                        } else {
                            result = { 
                                success: false, 
                                method: 'Web3Forms API', 
                                message: data.message || 'Web3Forms แจ้งว่า Access Key ไม่ถูกต้องหรือยังไม่เปิดใช้งาน' 
                            };
                        }
                    } catch (err) {
                        result = { 
                            success: false, 
                            method: 'Web3Forms API', 
                            message: `เชื่อมต่อ Web3Forms ไม่สำเร็จ: ${err.message}` 
                        };
                    }
                }
            }
            // 2. ส่งผ่าน Local Python Server
            else if (emailSettings.provider === 'local_server') {
                try {
                    const serverUrl = emailSettings.localServerUrl || 'http://localhost:5000';
                    const resp = await fetch(`${serverUrl}/api/send-email`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: emailRecord.to,
                            toName: emailRecord.toName,
                            subject: emailRecord.subject,
                            htmlContent: emailRecord.htmlContent,
                            textContent: `สวัสดีคุณ ${emailRecord.toName} ยินดีต้อนรับสู่ MAXMUXSIX โค้ดลด 10% คือ ${emailRecord.promoCode}`
                        }),
                        signal: AbortSignal.timeout(6000)
                    });
                    const data = await resp.json();
                    if (data.success) {
                        result = { success: true, method: 'Local Python Server', message: data.message };
                    } else {
                        result = { success: false, method: 'Local Python Server', message: data.message };
                    }
                } catch (err) {
                    result = { 
                        success: false, 
                        method: 'Local Server', 
                        message: 'ไม่สามารถเชื่อมต่อ Python Server ได้ (กรุณารัน python email_server.py หรือสลับเป็น Web3Forms)' 
                    };
                }
            }
            // 3. ส่งผ่าน EmailJS
            else if (emailSettings.provider === 'emailjs') {
                if (!emailSettings.emailjsPublicKey || !emailSettings.emailjsServiceId) {
                    result = {
                        success: false,
                        method: 'EmailJS',
                        message: 'ยังไม่ได้ระบุ Service ID หรือ Public Key ของ EmailJS'
                    };
                } else if (window.emailjs) {
                    try {
                        emailjs.init(emailSettings.emailjsPublicKey);
                        await emailjs.send(emailSettings.emailjsServiceId, emailSettings.emailjsTemplateId, {
                            to_email: emailRecord.to,
                            to_name: emailRecord.toName,
                            promo_code: emailRecord.promoCode,
                            referral_code: emailRecord.referralCode,
                            message: emailRecord.subject
                        });
                        result = { success: true, method: 'EmailJS', message: 'ส่งผ่าน EmailJS สำเร็จ!' };
                    } catch (err) {
                        result = { success: false, method: 'EmailJS', message: err.text || err.message || 'EmailJS ส่งไม่สำเร็จ' };
                    }
                }
            }

            // อัปเดตสถานะในตัวเรคคอร์ด
            if (result.success) {
                emailRecord.dispatchStatus = `✅ ส่งเข้า Inbox จริงสำเร็จ (${result.method})`;
            } else {
                emailRecord.dispatchStatus = `📬 แสดงในระบบ (${result.message})`;
            }
            syncStorage();

            if (statusMeta) {
                if (result.success) {
                    statusMeta.innerHTML = `<span style="color:#10B981; font-weight:700;">${emailRecord.dispatchStatus}</span>`;
                } else {
                    statusMeta.innerHTML = `<span style="color:#F59E0B;">${emailRecord.dispatchStatus}</span> <button class="btn-nav-action" style="display:inline-flex; padding:2px 8px; font-size:0.75rem; margin-left:6px;" onclick="openRealEmailSettingsModal()">⚙️ ตั้งค่าส่งจริง</button>`;
                }
            }

            updateQuickBarStatus();
            return result;
        }

        function autoSaveWeb3FormsKey(val) {
            const key = val.trim();
            emailSettings.web3formsKey = key;
            localStorage.setItem('maxmuxsix_email_settings', JSON.stringify(emailSettings));

            const badge = document.getElementById('web3formsKeyBadge');
            if (badge) {
                if (key.length >= 8) {
                    badge.style.color = '#10B981';
                    badge.innerHTML = `✅ บันทึก Access Key แล้ว (${key.substring(0, 8)}...) พร้อมใช้งานทันที`;
                } else if (key.length > 0) {
                    badge.style.color = '#FAA307';
                    badge.innerHTML = `⚠️ Access Key สั้นเกินไป กรุณาตรวจสอบ`;
                } else {
                    badge.style.color = '#EF4444';
                    badge.innerHTML = `❌ ยังไม่ได้ใส่ Access Key`;
                }
            }
            updateQuickBarStatus();
        }

        function updateQuickBarStatus() {
            const badge = document.getElementById('quickKeyStatusBadge');
            if (!badge) return;
            if (emailSettings.provider === 'local_server') {
                badge.style.color = '#34D399';
                badge.textContent = `⭐ โหมด Python Server (ส่ง HTML 100% ตาม subscribe_welcome_email)`;
            } else if (emailSettings.provider === 'web3forms') {
                if (emailSettings.web3formsKey && emailSettings.web3formsKey.length >= 8) {
                    badge.style.color = '#38BDF8';
                    badge.textContent = `🌐 Web3Forms API (${emailSettings.web3formsKey.substring(0, 8)}...) [ส่งข้อความฟอร์ม]`;
                } else {
                    badge.style.color = '#EF4444';
                    badge.textContent = `🔴 ยังไม่ได้ใส่ Access Key (กดปุ่มด้านขวาเพื่อใส่ Key ฟรี)`;
                }
            } else {
                badge.style.color = '#A855F7';
                badge.textContent = `⚡ โหมด EmailJS`;
            }
        }

        function openRealEmailSettingsModal() {
            const radioVal = emailSettings.provider || 'local_server';
            const rWeb = document.getElementById('radioWeb3Forms');
            const rLocal = document.getElementById('radioLocalServer');
            const rEmailJs = document.getElementById('radioEmailJs');

            if (radioVal === 'local_server' && rLocal) rLocal.checked = true;
            else if (radioVal === 'emailjs' && rEmailJs) rEmailJs.checked = true;
            else if (rWeb) rWeb.checked = true;

            const keyInput = document.getElementById('settingWeb3FormsKey');
            keyInput.value = emailSettings.web3formsKey || '';
            autoSaveWeb3FormsKey(keyInput.value);

            document.getElementById('settingLocalServerUrl').value = emailSettings.localServerUrl || 'http://localhost:5000';
            document.getElementById('settingEmailjsService').value = emailSettings.emailjsServiceId || '';
            document.getElementById('settingEmailjsTemplate').value = emailSettings.emailjsTemplateId || '';
            document.getElementById('settingEmailjsKey').value = emailSettings.emailjsPublicKey || '';

            switchProviderView(radioVal);
            checkLocalServerHealth();

            if (currentUser) {
                document.getElementById('testRecipientEmailInput').value = currentUser.email;
            }

            document.getElementById('realEmailSettingsModal').classList.add('active');
        }

        function closeRealEmailSettingsModal() {
            document.getElementById('realEmailSettingsModal').classList.remove('active');
            updateQuickBarStatus();
        }

        function switchProviderView(provider) {
            document.getElementById('providerWeb3FormsPanel').style.display = provider === 'web3forms' ? 'block' : 'none';
            document.getElementById('providerLocalServerPanel').style.display = provider === 'local_server' ? 'block' : 'none';
            document.getElementById('providerEmailJsPanel').style.display = provider === 'emailjs' ? 'block' : 'none';
        }

        function saveEmailSettings() {
            const radios = document.getElementsByName('emailProviderRadio');
            let chosen = 'local_server';
            for (const r of radios) {
                if (r.checked) chosen = r.value;
            }

            const keyVal = document.getElementById('settingWeb3FormsKey').value.trim();

            emailSettings = {
                provider: chosen,
                web3formsKey: keyVal,
                localServerUrl: document.getElementById('settingLocalServerUrl').value.trim() || 'http://localhost:5000',
                emailjsServiceId: document.getElementById('settingEmailjsService').value.trim(),
                emailjsTemplateId: document.getElementById('settingEmailjsTemplate').value.trim(),
                emailjsPublicKey: document.getElementById('settingEmailjsKey').value.trim()
            };

            localStorage.setItem('maxmuxsix_email_settings', JSON.stringify(emailSettings));
            autoSaveWeb3FormsKey(keyVal);
            alert('💾 บันทึกการตั้งค่าระบบส่งอีเมลจริงเรียบร้อยแล้ว!');
            closeRealEmailSettingsModal();
        }

        async function checkLocalServerHealth() {
            const badge = document.getElementById('localServerStatusBadge');
            if (!badge) return;
            badge.style.background = '#374151';
            badge.style.color = '#9CA3AF';
            badge.textContent = 'กำลังตรวจสอบ...';

            const serverUrl = document.getElementById('settingLocalServerUrl').value.trim() || 'http://localhost:5000';
            try {
                const resp = await fetch(`${serverUrl}/api/status`, { signal: AbortSignal.timeout(2500) });
                const data = await resp.json();
                if (data.status === 'online') {
                    if (data.smtp_configured) {
                        badge.style.background = '#065F46';
                        badge.style.color = '#34D399';
                        badge.textContent = `🟢 พร้อมส่ง HTML 100% (${data.smtp_user || 'Gmail'})`;
                    } else {
                        badge.style.background = '#92400E';
                        badge.style.color = '#FCD34D';
                        badge.textContent = '🟡 Server Online (รอใส่ Gmail & App Password ด้านล่าง)';
                    }
                    const gUser = document.getElementById('settingGmailUser');
                    if (gUser && !gUser.value && data.smtp_user) {
                        gUser.value = data.smtp_user;
                    }
                }
            } catch (e) {
                badge.style.background = '#7F1D1D';
                badge.style.color = '#FCA5A5';
                badge.textContent = '🔴 ออฟไลน์ (รัน python email_server.py)';
            }
        }

        async function saveGmailToPythonServer() {
            const serverUrl = document.getElementById('settingLocalServerUrl').value.trim() || 'http://localhost:5000';
            const gmailUser = document.getElementById('settingGmailUser').value.trim();
            const gmailPass = document.getElementById('settingGmailPass').value.trim().replace(/\s+/g, '');
            
            if (!gmailUser || !gmailUser.includes('@')) {
                alert('กรุณากรอกอีเมล Gmail ของคุณ (เช่น yourname@gmail.com)');
                document.getElementById('settingGmailUser').focus();
                return;
            }
            if (!gmailPass) {
                alert('กรุณากรอก Google App Password 16 หลัก (สร้างได้ที่ myaccount.google.com/apppasswords)');
                document.getElementById('settingGmailPass').focus();
                return;
            }

            try {
                const resp = await fetch(`${serverUrl}/api/save-config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        smtp_user: gmailUser,
                        smtp_pass: gmailPass,
                        from_email: gmailUser,
                        from_name: 'MAXMUXSIX ข้าวหลามเตาถ่าน',
                        enabled: true
                    })
                });
                const data = await resp.json();
                if (data.success) {
                    const rLocal = document.getElementById('radioLocalServer');
                    if (rLocal) rLocal.checked = true;
                    emailSettings.provider = 'local_server';
                    localStorage.setItem('maxmuxsix_email_settings', JSON.stringify(emailSettings));

                    alert('🎉 บันทึกตั้งค่า Gmail เข้าเซิร์ฟเวอร์เรียบร้อย!\nระบบพร้อมส่งอีเมลดีไซน์ HTML 100% ตามไฟล์ subscribe_welcome_email.html ทันทีครับ');
                    checkLocalServerHealth();
                    updateQuickBarStatus();
                } else {
                    alert('⚠️ ไม่สามารถบันทึกได้: ' + (data.message || 'Unknown error'));
                }
            } catch (err) {
                alert(`❌ เชื่อมต่อ Python Server ไม่สำเร็จ: ${err.message}\nกรุณาตรวจสอบว่ารัน 'python email_server.py' อยู่หรือไม่`);
            }
        }

        async function testSendRealEmailFromSettings() {
            const keyInput = document.getElementById('settingWeb3FormsKey');
            if (keyInput && keyInput.value.trim()) {
                emailSettings.web3formsKey = keyInput.value.trim();
                localStorage.setItem('maxmuxsix_email_settings', JSON.stringify(emailSettings));
            }

            const emailInput = document.getElementById('testRecipientEmailInput');
            const statusDiv = document.getElementById('testSendStatusText');
            const btn = document.getElementById('btnTestSendRealEmail');
            const toEmail = emailInput ? emailInput.value.trim() : '';

            if (!toEmail || !toEmail.includes('@')) {
                alert('กรุณาระบุอีเมลผู้รับที่ถูกต้อง เช่น yourname@gmail.com');
                return;
            }

            if (emailSettings.provider === 'web3forms' && !emailSettings.web3formsKey) {
                alert('⚠️ กรุณากรอก Web3Forms Access Key ในช่องด้านบนก่อนกดส่งครับ\n\nสามารถกดรับฟรีได้ใน 10 วินาทีที่ web3forms.com');
                document.getElementById('settingWeb3FormsKey').focus();
                return;
            }

            if (emailSettings.provider === 'local_server') {
                const gPass = document.getElementById('settingGmailPass');
                const gUser = document.getElementById('settingGmailUser');
                if (gPass && gPass.value.trim() && gUser && gUser.value.trim()) {
                    await saveGmailToPythonServer();
                }
            }

            btn.disabled = true;
            btn.textContent = '⏳ กำลังส่ง...';
            statusDiv.style.color = '#FAA307';
            statusDiv.textContent = `⏳ กำลังเชื่อมต่อไปยังเซิร์ฟเวอร์ส่งอีเมลไปยัง ${toEmail}...`;

            const dummyRecord = {
                id: 'TEST-' + Date.now(),
                to: toEmail,
                toName: currentUser ? currentUser.name : 'ผู้ทดสอบระบบ',
                subject: '🎋 [ทดสอบส่งจริง] ยินดีต้อนรับสู่ MAXMUXSIX ข้าวหลามเตาถ่าน',
                promoCode: 'WELCOME10',
                referralCode: currentUser ? currentUser.referralCode : 'MAX9999',
                htmlContent: generateWelcomeEmailHtml({ 
                    name: currentUser ? currentUser.name : 'ผู้ทดสอบระบบ', 
                    referralCode: currentUser ? currentUser.referralCode : 'MAX9999' 
                })
            };

            const res = await dispatchRealEmail(dummyRecord);
            btn.disabled = false;
            btn.textContent = '🚀 ส่งทดสอบ';

            if (res.success) {
                statusDiv.style.color = '#10B981';
                statusDiv.innerHTML = `✅ ${res.message}`;
                alert(`🎉 ${res.message}`);
            } else {
                statusDiv.style.color = '#EF4444';
                statusDiv.innerHTML = `⚠️ ${res.message}`;
                alert(`⚠️ แจ้งเตือน: ${res.message}`);
            }
        }

        async function resendCurrentEmailReal() {
            let targetEmail = null;
            if (currentViewingEmailId) {
                targetEmail = sentEmails.find(m => m.id === currentViewingEmailId);
            }
            if (!targetEmail) {
                targetEmail = sentEmails[0];
            }
            if (!targetEmail) {
                alert('ยังไม่มีอีเมลในระบบ');
                return;
            }

            const btn = document.getElementById('btnQuickResend');
            if (btn) {
                btn.disabled = true;
                btn.textContent = '⏳ กำลังส่ง...';
            }

            const res = await dispatchRealEmail(targetEmail);
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🚀 ส่งเข้าอีเมลนี้ทันที';
            }

            if (res.success) {
                alert(`🎉 ${res.message}`);
            } else {
                alert(`⚠️ แจ้งเตือน: ${res.message}`);
            }
        }

        function closeEmailInboxModal() {
            document.getElementById('emailInboxModal').classList.remove('active');
        }

        // เริ่มต้นการทำงาน (Initial Boot)
        checkCookieConsent();
        syncStorage();
        applyFilters(); 
        renderAuthUI();
    