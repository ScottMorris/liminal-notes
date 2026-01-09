#!/usr/bin/env node

import fs from "fs/promises";
import { spawn } from "child_process";
import { tmpdir } from "os";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "..");

const DEFAULT_SOURCE = path.join("assets", "branding", "liminal-notes-icon.png");
const BASE_ICON_SIZE = 1024;
const MOBILE_ASSETS_DIR = path.join(workspaceRoot, "apps/mobile/assets");

const log = (message) => process.stdout.write(`${message}\n`);

const ensureFile = async (filePath) => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Source icon is missing: ${filePath}`);
  }
};

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      ...options,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`
        )
      );
    });
  });

const prepareBaseIcon = async (sourcePath) => {
  const tmpDir = await fs.mkdtemp(path.join(tmpdir(), "liminal-icon-"));
  const baseIconPath = path.join(tmpDir, `icon-${BASE_ICON_SIZE}.png`);

  const image = sharp(sourcePath);
  const { width, height } = await image.metadata();

  log(
    `Upscaling ${path.relative(
      workspaceRoot,
      sourcePath
    )} (${width}x${height}) to ${BASE_ICON_SIZE}x${BASE_ICON_SIZE} with transparent padding`
  );

  await image
    .resize(BASE_ICON_SIZE, BASE_ICON_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toFile(baseIconPath);

  return baseIconPath;
};

const generateDesktopIcons = async (baseIconPath) => {
  log("Generating desktop icons via Tauri CLI…");

  await runCommand(
    "pnpm",
    ["--filter", "@liminal-notes/desktop", "tauri", "icon", baseIconPath],
    { cwd: workspaceRoot }
  );
};

const generateMobileIcons = async (baseIconPath) => {
  const outputs = [
    { file: "icon.png", size: 1024 },
    { file: "adaptive-icon.png", size: 1024 },
    { file: "splash-icon.png", size: 1024 },
    { file: "favicon.png", size: 48 },
  ];

  await fs.mkdir(MOBILE_ASSETS_DIR, { recursive: true });

  for (const { file, size } of outputs) {
    const destination = path.join(MOBILE_ASSETS_DIR, file);
    await sharp(baseIconPath)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
        kernel: "lanczos3",
      })
      .png({ compressionLevel: 9 })
      .toFile(destination);
    log(`Wrote ${path.relative(workspaceRoot, destination)} (${size}x${size})`);
  }
};

const main = async () => {
  const [sourceArg] = process.argv.slice(2);
  const sourcePath = path.resolve(workspaceRoot, sourceArg ?? DEFAULT_SOURCE);

  await ensureFile(sourcePath);

  const baseIconPath = await prepareBaseIcon(sourcePath);
  await generateDesktopIcons(baseIconPath);
  await generateMobileIcons(baseIconPath);

  log("All icon assets refreshed.");
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
