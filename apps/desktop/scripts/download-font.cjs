const fs = require('fs');
const path = require('path');
const https = require('https');

const fontsDir = path.join(__dirname, '../src/assets/fonts');

// Fonts configuration
// 1. Noto Color Emoji (Windows Compatible version for robustness)
const colourFontUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/fonts/NotoColorEmoji_WindowsCompatible.ttf';
const colourFontPath = path.join(fontsDir, 'NotoColorEmoji-Compatible.ttf');

// 2. Noto Emoji (Monochrome fallback for Linux environments where colour fonts fail)
// Note: We use a specific tag/commit because 'main' branch structure changes frequently or files move.
// v2.034 is a stable release containing the static NotoEmoji-Regular.ttf
const monoFontUrl = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/v2.034/fonts/NotoEmoji-Regular.ttf';
const monoFontPath = path.join(fontsDir, 'NotoEmoji-Regular.ttf');

const licenseUrl = 'https://github.com/googlefonts/noto-emoji/raw/main/LICENSE';
const licensePath = path.join(fontsDir, 'LICENSE');

async function ensureDir(dir) {
  try {
    await fs.promises.mkdir(dir, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
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
          file.close(async () => {
             try {
                // Verify size
                const stats = await fs.promises.stat(dest);
                if (stats.size < 1000) { // < 1KB is suspicious for a font
                    await fs.promises.unlink(dest);
                    reject(new Error(`Downloaded file is too small (${stats.size} bytes). Likely an error.`));
                } else {
                    console.log(`Downloaded ${dest} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                    resolve();
                }
             } catch (err) {
                reject(err);
             }
          });
        });
      }).on('error', async (err) => {
        try {
            await fs.promises.unlink(dest);
        } catch (_) {}
        reject(err);
      });
    };

    request(url);
  });
}

async function main() {
  try {
    await ensureDir(fontsDir);
    await Promise.all([
        downloadFile(colourFontUrl, colourFontPath),
        downloadFile(monoFontUrl, monoFontPath),
        downloadFile(licenseUrl, licensePath)
    ]);
    console.log('Fonts and license download complete.');
  } catch (error) {
    console.error('Error downloading fonts or license:', error);
    process.exit(1);
  }
}

main();
