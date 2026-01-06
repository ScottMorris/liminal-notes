# Development Builds

This guide explains how to build and use development builds (EAS Build) for the Liminal Notes mobile app. Development builds are the recommended way to work on the app, as they allow:

-   Offline development
-   Testing on physical devices without an active tunnel
-   Full support for native modules (like `expo-sqlite`)
-   A closer approximation of the production environment

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js**: LTS version
2.  **pnpm**: Package manager
3.  **Android SDK** (for Android builds) or **Xcode** (for iOS builds on macOS)
    -   *Note: If you are using the Dev Container, the Android SDK environment may need additional configuration.*
4.  **EAS CLI**: Installed locally via `pnpm install`

Verify `eas-cli` is available:

```bash
cd apps/mobile
pnpm eas --version
```

## Setup

1.  **Install Dependencies**

    ```bash
    cd apps/mobile
    pnpm install
    ```

    This will install `expo-dev-client` and `eas-cli`.

## Host ADB Setup (Linux)

To install the generated APK on your device, you need `adb` installed on your host machine.

### Arch Linux

```bash
sudo pacman -S android-tools
```

### Linux Mint / Ubuntu / Debian

```bash
sudo apt-get update
sudo apt-get install android-sdk-platform-tools-common
# If that package is not found, try:
# sudo apt-get install adb
```

### Wireless Debugging (Optional)

If you don't want to use a USB cable:

1.  Enable **Developer Options** on your phone.
2.  Enable **Wireless Debugging**.
3.  Tap **Wireless Debugging** to see pairing options.
4.  On your host: `adb pair <ip>:<port>` (using the pairing code).
5.  On your host: `adb connect <ip>:<port>` (using the connection port).

## Building Locally

We use local builds to avoid dependency on Expo cloud services and queues.

### Android

To build a development APK that you can install on your device:

```bash
pnpm build:dev:android
```

This will generate a file named `build-<timestamp>.apk`.

### iOS (macOS only)

To build for the iOS Simulator:

```bash
pnpm build:dev:ios
```

## Daily Workflow

1.  **Install the Build**:
    -   **Android**: Connect your device and run `adb install build-*.apk`.
    -   **iOS Simulator**: Drag and drop the generated app bundle into the Simulator.

2.  **Start the Metro Bundler**:

    ```bash
    pnpm start
    ```

    This command now uses the `--dev-client` flag by default.

3.  **Launch the App**:
    -   Open "Liminal Notes" on your device.
    -   It should automatically connect to the running Metro bundler.
    -   If not, you can manually enter the IP address displayed in your terminal.

4.  **Offline Mode**:
    -   You can stop the Metro bundler (`Ctrl+C`) and the app will continue to work with the last bundled JavaScript.
    -   This is perfect for testing offline capabilities.

## Troubleshooting

### "Command not found: eas"

Ensure you are running commands with `pnpm` prefix (e.g., `pnpm eas ...`) or from within `pnpm` scripts. We use a local dev dependency for `eas-cli` to ensure version consistency.

### Build Fails

-   Check that your Android SDK / Xcode is correctly set up.
-   Run with `--verbose` flag for more details.
-   Ensure you have sufficient disk space.

### App Won't Connect to Metro

-   Ensure your device and computer are on the same Wi-Fi network.
-   Shake the device (or use the designated gesture) to open the Dev Menu and select "Configure Bundler".
-   Enter your computer's local IP address and port (usually 8081).

## Comparison: Expo Go vs. Development Build

| Feature | Expo Go | Development Build |
| :--- | :--- | :--- |
| **Native Modules** | Limited set | Full support |
| **Offline Usage** | No | Yes |
| **Tunnel Required** | Often | No (Local Network) |
| **Setup Time** | Instant | Initial Build (~10m) |
| **Fidelity** | Generic Container | Production-like |

## Further Reading

-   [Expo Development Builds Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
-   [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
