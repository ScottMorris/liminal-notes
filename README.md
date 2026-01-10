# Liminal Notes

Liminal Notes is a local-first, Markdown-based note-taking app that treats your data as the source of truth. Built with Tauri, React, and Rust, it is designed to be fast, private, and extensible, with future support for local AI and plugins.

## Features

- **Local-First Vaults:** Your notes live in a standard folder on your disk. No proprietary databases.
- **Markdown Editor:** Write in standard Markdown with instant preview.
- **Wikilinks & Backlinks:** Connect thoughts using `[[wikilinks]]`. See what links to the current note in the Backlinks panel.
- **Search & Quick Open:** Instantly find notes by title or content.
- **Graph View:** Visualize the connections between your notes.
- **Plugin Ready:** (In Progress) Built-in plugin host and AI Assistant scaffolding.

## Keyboard Shortcuts

| Action | Shortcut |
| :--- | :--- |
| **Save Note** | `Ctrl` / `Cmd` + `S` |
| **Search / Quick Open** | `Ctrl` / `Cmd` + `Shift` + `F` |
| **Toggle Graph View** | (Sidebar Button) |
| **Toggle AI Sidebar** | (Toolbar Button, if enabled) |

## Running in Development

We recommend using the VS Code **Dev Container** for a zero-config setup.

1.  **Install Dependencies:**
    ```bash
    pnpm install
    ```

2.  **Run Development Mode:**
    ```bash
    pnpm tauri dev
    ```

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## Building a Release

To create an installable package for your platform (Linux .deb/.AppImage, Windows .msi, macOS .app/.dmg):

> **Note:** Tauri builds rely on the host OS. To build for Windows, run this command on Windows. To build for macOS, run on macOS.

```bash
pnpm build:desktop
```

The built artifacts will be available in `apps/desktop/src-tauri/target/release/bundle/`.

**Artifacts created:**
*   **Linux:** `.deb` (Debian/Ubuntu installer), `.AppImage` (portable executable), `.rpm` (Fedora/RHEL installer).
    *   To install `.deb`: `sudo dpkg -i <path-to-deb>`
    *   To run `.AppImage`: `chmod +x <path>; ./<path>`
*   **Windows:** `.msi` installer.
*   **macOS:** `.app` bundle, `.dmg` disk image.

**Note:** Binaries are currently unsigned. You may see OS warnings when installing.

### Linux AppImage (portable format)

To fix `EGL_BAD_PARAMETER` blank-screen failures on Arch/Fedora/Steam Deck, build with Tauri’s experimental portable AppImage runtime:

```bash
# install the experimental CLI once per machine
cargo install tauri-cli \
  --git https://github.com/tauri-apps/tauri \
  --branch feat/truly-portable-appimage \
  --force

export TAURI_BUNDLER_NEW_APPIMAGE_FORMAT="true"
cd apps/desktop
cargo tauri build --bundles appimage

# or just build the AppImage via pnpm using the installed cargo CLI
cd /workspaces/liminal-notes
pnpm build:appimage:portable
```

The AppImage will be in `apps/desktop/src-tauri/target/release/bundle/appimage/`. This matches the CI configuration until the upstream runtime merges and becomes the default.

## Status & Roadmap

Current Version: **0.1.0** (Milestone 8 - Polish & Packaging)

- [x] Core Note Editing & Linking
- [x] Search & Graph View
- [x] Basic Theming
- [ ] Advanced Plugin System
- [ ] Local AI Assistant Features

See `docs/` for detailed architecture and specs.
