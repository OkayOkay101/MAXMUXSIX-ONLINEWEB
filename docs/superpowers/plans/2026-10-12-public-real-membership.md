# Public Real Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ให้บุคคลทั่วไปเปิดรายชื่อแบบไม่เปิดเผยข้อมูลติดต่อ เชิญสมาชิก และลบบัญชีลูกค้า MAXMUXSIX จริง โดยผู้ทำรายการไม่ต้องเข้าสู่ระบบหรือมีบทบาท admin

**Architecture:** เพิ่ม Edge Function `public-members` แยกจาก `admin-users` เดิม โดยสิทธิ์ server อยู่เฉพาะ Edge environment; คง profile RLS และสิทธิ์แก้สินค้าเดิม เพิ่ม `publicMembers()` ใน adapter และเปลี่ยน modal สมาชิกให้เรียก API ใหม่นี้ สวิตช์ `PUBLIC_MEMBERS_ENABLED` ปิดเป็นค่าเริ่มต้นและเปิดหลังตรวจระบบ โดยการส่งคำเชิญยังขึ้นกับบริการเมลที่มีอยู่ ไม่ปิดการยืนยันอีเมลแทนการตั้งค่าเมล

**Tech Stack:** Vanilla HTML/JavaScript, Node.js test runner, Supabase JS 2.117.3 ที่ bundle อยู่แล้ว, Supabase Edge/Deno, Playwright fixture เดิม; ไม่เพิ่ม dependency หรือ database migration

**Spec:** `docs/superpowers/specs/2026-10-12-public-real-membership-design.md` — ผู้ใช้อนุมัติแล้ว 12 ตุลาคม 2026

## Global Constraints

- “ไม่ตรวจ user JWT หรือบทบาท admin ใน API ใหม่นี้” — หมายถึงสิทธิ์ของผู้ทำรายการ ไม่ใช่การปิด email confirmation สำหรับผู้รับคำเชิญ
- “รายชื่อแสดงรหัสสมาชิก UUID และป้าย `สมาชิก` เท่านั้น ครั้งละ 25 บัญชี”
- “ไม่แสดงหรือส่งกลับชื่อจริง อีเมล เบอร์โทร ที่อยู่ referral code หรือข้อมูล session”
- “เซิร์ฟเวอร์มีสวิตช์ `PUBLIC_MEMBERS_ENABLED` ค่าเริ่มต้นปิด”
- “อนุญาตเฉพาะ POST/OPTIONS, body ไม่เกิน 4096 bytes”
- “ไม่เพิ่มคำสั่งลบจำนวนมาก ไม่เพิ่มการแก้ role/password/email หรือการอ่านข้อมูลลูกค้าโดยบุคคลทั่วไป”
- “คง `admin-users`, private role table และ profile RLS เดิม”
- “ไม่สมัครบริการเมล ไม่ปิด Confirm email ไม่ auto-confirm”
- “การทดสอบ mutation จริงต้องใช้บัญชีทดสอบที่กำหนดไว้ชัดเจนและการส่งเมลต้องได้รับอนุญาตแยก”
- บุคคลทั่วไปยังสามารถตั้งใจลบทุกบัญชีทีละรายได้ตามความต้องการที่อนุมัติ CORS, input validation และ confirm dialog ไม่ใช่ authorization
- อย่าแก้หรือ stage `output/`, `tmp/`, `assets/maxmuxsix-seo-metadata-ai.png` ที่มีอยู่เดิม; ห้ามเผย service-role credential หรืออ่านค่ารหัสลับผ่าน browser
- ยังไม่ลงมือพัฒนาหรือ deploy จนผู้ใช้ทบทวนแผนนี้และเลือก execution method; อ่าน TDD และ verification skills ก่อนเริ่ม implementation

## Review Focus

1. Auth มีบัญชีที่ไม่มี MAXMUXSIX profile หรือ profile หายระหว่าง list/delete: ห้ามคืนหรือลบบัญชีที่ไม่มี profile; ส่ง 404 เมื่อไม่พบเป้าหมาย (Task 1)
2. SDK ส่ง expired/forged session header อัตโนมัติ: public API ต้องไม่ตรวจ actor JWT; adapter ต้องไม่เรียก refresh หรือเปลี่ยนตัวตนเพียงเพราะเปิดรายชื่อ (Tasks 1–2)
3. Body ภาษาไทยหลายไบต์หรือ streaming body ไม่ใส่ Content-Length: จำกัดจำนวน bytes จริงก่อน JSON parse และไม่มี provider call เมื่อเกิน (Task 1)
4. Auth state เปลี่ยน, logout, หรือปิด/เปิด modal ระหว่าง request: modal สาธารณะไม่ขึ้นกับ isAdmin และ response เก่าไม่ทับการเปิดใหม่ (Task 3)
5. ลบแถวสุดท้ายของหน้า, ลบสมาชิกที่มี role admin, หรือ API ส่งข้อมูลส่วนตัวเกินสัญญา: pagination ยังใช้งานได้และ UI ไม่อ่าน/แสดง PII; public deletion ไม่ป้องกัน role admin แต่สิทธิ์แก้สินค้าไม่เปิดตาม (Tasks 1, 3–4)

---

## File Structure and Interfaces

| File | Responsibility |
| --- | --- |
| `supabase/functions/public-members/handler.mjs` (new) | Public HTTP contract, bounded body parser, explicit response projection, scoped backend |
| `supabase/functions/public-members/index.ts` (new) | Deno wiring, environment flag and server-only SDK client |
| `supabase/config.toml` | Gateway setting for the new function only |
| `assets/js/cloud-auth.js` | Add public adapter method without changing `admin()`/login |
| `index.html` | Existing member modal/navigation, no new product-editor privileges |
| `tests/unit/15-public-members.test.js` (new) | Backend boundary and anonymous behavior |
| `tests/unit/11-cloud-auth.test.js` | Adapter contract and unchanged Auth behavior |
| `tests/unit/14-membership-ui.test.js` | Public UI, pagination and stale-response regressions |
| `tests/browser/membership.cjs` | Anonymous desktop/mobile flow with provider fixture |
| `docs/cloud-membership-setup.md` | Deployment, kill switch, irreversible effects and SMTP limitations |

Public backend interface:

```js
// createPublicSupabaseBackend(client)
// listUsers(page, perPage) -> { users: [{id, ...providerFields}], nextPage? }
// memberIds(ids: string[]) -> string[]  (SELECT id only from profiles)
// invite({ email, name, redirectTo }) -> void
// delete(id: string) -> void
// No getUser(), adminIds(), role assignment or user-metadata authorization.
```

HTTP success shapes:

```js
// POST {action:'list', page:1}
({page:1, hasNext:false, users:[{id:'22222222-2222-4222-8222-222222222222'}]});
// POST {action:'invite', name:'ผู้รับ', email:'recipient@example.com'}
({ok:true}); // provider accepted invitation, not proof of delivery/login
// POST {action:'delete', id:'22222222-2222-4222-8222-222222222222'}
({ok:true}); // actual Auth deletion, no localStorage simulation
```

Statuses: 200 success; 204 allowed preflight; 400 malformed/invalid/oversized input; 403 wrong origin; 404 unknown/non-member deletion target; 405 method rejected; 500 provider failure with generic Thai message; 503 switch disabled. Responses use `Cache-Control: no-store`. List can be empty while `hasNext=true` because pagination follows Auth pages before membership filtering; keep Next enabled in that case.

## Execution Preflight (after plan approval, before implementation)

- [ ] Read the approved spec and this whole plan; read TDD, verification and the chosen execution skill.
- [ ] Inspect `git status --short`, current branch and worktree metadata; preserve existing user files. Follow using-git-worktrees if execution needs an isolated worktree; never overwrite the user's current checkout to create one.
- [ ] Refresh Supabase changelog/docs **before writing implementation code**, following the Supabase skill. Relevant official documentation: `https://supabase.com/docs/guides/functions/auth`, `https://supabase.com/docs/guides/functions/secrets`, `https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail`, `https://supabase.com/docs/reference/javascript/auth-admin-deleteuser`, `https://supabase.com/docs/guides/auth/auth-smtp`. Resolve documentation through MCP search_docs first. Stop on a contract mismatch; do not silently broaden the approved design.
- [ ] Run baseline `npm test` and record the actual result; do not use the previous session's test count as current proof.

### Task 1: Isolated Public Edge Function

**Files:**
- Create: `supabase/functions/public-members/handler.mjs`
- Create: `supabase/functions/public-members/index.ts`
- Modify: `supabase/config.toml`
- Test: `tests/unit/15-public-members.test.js`

**Interfaces:**
- Consumes: existing `public.profiles.id`, standard server environment and pinned SDK; does not change database grants
- Produces: `createPublicHandler({backend, siteUrl, enabled=false}) -> (Request -> Promise<Response>)` and `createPublicSupabaseBackend(client)` using the exact interface above

- [ ] **Step 1: Write the failing anonymous-boundary tests.** Start the test file with this fixture, then add the assertions below:

```js
const {test} = require('node:test');
const assert = require('node:assert/strict');
const modulePromise = import('../../supabase/functions/public-members/handler.mjs');
const ID = '22222222-2222-4222-8222-222222222222';
const OTHER = '33333333-3333-4333-8333-333333333333';
async function fixture(enabled=true, overrides={}) {
    const calls=[];
    const backend={
        listUsers:async(page, perPage)=>({users:[{id:ID,email:'private@example.com',user_metadata:{name:'private'}}],nextPage:null}),
        memberIds:async(ids)=>ids.filter(id=>id===ID),
        invite:async(input)=>{calls.push(['invite',input]);},
        delete:async(id)=>{calls.push(['delete',id]);},
        ...overrides
    };
    const {createPublicHandler}=await modulePromise;
    const handle=createPublicHandler({backend,siteUrl:'https://shop.example/store/',enabled});
    const request=(body,headers={})=>handle(new Request('https://test.supabase.co/functions/v1/public-members',{
        method:'POST',headers:{Origin:'https://shop.example','Content-Type':'application/json',...headers},
        body:typeof body==='string'?body:JSON.stringify(body)
    }));
    return {handle,request,calls};
}
test('anonymous list returns UUID only',async()=>{
    const f=await fixture();
    const result=await f.request({action:'list'});
    assert.equal(result.status,200);
    assert.deepEqual(await result.json(),{page:1,hasNext:false,users:[{id:ID}]});
});
test('disabled rejects all actions before backend writes',async()=>{
    const f=await fixture(false);
    for(const action of ['list','invite','delete']) assert.equal((await f.request({action,id:ID,name:'A',email:'a@example.com'})).status,503);
    assert.deepEqual(f.calls,[]);
});
test('anonymous may delete a member, never a non-member',async()=>{
    const f=await fixture();
    assert.equal((await f.request({action:'delete',id:OTHER})).status,404);
    assert.equal((await f.request({action:'delete',id:ID})).status,200);
    assert.deepEqual(f.calls,[['delete',ID]]);
});
test('forged actor and admin role are irrelevant to public operations',async()=>{
    const f=await fixture(true,{
        getUser:async()=>{throw new Error('must not check actor');},
        adminIds:async()=>{throw new Error('must not check role');}
    });
    assert.equal((await f.request({action:'list'},{Authorization:'Bearer expired'})).status,200);
    assert.equal((await f.request({action:'delete',id:ID},{Authorization:'Bearer forged'})).status,200);
    assert.deepEqual(f.calls,[['delete',ID]]);
});
test('filter non-members without losing next-page information',async()=>{
    const f=await fixture(true,{memberIds:async()=>[],listUsers:async()=>({users:[{id:OTHER}],nextPage:2})});
    assert.deepEqual(await (await f.request({action:'list'})).json(),{page:1,hasNext:true,users:[]});
});
test('validation and byte bounds prevent writes',async()=>{
    const f=await fixture();
    const thai=JSON.stringify({action:'invite',name:'ก'.repeat(1400),email:'a@example.com'});
    assert.ok(Buffer.byteLength(thai)>4096);
    for(const input of ['{',null,[], 'x'.repeat(4097),thai,
        {action:'list',page:0},{action:'list',page:1.5},{action:'list',page:10001},
        {action:'delete',id:'bad'},{action:'delete',ids:[ID]},
        {action:'invite',name:'',email:'a@example.com'},
        {action:'invite',name:'A',email:'bad'}, {action:'bulk-delete',ids:[ID]}]) {
        assert.equal((await f.request(input)).status,400);
    }
    assert.deepEqual(f.calls,[]);
});
test('unlabelled streaming body is bounded before dispatch',async()=>{
    const f=await fixture();
    const stream=new ReadableStream({start(controller){
        controller.enqueue(new Uint8Array(3000));controller.enqueue(new Uint8Array(3000));controller.close();
    }});
    const response=await f.handle(new Request('https://test.supabase.co/functions/v1/public-members',{
        method:'POST',headers:{Origin:'https://shop.example'},body:stream,duplex:'half'
    }));
    assert.equal(response.status,400);assert.deepEqual(f.calls,[]);
});
test('invitation ignores caller privilege/consent/options',async()=>{
    const f=await fixture();
    const response=await f.request({action:'invite',name:' New ',email:' NEW@EXAMPLE.COM ',role:'admin',
        consent:true,phone:'081',password:'caller-password',email_confirm:true,redirectTo:'https://evil.example'});
    assert.equal(response.status,200);
    assert.deepEqual(f.calls,[['invite',{name:'New',email:'new@example.com',redirectTo:'https://shop.example/store/'}]]);
});
test('origin and method checked; provider secrets never returned',async()=>{
    const f=await fixture(true,{delete:async()=>{throw new Error('secret-service-key');}});
    assert.equal((await f.request({action:'delete',id:ID},{Origin:'https://evil.example'})).status,403);
    for(const [method,expected] of [['GET',405],['OPTIONS',204]]) {
        const response=await f.handle(new Request('https://test.supabase.co/functions/v1/public-members',{
            method,headers:{Origin:'https://shop.example'}
        }));assert.equal(response.status,expected);
    }
    const failed=await f.request({action:'delete',id:ID});
    assert.equal(failed.status,500);assert.doesNotMatch(await failed.text(),/secret-service-key/);
});
```

- [ ] **Step 2: Run RED.** `node --test tests/unit/15-public-members.test.js` must fail because the imported module does not exist; record the failure before creating implementation files.
- [ ] **Step 3: Implement request parsing and HTTP dispatch.** Keep origin/method/flag checks before privileged work. Use this bounded reader in the handler; catch its error as generic 400 before dispatch:

```js
async function readInput(request) {
    if(Number(request.headers.get('content-length'))>4096) throw new Error('input');
    const reader=request.body?.getReader();
    const chunks=[]; let size=0;
    if(reader) {
        try {
            for(;;) {
                const {done,value}=await reader.read(); if(done) break;
                size+=value.byteLength;
                if(size>4096) {await reader.cancel().catch(()=>{}); throw new Error('input');}
                chunks.push(value);
            }
        } finally {reader.releaseLock();}
    }
    const bytes=new Uint8Array(size); let offset=0;
    for(const chunk of chunks) {bytes.set(chunk,offset);offset+=chunk.byteLength;}
    const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
    if(!input||typeof input!=='object'||Array.isArray(input)) throw new Error('input');
    return input;
}
```

Dispatch implementation requirements, with explicit projections:

```js
// list branch; validate page first: integer 1..10000, default 1
const result=await backend.listUsers(page,25);
const ids=result.users.map(user=>user.id);
const memberIds=new Set(ids.length?await backend.memberIds(ids):[]);
return response(200,{page,hasNext:Boolean(result.nextPage),users:ids.filter(id=>memberIds.has(id)).map(id=>({id}))});

// invite branch; validate trimmed name length 1..100 and normalized email <=254
// email regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
await backend.invite({email,name,redirectTo:siteUrl});
return response(200,{ok:true});

// delete branch; UUID regex: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
if(!(await backend.memberIds([input.id])).includes(input.id)) return response(404,{error:'ไม่พบสมาชิก'});
await backend.delete(input.id);
return response(200,{ok:true});
```

Only copy allowed input fields into these payloads. Do not forward role, consent, phone, redirectTo, auto-confirm, password or caller-supplied provider options. The known non-atomic profile-check/delete boundary must be documented; it cannot guarantee a concurrent external account mutation is serialized.

- [ ] **Step 4: Add the scoped provider adapter and Deno entry.** Use the following implementations, with exceptions caught by the handler as 500:

```js
export function createPublicSupabaseBackend(client) {
    const data=result=>{if(result.error) throw result.error; return result.data;};
    return {
        listUsers:async(page,perPage)=>data(await client.auth.admin.listUsers({page,perPage})),
        memberIds:async(ids)=>data(await client.from('profiles').select('id').in('id',ids)).map(row=>row.id),
        invite:async({email,name,redirectTo})=>data(await client.auth.admin.inviteUserByEmail(email,{redirectTo,data:{name}})),
        delete:async(id)=>data(await client.auth.admin.deleteUser(id))
    };
}
```

```ts
import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import {createPublicHandler,createPublicSupabaseBackend} from './handler.mjs';
const siteUrl=Deno.env.get('SITE_URL');
if(!siteUrl) throw new Error('SITE_URL must be configured');
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{
    auth:{persistSession:false,autoRefreshToken:false}
});
Deno.serve(createPublicHandler({backend:createPublicSupabaseBackend(client),siteUrl,
    enabled:Deno.env.get('PUBLIC_MEMBERS_ENABLED')==='true'}));
```

Append only this block to config, preserving existing admin function configuration:

```toml
# Intentionally public membership operations; server-side emergency switch defaults off.
[functions.public-members]
verify_jwt = false
```

- [ ] **Step 5: Run GREEN for the boundary tests from Step 1.** Add a test omitting `enabled` and one spying on `.select('id')` in the scoped backend before implementing any needed correction; reproduce RED for each new case. Run `node --test tests/unit/15-public-members.test.js tests/unit/12-membership-database.test.js tests/unit/13-admin-users.test.js`; require all pass without weakening admin/RLS expectations.
- [ ] **Step 6: Commit only this deliverable.** `git add -- supabase/functions/public-members supabase/config.toml tests/unit/15-public-members.test.js`; run `git diff --cached --check`, then `git commit -m "feat: add isolated public membership endpoint"`. Follow repository permissions for .git writes. Do not push unfinished work or enable the hosted flag yet.

### Task 2: Public Frontend Adapter Without Actor Login

**Files:**
- Modify: `assets/js/cloud-auth.js`
- Test: `tests/unit/11-cloud-auth.test.js`

**Interfaces:**
- Consumes: `public-members` success/error shapes from Task 1, existing `client.functions.invoke`
- Produces: `membership.publicMembers(action, payload={}) -> Promise<object>` alongside unchanged `admin()`

- [ ] **Step 1: Write the failing adapter tests using the existing fixture.**

```js
test('public member operation works without actor refresh',async()=>{
    const {service,client}=fixture(); let sent;
    client.auth.getSession=async()=>{throw new Error('actor lookup must not happen');};
    client.auth.getUser=async()=>{throw new Error('actor lookup must not happen');};
    client.functions.invoke=async(name,options)=>{sent={name,options};return {data:{users:[]},error:null};};
    assert.deepEqual(await service.publicMembers('list',{page:1,action:'delete'}),{users:[]});
    assert.deepEqual(sent,{name:'public-members',options:{body:{page:1,action:'list'}}});
});
test('public member operation rejects unconfigured and failed provider',async()=>{
    await assert.rejects(createMembership({config:{}}).publicMembers('list'),/ยังไม่เปิด/);
    const {service,client}=fixture();
    client.functions.invoke=async()=>({data:null,error:{message:'secret'}});
    await assert.rejects(service.publicMembers('list'),/ทำรายการสมาชิกไม่สำเร็จ/);
});
test('public member operation never publishes actor state or provider details',async()=>{
    const {service,client,states}=fixture();
    client.functions.invoke=async()=>({data:{error:'private detail'},error:null});
    await assert.rejects(service.publicMembers('list'),error=>
        /ทำรายการสมาชิกไม่สำเร็จ/.test(error.message)&&!error.message.includes('private detail'));
    assert.deepEqual(states,[]);
});
```

- [ ] **Step 2: Run RED.** `node --test tests/unit/11-cloud-auth.test.js` must fail on missing `publicMembers` while earlier Auth tests continue passing.
- [ ] **Step 3: Add the method and return it.** Reuse existing `requireClient` and `check` helpers:

```js
async function publicMembers(action,payload={}) {
    requireClient();
    const data=check(await client.functions.invoke('public-members',{
        body:{...payload,action}
    }),'ทำรายการสมาชิกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือการตั้งค่าระบบ');
    if(!data||data.error) throw new Error('ทำรายการสมาชิกไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อหรือการตั้งค่าระบบ');
    return data;
}
// Add publicMembers to the returned service object; leave admin()/refresh() unchanged.
```

- [ ] **Step 4: Run GREEN and commit.** Run `node --test tests/unit/11-cloud-auth.test.js tests/unit/13-admin-users.test.js`. Add a provider `{data:{error:'private detail'},error:null}` assertion with the same generic message. Verify no auth-state publications occur during this method. Stage only adapter and its tests, diff-check, then commit `feat: connect public membership operations without login`. No SDK rebuild is required for adapter changes; the SDK bundle source has not changed.

### Task 3: Public Member Modal and Navigation

**Files:**
- Modify: `index.html` (member modal near line 2643, renderAdminControls near 3997, applyMembershipState near 4310 and member handlers near 4324; locate current symbols before editing)
- Modify: `tests/unit/14-membership-ui.test.js`

**Interfaces:**
- Consumes: `membership.configured` and `membership.publicMembers()` from Task 2
- Produces: existing global handlers `openMembersModal`, `loadMembers`, `handleInviteMember`, `handleDeleteMember` with public semantics; keep handler names for existing HTML bindings

- [ ] **Step 1: Add RED tests for anonymous UI and privacy.**

```js
test('anonymous visitor can open member modal without becoming admin',async()=>{
    const {app,getElement}=createAppInstance({globals:{MaxmuxsixMembership:{createMembership:()=>({
        configured:true,start:async()=>{},publicMembers:async()=>({users:[{id:'member-id',email:'private@example.com',name:'Private'}],hasNext:false})
    })}}});
    await app.openMembersModal();
    assert.equal(app.currentUser,null);
    assert.equal(app.isAdminMode,false);
    assert.equal(getElement('membersModal').classList.contains('active'),true);
    assert.equal(getElement('membersBody').children[0].children[0].textContent,'สมาชิก / member-id');
});
test('public modal stays open across logout state callback',async()=>{
    let publish;
    const {app,getElement}=createAppInstance({globals:{MaxmuxsixMembership:{createMembership:options=>{
        publish=options.onChange;
        return {configured:true,start:async()=>{},publicMembers:async()=>({users:[],hasNext:false})};
    }}}});
    await app.openMembersModal(); publish({user:null,isAdmin:false});
    assert.equal(getElement('membersModal').classList.contains('active'),true);
    assert.equal(app.isAdminMode,false);
});
test('empty final page after deletion falls back once',async()=>{
    const pages=[]; let removed=false;
    const {app,getElement}=createAppInstance({globals:{MaxmuxsixMembership:{createMembership:()=>({
        configured:true,start:async()=>{},publicMembers:async(action,payload)=>{
            if(action==='delete') {removed=true;return {ok:true};}
            pages.push(payload.page);
            return {users:payload.page===2?(removed?[]:[{id:'removed'}]):[{id:'remaining'}],hasNext:false};
        }
    })}}});
    app.confirm=()=>true;
    await app.loadMembers(2);
    await app.handleDeleteMember('removed');
    assert.deepEqual(pages,[2,2,1]);
    assert.equal(getElement('membersBody').children[0].children[0].textContent,'สมาชิก / remaining');
});
```

Run `node --test tests/unit/14-membership-ui.test.js` and require this test to fail before UI edits. Update existing close/reopen fixture to supply `publicMembers` instead of `admin`, and expected label to `สมาชิก / new`; keep its delayed old-response assertion.

- [ ] **Step 2: Change only membership navigation/markup.** In `renderAdminControls`, use `membership.configured` for `btnManageMembers` and `btnMobileManageMembers`; leave all catalog edit/delete/add controls and `isAdminMode` gating intact. Remove the `admin-item` class from the mobile member button if inherited CSS hides it, retaining it on actual product-admin controls. Remove the `invitePhone` form row and every handler/reset reference to that ID. Change table heading to `รหัสสมาชิก`, keep a static status cell `บัญชีส่วนกลาง`, and replace the modal note with this copy:

```html
<p class="membership-note">ส่วนนี้จัดการบัญชีลูกค้าจริง ทุกคนสามารถเพิ่มผ่านคำเชิญหรือลบบัญชีได้โดยไม่เข้าสู่ระบบ การลบเป็นแบบถาวรและไม่สามารถเรียกคืนได้ การส่งคำเชิญขึ้นกับการตั้งค่าบริการอีเมลของร้าน</p>
```

- [ ] **Step 3: Remove actor checks only from the public member handlers.** Replace opening/loading guards and row projection as follows; retain generation counter, busy/finally handling, modal focus management and pagination mechanics:

```js
// openMembersModal guard
if(!membership.configured) {showMembershipToast('ระบบสมาชิกยังไม่เปิดใช้งาน');return;}
// loadMembers guard
if(membersBusy||page<1||!membership.configured) return;
// all member modal operations use publicMembers(), never admin()
const data=await membership.publicMembers('list',{page});
// post-await checks use version only, never isAdminMode
if(version!==membersRequestVersion) return;
// row contents explicitly ignore all other response fields
account.textContent='สมาชิก / '+user.id;
status.textContent='บัญชีส่วนกลาง';
button.disabled=false;
button.onclick=()=>handleDeleteMember(user.id);
// invitation payload excludes phone and consent
await membership.publicMembers('invite',{
    email:document.getElementById('inviteEmail').value,
    name:document.getElementById('inviteName').value
});
// permanent-delete prompt identifies only the UUID
if(membersBusy||!confirm('ลบบัญชีสมาชิก '+id+' อย่างถาวรหรือไม่? ไม่สามารถย้อนกลับได้')) return;
await membership.publicMembers('delete',{id});
```

In `applyMembershipState`, remove the block that closes the public modal solely because `!isAdminMode`; retain normal Auth UI/product controls and pending-consent handling. If a user is logged in while deleting their own UUID, call `membership.refresh()` after successful deletion to clear stale identity, catching refresh error separately so it cannot report a completed deletion as failed. Do not automatically log out unrelated accounts; no refresh is required for an anonymous caller.

For deletion from a page beyond page 1, reload the current page once; if `data.users.length===0 && !data.hasNext && page>1`, retry `loadMembers(page-1)` after clearing busy in the current request. Keep an empty page with `hasNext=true` navigable instead of incorrectly treating it as the final page.

- [ ] **Step 4: Extend UI regressions and run GREEN.** Add tests for buttons visible with configured signed-out state, buttons hidden when unconfigured, logout/auth callback not closing public modal, UUID-only display despite malicious name/email extra fields, confirmation cancelled (no request), failed invitation retaining entered values and no success toast, last-page deletion fallback, no-currentUser deletion, and logged-in self-deletion refresh failure clearing state without turning success into a provider failure. Keep existing PIN, forged identity, central RLS and product-admin tests unchanged. Run `node --test tests/unit/14-membership-ui.test.js tests/unit/02-security-auth.test.js tests/unit/08-security-regressions.test.js`.
- [ ] **Step 5: Commit the bounded UI changes.** Stage only `index.html` and `tests/unit/14-membership-ui.test.js`, diff-check and commit `feat: expose privacy-minimized public member management`.

### Task 4: Browser Regression, Deployment and Evidence

**Files:**
- Modify: `tests/browser/membership.cjs`
- Modify: `docs/cloud-membership-setup.md`
- Read: public handler/entry/config, `auth-config.js` (public configuration only)

**Interfaces:**
- Consumes: Tasks 1–3 and project `lxvxffrexegvqzeojztw`; no SMTP/account creation authority beyond the approved feature
- Produces: fixture evidence, disabled/enabled live read-only evidence, documented release/rollback steps and remaining limitations

- [ ] **Step 1: Write the failing browser expectations.** Handle `/functions/v1/public-members` in the HTTP fixture **before** `if(!member) return 401`. The fixture must return UUID-only lists, modify its in-memory Map for invite/delete, and support `failList`; keep the old admin route after its auth gate. Add anonymous tests before the first owner login:

```js
await page.locator('#btnManageMembers').click();
await page.waitForFunction(()=>document.getElementById('membersBody').children.length===2);
assert.equal(await page.evaluate(()=>currentUser),null);
assert.equal(await page.evaluate(()=>isAdminMode),false);
assert.ok(!(await page.locator('#membersBody').innerText()).includes('@'));
assert.ok(!(await page.locator('#membersBody').innerText()).includes('<img'));
assert.equal(await page.locator('#membersBody button').first().isDisabled(),false);
```

Add an anonymous mobile context (390×844), decline cookie banner, open menu/member modal, invite a fixture email and delete that **new fixture UUID**, never the seed owner/buyer needed later. Change non-admin mobile expectation from hidden to visible and include the same public actions. Preserve invite/recovery/login/logout isolation, safe output, keyboard, contrast, error/retry, unconfigured and real-provider network-blocking checks. After signup pending confirmation, assert the public modal remains usable without changing currentUser. Keep provider-transport simulation labeled as such.

- [ ] **Step 2: Run the complete fixture verification.**

```powershell
npm test
npm run build:auth
$env:PLAYWRIGHT_MODULE='C:/Users/Smart/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
node tests/browser/membership.cjs
git diff --check
```

Record fresh counts/exit codes. If `build:auth` rewrites vendor output solely due to toolchain whitespace, inspect rather than stage unrelated churn. Do not strip template literals. Browser screenshots go to `tmp/`; do not stage them. Run one independent whole-change review using the execution method selected by the user; resolve review findings and re-run affected tests before release.

- [ ] **Step 3: Update the setup guide with exact new operations and limitations.** Explain UUID-only public list, anonymous deletion including assigned admins, invitation requiring provider support, no role/password editing, no forced consent, irreversible cascade, cached-JWT limits, local orders unaffected, Origin forgeability and no guarantee against bots. State that turning off the server flag does not recover accounts. Replace old statements that the only member UI is admin-only, but retain documentation of the separately protected legacy admin function and product-edit capability. Do not label the public model secure against intentional member deletion.

- [ ] **Step 4: Recheck provider assumptions before hosted deployment.** Confirm the preflight documentation checks are recorded and still apply to the deployed runtime. If the implementation session spans provider changes, refresh those docs again. Stop and report any mismatch; do not silently auto-confirm users or broaden grants.

- [ ] **Step 5: Deploy disabled and verify safe errors first.** Read the computer-use skill and set only `PUBLIC_MEMBERS_ENABLED=false` through the authenticated Edge Function secrets UI before deployment; do not inspect or replace other secrets. Through available official MCP deploy the reviewed public function with exact two file contents, entrypoint `index.ts` and `verify_jwt=false`. Keep the existing `admin-users` deployment untouched; never print any secret values. With the correct Origin, OPTIONS must be 204 and anonymous POST `{action:'list'}` must be 503. Wrong Origin must be 403. On unexpected success, stop and disable the new function before proceeding. No valid email or customer UUID is used for smoke-test mutations.

- [ ] **Step 6: Enable the agreed public access and verify read-only behavior.** Using the authenticated Dashboard UI, read the computer-use skill first and set only `PUBLIC_MEMBERS_ENABLED=true` in Edge Function secrets. Do not read or replace other secrets. Then run anonymous POST `{action:'list',page:1}` with Origin `https://okayokay101.github.io`, no user session, and verify 200 plus UUID-only projection (report only count/status, not raw IDs). Test invalid UUID and invalid email as 400 with no writes. Verify legacy `admin-users` still rejects anonymous requests and anonymous direct profile access remains denied. Document response codes. Enabling does not require a new SMTP service; public invite remains limited until mail is configured. Do not claim live invitation/deletion was proven without an explicitly designated test account and separate permission to send a real email.

- [ ] **Step 7: Commit, publish only approved files, and verify deployment separately.** Stage browser tests/setup guide and plan progress only, diff-check, commit `test: verify public membership and document rollout`. Inspect full branch diff against pre-feature commit `afcb821`; preserve unrelated files. Follow the user's existing commit/push preference only after all code checks and review pass; no force push or unrelated merge. Check GitHub Pages deployment status/live assets before claiming the public web UI is updated. If publishing/Pages is unavailable, report local, hosted-backend and live-site status separately, not as one success.

## Rollback and Stop Conditions

- Emergency stop: set `PUBLIC_MEMBERS_ENABLED=false` in the server environment, then verify anonymous valid list returns 503; no password/login is required from site visitors, this is an operator deployment setting.
- Disable flag first if PII leaks, SDK/API contract mismatches, unexpected mutations or incorrect profile scoping occur. Roll back only feature files/function version after inspecting current state; do not reset the whole repo.
- No provider keys in frontend, no SQL privilege relaxation, no new mail service signup, no real customer account selected for testing.
- SMTP rejection is an expected external limitation, not a reason to disable email confirmation or report invitation success.
- Operation-level public access is intentionally destructive. Functional tests cannot demonstrate protection against anonymous deletion because that capability is explicitly part of the approved requirements.

## Plan Review Checklist

- [x] File responsibilities and interface names match between tasks
- [x] Every Review Focus condition has an owning test step
- [x] Spec includes list/invite/delete, no private customer fields, separate admin/product authorization, server kill switch and safe release
- [x] Test fixtures are isolated from the hosted provider; live smoke tests perform no valid account mutations
- [x] Mail limitation and irreversibility remain explicit; no production-complete claim is planned without evidence
- [ ] User reviews this written plan and selects Subagent-driven or Native execution
- [ ] Implementation starts only after the preceding item is approved
