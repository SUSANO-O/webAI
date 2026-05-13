const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'src', 'img', 'logo-web360.png');
const destDir = path.join(root, 'public');
const dest = path.join(destDir, 'logo-web360.png');

if (!fs.existsSync(src)) {
  console.error('sync-logo: missing source file', src);
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });
fs.copyFileSync(src, dest);
