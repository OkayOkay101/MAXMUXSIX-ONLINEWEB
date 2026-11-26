// Public configuration only. Never put a service_role / sb_secret key here.
// Follow docs/cloud-membership-setup.md before enabling membership.
window.MAXMUXSIX_AUTH_CONFIG = Object.freeze({
    url: 'https://lxvxffrexegvqzeojztw.supabase.co',
    publishableKey: 'sb_publishable_d0zXt44nEdPT9tXR2Tt9NQ_ujdkn2BZ',
    redirectUrl: 'https://maxmuxsix-demo.vercel.app/',
    // Cloudflare Turnstile SITE key (public). Empty = captcha off.
    // Publish the site with this key BEFORE turning CAPTCHA on in Supabase, or nobody can sign in.
    turnstileSiteKey: '0x4AAAAAAGTS3jm-E4yU4CzM'
});
