import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const assets = [
  {
    source: path.join(root, "assets", "branding", "liminal-notes-icon.png"),
    target: path.join(root, "apps", "site", "public", "liminal-notes-icon.png"),
  },
  {
    source: path.join(root, "assets", "branding", "desktop-app.png"),
    target: path.join(root, "apps", "site", "public", "desktop-app.png"),
  },
];

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
}

async function copyAsset({ source, target }) {
  try {
    await stat(source);
  } catch (error) {
    console.warn(`[prepare-site] Skipping missing asset: ${source}`);
    return;
  }

  await ensureDir(target);
  await cp(source, target);
  console.log(`[prepare-site] Copied ${path.relative(root, source)} -> ${path.relative(root, target)}`);
}

async function main() {
  await Promise.all(assets.map(copyAsset));
}

main().catch((error) => {
  console.error("[prepare-site] Failed to copy assets", error);
  process.exit(1);
});
