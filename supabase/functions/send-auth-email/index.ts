import { Webhook } from 'npm:standardwebhooks@1.1.1';
import { createAuthEmailHandler } from './relay.mjs';

// Supabase supplies a versioned symmetric signing secret. Reject missing/malformed
// configuration without printing it, and retain library timestamp verification.
const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
let webhook: Webhook | undefined;
if (secret && /^v1,whsec_(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(secret)) {
    try { webhook = new Webhook(secret.slice('v1,'.length)); } catch { /* Fail closed below. */ }
}

Deno.serve(createAuthEmailHandler({
    verify: webhook ? (raw: string, headers: Record<string, string>) => webhook!.verify(raw, headers) : undefined,
    fetchImpl: fetch,
    now: Date.now,
    config: {
        projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co',
        siteUrl: Deno.env.get('SITE_URL'),
        gasUrl: Deno.env.get('AUTH_GAS_URL'),
        relaySecret: Deno.env.get('AUTH_GAS_RELAY_SECRET'),
        upstreamTimeoutMs: 3500
    }
}));
