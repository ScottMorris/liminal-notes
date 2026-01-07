# Quick Start: Development Builds

## One-Time Setup

```bash
cd apps/mobile
pnpm install
```

## Build APK (Android)

```bash
pnpm build:dev:android
# Installs to: apps/mobile/build-<timestamp>.apk
```

## Install on Device

```bash
adb install build-*.apk
```

## Start Development Server

```bash
pnpm start
# App on device connects to this server for hot reload
```

## Rebuild When...

-   You add/remove native dependencies (plugins in `app.json`).
-   You change `package.json` dependencies.
-   You change native code (android/ios directories).

*You do NOT need to rebuild for JavaScript/TypeScript changes.*
