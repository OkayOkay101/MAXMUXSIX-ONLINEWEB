import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { createHandler, createSupabaseBackend } from './handler.mjs';

const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false }
});
const siteUrl = Deno.env.get('SITE_URL');
if (!siteUrl) throw new Error('SITE_URL must be configured');
Deno.serve(createHandler({ backend: createSupabaseBackend(client), siteUrl }));
