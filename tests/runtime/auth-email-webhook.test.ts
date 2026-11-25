import { Webhook } from 'npm:standardwebhooks@1.1.1';
import { createAuthEmailHandler } from '../../supabase/functions/send-auth-email/relay.mjs';

// Isolated runtime verification: no network, real mail or private environment.
const webhook = new Webhook(btoa('fixture-runtime-key-32-bytes-long!'));
const eventId = 'runtime_fixture';
const siteUrl = 'https://okayokay101.github.io/MAXMUXSIX-ONLINEWEB/';
const projectUrl = 'https://lxvxffrexegvqzeojztw.supabase.co';
const raw = JSON.stringify({ user: { email: 'runtime@example.test' }, email_data: {
    email_action_type: 'signup', token: '12345678', token_hash: 'runtime-fixture-hash',
    redirect_to: siteUrl, site_url: projectUrl
} });

for (const [name, age, tampered, expected] of [
    ['signed', 0, false, 200],
    ['tampered', 0, true, 401],
    ['stale', -301, false, 401],
    ['future', 301, false, 401]
] as const) {
    Deno.test(`Deno real Standard Webhooks ${name} payload`, async () => {
        let deliveries = 0;
        const handler = createAuthEmailHandler({
            verify: (body: string, headers: Record<string, string>) => webhook.verify(body, headers),
            fetchImpl: async () => {
                deliveries++;
                return new Response(JSON.stringify({ success: true, eventId }));
            },
            now: Date.now,
            config: { projectUrl, siteUrl,
                gasUrl: 'https://script.google.com/macros/s/runtime_fixture/exec',
                relaySecret: 'runtime-fixture-literal-secret', upstreamTimeoutMs: 3500 }
        });
        const timestamp = Math.floor(Date.now() / 1000) + age;
        const request = new Request('https://fixture.test/hook', { method: 'POST',
            body: tampered ? raw.replace('12345678', '87654321') : raw,
            headers: { 'webhook-id': eventId, 'webhook-timestamp': String(timestamp),
                'webhook-signature': webhook.sign(eventId, new Date(timestamp * 1000), raw) }
        });
        const result = await handler(request);
        if (result.status !== expected || deliveries !== (expected === 200 ? 1 : 0)) {
            throw new Error('Runtime webhook authentication or acknowledgement failed.');
        }
        const data = await result.json();
        if (expected === 200 && Object.keys(data).length !== 0) throw new Error('Unexpected success body.');
        if (expected !== 200 && data.error?.http_code !== expected) throw new Error('Invalid hook error contract.');
    });
}
