const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '../src/assets/fonts');
// Use the Windows-compatible version as it is often more robust across different environments (including Linux WebKit) due to table structure.
const fontUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji_WindowsCompatible.ttf';
const licenseUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/LICENSE';
const fontPath = path.join(fontsDir, 'NotoColorEmoji-Compatible.ttf');
const licensePath = path.join(fontsDir, 'LICENSE');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    // Note: We overwrite existing files to ensure we get the latest/correct version if parameters change.
    // If you want to cache, check fs.existsSync(dest) here.
    // For this fix, we want to force download if the name changed or to be safe.

    console.log(`Downloading ${url} to ${dest}...`);
    const file = fs.createWriteStream(dest);

    const request = (currentUrl) => {
      https.get(currentUrl, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          request(response.headers.location);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
             // Verify size
             const stats = fs.statSync(dest);
             if (stats.size < 1000) { // < 1KB is suspicious for a font
                fs.unlinkSync(dest);
                reject(new Error(`Downloaded file is too small (${stats.size} bytes). Likely an error.`));
             } else {
                console.log(`Downloaded ${dest} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                resolve();
             }
          });
        });
      }).on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

async function main() {
  try {
    await downloadFile(fontUrl, fontPath);
    await downloadFile(licenseUrl, licensePath);
    console.log('Font and license download complete.');
  } catch (error) {
    console.error('Error downloading font or license:', error);
    process.exit(1);
  }
}

main();
