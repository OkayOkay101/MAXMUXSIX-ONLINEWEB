# User guide

This guide is for people who browse the MAXMUXSIX demo store. Each task has the same parts: goal, what to prepare, steps, result, and what to do if it fails.

**Demo notice:** the site is a sample. It does not sell, deliver, or take payments. The page shows this notice in several places: *"เว็บตัวอย่าง ไม่มีการขายหรือจัดส่งจริง ห้ามโอนเงิน"* (sample site; no real sales or delivery; do not transfer money).

Tasks marked **not verified** have not been run end to end in this repo. Test them before you rely on them.

## 1. Browse the menu

**Goal:** find a sticky rice product on the front page.

**Before you start:** open the site in a browser (see the README for how to serve it locally).

**Steps:**
1. Scroll to the product section that starts with the heading "เมนูข้าวหลาม MAXMUXSIX".
2. Type in the search box (placeholder "🔍 ค้นหาเมนู เช่น ถั่วดำ, ช็อตมะพร้าว, สังขยา...") to narrow the list.
3. Use any other filter controls above the list to narrow the products further.

**Result:** the list shows only the products that match your search and filters.

**If it fails:** the list shows "ไม่พบรายการข้าวหลามที่ค้นหา!". Clear the search box and try again.

![Storefront](../store_front.jpg)

## 2. Add items to the cart

**Goal:** put one or more products in your cart.

**Steps:**
1. On a product card, press "🛒 เพิ่มลงตะกร้า" or "🛒 เพิ่มลงตะกร้าเลย".
2. Open the cart from the "ตะกร้า" button.
3. Check the items under "ตะกร้าของคุณ".

**Result:** the cart lists each product you added.

**Checkout:** press "ไปชำระเงิน →". The payment step is a sample. Do not send money (see the demo notice).

*Screenshot pending: cart view.*

## 3. Apply a coupon code

**Goal:** get a 10% discount with a coupon code.

**Steps:**
1. Open the cart.
2. In the coupon box (placeholder "พิมพ์ MAX10 เพื่อลด 10%"), type the code and confirm.

| Code | Rule | Message on success | Message if not met |
|---|---|---|---|
| `MAX10` | Subtotal of at least 150 baht | "✅ ใช้โค้ดสำเร็จ! ได้รับส่วนลด 10%" | "⚠️ ซื้อขั้นต่ำ 150 บาทเพื่อใช้โค้ดนี้" |
| `WELCOME10` | No minimum | "🎉 โค้ดต้อนรับสมาชิกใหม่สำเร็จ! ได้รับส่วนลด 10%" | Not applicable |

**Result:** the success message appears and the total drops by 10%.

**If it fails:** read the message under the coupon box. It tells you the rule that was not met.

## 4. Sign up and confirm your email *(not verified)*

**Goal:** create a member account.

**Before you start:** the membership system needs a Supabase project set up (see [configuration](configuration.md)). You need an email address you can open.

**Steps:**
1. Open the membership area ("บัญชีสมาชิก MAXMUXSIX").
2. Press "สมัครสมาชิกใหม่".
3. Enter your email (for example `yourname@email.com`), a password, and your details.
4. Open the confirmation email and follow the link.
5. Return to the site and sign in (task 5).

**Result:** after you confirm the email, sign-in works.

**If it fails:** the form shows "กรุณากรอกอีเมลให้ถูกต้อง" when the email format is wrong. Fix the email and try again.

*Screenshot pending: sign-up form.*

## 5. Sign in *(not verified)*

**Goal:** sign in with an account you already confirmed.

**Steps:**
1. Open the membership area and press "เข้าสู่ระบบ".
2. Enter your email and password.
3. Submit the form.

**Result:** you are signed in.

**If it fails:** the form shows "เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบข้อมูลและลองใหม่". Check the email and password, then try again. Too many failed attempts block sign-in for 5 minutes (see [configuration](configuration.md)).

## 6. Reset your password *(not verified)*

**Goal:** set a new password when you forget the old one.

**Steps:**
1. Open the membership area and press "ลืมรหัสผ่าน?".
2. Enter your email and submit.
3. Open the reset email and follow the link.
4. Set a new password.

**Result:** you can sign in with the new password.

**If it fails:** the reset email link returns to the address in the `redirectUrl` setting (see [configuration](configuration.md)). Check that this address matches the site you opened. Not verified: the email delivery itself.

## 7. Get a subscriber discount code *(not verified)*

**Goal:** receive a discount code by email.

**Steps:**
1. Scroll to the section titled "สมัครรับข่าวสาร & รับโค้ดส่วนลด 10%".
2. Enter your email and submit.

**Result:** the page confirms the request. The discount email is not verified in this repo.

**If it fails:** the form limits you to 5 subscribe attempts per hour.

*Screenshot pending: subscribe section.*

## Related guides

- [Configuration](configuration.md): settings and defaults
- [Development](development.md): install, test, and build
