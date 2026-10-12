# Cloud Membership Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use executing-plans for inline execution and test-driven-development. User explicitly requested execution; do not add another approval gate.

**Goal:** Email/password cloud membership and server-authorized user administration.
**Architecture:** Static storefront → bundled Supabase SDK → Auth + RLS profiles; admin actions → authenticated Edge Function → private role check → Auth Admin API.
**Tech Stack:** Vanilla JavaScript, Supabase JS 2.117.3, PostgreSQL, Deno Edge Function, Node test runner, PGlite.
**Spec:** docs/superpowers/specs/2026-10-12-cloud-membership-design.md

## Global Constraints

Preserve the existing trailer links and unrelated output. No external deployment, live email, commits or pushes in this request. No service key in client. Keep shopping functional without backend configuration. Work on codex/cloud-membership in current checkout to preserve pending changes; do not create a worktree without requested consent.

## Review Focus

Identity and privilege escalation, stale sessions/races, RLS grants and definer search paths, invitations/password recovery, deletion protection, UI injection, CSP, responsive/focus/error handling. SDK client shape must match the Edge Function and SQL names below.

## Tasks

- [x] 1. Tests first for auth adapter (`tests/unit/11-cloud-auth.test.js`) and fail-closed HTML login; implement `assets/js/cloud-auth.js`, `auth-config.js`, pinned local SDK bundle. Contract: `createMembership({config,createClient,onChange,onRecovery})` with `start`, `refresh`, `register`, `login`, `logout`, `resetPassword`, `setPassword`, `admin`.
- [x] 2. Write database tests first (`tests/unit/12-membership-database.test.js`) using PGlite auth fixtures. Implement `supabase/migrations/202610120001_membership.sql`: own-profile SELECT, private admin table, `is_member_admin`, `member_referral_count`, `accept_member_terms` RPCs, server-only profile trigger. Verify real RLS denial with authenticated/anon roles.
- [x] 3. Write handler tests first (`tests/unit/13-admin-users.test.js`); implement `supabase/functions/admin-users/handler.mjs` plus `index.ts`. POST actions `list {page}`, `invite {email,name,phone}`, `delete {id}`; OPTIONS allowed origin only; fresh token + profile + admin check before any action. Per-page 25, no self/admin deletion, generic provider errors.
- [x] 4. Add integration tests before HTML changes (`tests/unit/14-membership-ui.test.js`). Replace local login, profile writes and PIN auth in `index.html`; admin list/invite/delete modal with safe DOM, password recovery/consent form, status and busy controls, keyboard/focus. Keep local products/orders unchanged.
- [x] 5. Write Thai setup/runbook (`docs/cloud-membership-setup.md`) with project creation, SQL migration, admin bootstrap by verified email, secrets, function deploy, Auth SMTP/redirect/rate-limit, config and real two-browser test checklist. Run `npm test`, `npm run build:auth`, browser checks at 390/1440px, then fresh independent read-only review and address important findings with regression tests.

Each task: run the named test before production implementation (expected FAIL), implement, rerun target tests (PASS), run full suite at milestones. The progress ledger records evidence and remaining external prerequisites, not live-provider success.
