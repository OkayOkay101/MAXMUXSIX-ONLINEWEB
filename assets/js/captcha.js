// Cloudflare Turnstile for the sign-in, sign-up and reset forms.
// Off while the site key is empty. The secret key belongs in the Supabase dashboard, never here.
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.MaxmuxsixCaptcha = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';
    const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    const FORMS = ['login', 'register', 'reset'];
    function createCaptcha({ siteKey, window, document }) {
        const widgets = {}, tokens = {}, wanted = new Set();
        let loading = false;
        function render() {
            if (!window.turnstile) return;
            for (const form of wanted) {
                if (form in widgets) continue;
                const forget = () => { tokens[form] = ''; };
                widgets[form] = window.turnstile.render(document.getElementById('captcha-' + form), {
                    sitekey: siteKey,
                    callback: value => { tokens[form] = value; },
                    'expired-callback': forget,
                    'error-callback': forget
                });
            }
        }
        return {
            show(form) {
                if (!siteKey || !FORMS.includes(form)) return;
                wanted.add(form);
                if (window.turnstile) return render();
                if (loading) return;
                loading = true;
                const script = document.createElement('script');
                script.src = SCRIPT;
                script.async = true;
                script.onload = render;
                // A failed download may be retried the next time a form opens.
                script.onerror = () => { loading = false; };
                document.head.appendChild(script);
            },
            token: form => tokens[form] || '',
            // A Turnstile token works once, so every attempt needs a new one.
            reset(form) {
                tokens[form] = '';
                if (form in widgets && window.turnstile) window.turnstile.reset(widgets[form]);
            }
        };
    }
    return { createCaptcha };
});
