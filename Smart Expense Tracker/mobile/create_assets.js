const fs = require('fs');
const path = require('path');

const base64Png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const buffer = Buffer.from(base64Png, 'base64');

const files = [
    'icon.png',
    'splash.png',
    'adaptive-icon.png',
    'favicon.png'
];

const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
}

files.forEach(file => {
    fs.writeFileSync(path.join(assetsDir, file), buffer);
    console.log(`Created ${file}`);
});
