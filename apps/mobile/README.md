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
