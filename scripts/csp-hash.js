// Rewrites the script-src of the CSP <meta> in index.html with sha256 hashes of every inline <script>.
// Run after editing any inline script: npm run csp:hash (test 47 fails while a hash is stale).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function cspScriptSrc(html) {
    const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
        .map(m => `'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
    return `script-src 'self' ${hashes.join(' ')} https://challenges.cloudflare.com;`;
}

function updateHtml(html) {
    const line = /script-src [^;]*;/;
    if (!line.test(html)) throw new Error('script-src not found');
    return html.replace(line, cspScriptSrc(html));
}

module.exports = { cspScriptSrc, updateHtml };

if (require.main === module) {
    const file = path.join(__dirname, '..', 'index.html');
    fs.writeFileSync(file, updateHtml(fs.readFileSync(file, 'utf8')));
    console.log(cspScriptSrc(fs.readFileSync(file, 'utf8')));
}
