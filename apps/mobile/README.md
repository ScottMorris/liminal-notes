# Liminal Notes Mobile

The mobile client for Liminal Notes, built with React Native and Expo.

## Getting Started

### Prerequisites

*   Node.js (LTS)
*   pnpm
*   Expo Go app on your physical device (Android or iOS)

### Running the App

We recommend using **Development Builds** (EAS Build) instead of Expo Go. This supports offline development and native modules.

See [**Development Build Guide**](./DEVELOPMENT_BUILD.md) or [**Quick Start**](./QUICK_START.md).

#### Quick Start (Development Build)

1.  Build the APK (one-time):
    ```bash
    pnpm build:dev:android
    ```
2.  Install the APK on your device.
3.  Start the server:
    ```bash
    pnpm start
    ```

### Legacy: Expo Go

1.  Install dependencies (from the repo root):
    ```bash
    pnpm install
    ```

2.  Start the development server:
    ```bash
    pnpm --filter @liminal-notes/mobile start
    ```
    Or run from this directory:
    ```bash
    pnpm start
    ```

3.  Scan the QR code with the Expo Go app on your device.

## Scripts

*   `pnpm start`: Start the Expo development server (Dev Client mode).
*   `pnpm build:dev`: Build development client locally.
*   `pnpm build:dev:android`: Build Android APK locally.
*   `pnpm build:dev:ios`: Build iOS simulator build locally.
*   `pnpm android`: Open in Android emulator/device.
*   `pnpm ios`: Open in iOS simulator (macOS only).
*   `pnpm typecheck`: Run TypeScript type checking.

## Development in VS Code Dev Container

Since the Dev Container runs in a virtualized Linux environment, you cannot run the iOS Simulator or Android Emulator directly inside it.

**To test on a physical device (Recommended):**

1.  **Build the Development APK** (see above).
2.  Install it on your device.
3.  Start the bundler:
    ```bash
    pnpm start --tunnel
    ```
    *Note: The `--tunnel` flag is useful if your device cannot reach the container directly, but Development Builds can often connect directly via local IP if the network is bridged.*

**To test on a Host Emulator:**

1.  Ensure VS Code has forwarded port **8081**.
2.  Start the server normally (`pnpm start`).
3.  Launch the Android Emulator or iOS Simulator on your **host** machine.
4.  Manually open the app:
    *   **Android:** Run `adb reverse tcp:8081 tcp:8081` on your host, then open the Expo app and connect to `localhost:8081`.
    *   **iOS:** Open Safari in the simulator and navigate to `exp://localhost:8081`.
