import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createOrderMailHandler, createSupabaseBackend } from './handler.mjs';
import { sendRelayMessages } from '../send-auth-email/relay.mjs';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
});
const siteUrl = Deno.env.get('SITE_URL');
if (!siteUrl) throw new Error('SITE_URL must be configured');

// Reuses the signed auth-mail relay and its existing Edge secrets.
const relay = {
    projectUrl: 'https://lxvxffrexegvqzeojztw.supabase.co',
    siteUrl,
    gasUrl: Deno.env.get('AUTH_GAS_URL'),
    relaySecret: Deno.env.get('AUTH_GAS_RELAY_SECRET'),
    upstreamTimeoutMs: 15000
};

Deno.serve(createOrderMailHandler({
    backend: createSupabaseBackend(client),
    sendMail: (message: unknown, eventId: string) => sendRelayMessages([message], eventId, relay),
    siteUrl
}));
