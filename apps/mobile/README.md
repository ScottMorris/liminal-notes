# Liminal Notes Mobile

The mobile client for Liminal Notes, built with React Native and Expo.

## Getting Started

### Prerequisites

*   Node.js (LTS)
*   pnpm
*   Expo Go app on your physical device (Android or iOS)

### Running the App

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

*   `pnpm start`: Start the Expo development server.
*   `pnpm android`: Open in Android emulator/device.
*   `pnpm ios`: Open in iOS simulator (macOS only).
*   `pnpm typecheck`: Run TypeScript type checking.

## Development in VS Code Dev Container

Since the Dev Container runs in a virtualized Linux environment, you cannot run the iOS Simulator or Android Emulator directly inside it.

**To test on a physical device (Recommended):**

1.  Navigate to the mobile app directory:
    ```bash
    cd apps/mobile
    ```
2.  Start Expo with the `--tunnel` flag to bypass network isolation:
    ```bash
    pnpm expo start --tunnel
    ```
3.  Scan the QR code with Expo Go on your phone.

**To test on a Host Emulator:**

1.  Ensure VS Code has forwarded port **8081**.
2.  Start the server normally (`pnpm start`).
3.  Launch the Android Emulator or iOS Simulator on your **host** machine.
4.  Manually open the app:
    *   **Android:** Run `adb reverse tcp:8081 tcp:8081` on your host, then open the Expo app and connect to `localhost:8081`.
    *   **iOS:** Open Safari in the simulator and navigate to `exp://localhost:8081`.
