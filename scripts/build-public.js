// คัดลอกเฉพาะไฟล์หน้าเว็บตามรายชื่อลง public/ ให้ Vercel ส่งเฉพาะโฟลเดอร์นี้
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_FILES = [
    'index.html', 'auth-config.js', 'store_front.jpg',
    ...Array.from({ length: 8 }, (_, i) => `max_${i + 1}.jpg`),
    'assets/js/actions.js', 'assets/js/captcha.js', 'assets/js/cloud-auth.js', 'assets/js/frame-guard.js',
    'assets/vendor/supabase.js', 'assets/vendor/THIRD-PARTY-NOTICES.txt',
    'assets/video/khaolam-battle-impact-30s.mp4', 'assets/video/khaolam-battle-impact-poster.jpg'
];

function buildPublic(rootDir, outDir) {
    const root = path.resolve(rootDir);
    const out = path.resolve(outDir);
    const fromOut = path.relative(out, root);
    if (!fromOut.startsWith('..') && !path.isAbsolute(fromOut))
        throw new Error(`Refusing to delete the project or its parent: ${out}`);
    const missing = PUBLIC_FILES.filter(file => !fs.existsSync(path.join(root, file)));
    if (missing.length) throw new Error(`Missing public files: ${missing.join(', ')}`);
    fs.rmSync(out, { recursive: true, force: true });
    for (const file of PUBLIC_FILES) {
        fs.mkdirSync(path.dirname(path.join(out, file)), { recursive: true });
        fs.copyFileSync(path.join(root, file), path.join(out, file));
    }
    return [...PUBLIC_FILES];
}

module.exports = { buildPublic, PUBLIC_FILES };

if (require.main === module) {
    const root = path.join(__dirname, '..');
    console.log(`public/: ${buildPublic(root, path.join(root, 'public')).length} files`);
}
