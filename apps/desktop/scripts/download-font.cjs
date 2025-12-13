const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '../src/assets/fonts');
const fontUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji.ttf';
const licenseUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/LICENSE';
const fontPath = path.join(fontsDir, 'NotoColorEmoji.ttf');
const licensePath = path.join(fontsDir, 'LICENSE');

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`File already exists: ${dest}`);
      resolve();
      return;
    }

    console.log(`Downloading ${url} to ${dest}...`);
    const file = fs.createWriteStream(dest);

    // Follow redirects
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
             console.log(`Downloaded ${dest}`);
             resolve();
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
