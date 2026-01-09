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

### Flatpak (local build)

Flatpak is the most portable option on Linux since it pulls GTK/WebKit/EGL from the runtime. To build and install locally:

1) In the dev container, packages are preinstalled (`flatpak`, `flatpak-builder`). If running elsewhere, install them via your package manager.
2) Build and install (user scope):

```bash
./scripts/build-flatpak.sh
```

If you see `Unable to connect to system bus`, the script now spins up a temporary D-Bus session (via `dbus-run-session`) and maps the system bus address to it inside the dev container.
If Flatpak still prompts for a version of `org.freedesktop.Sdk.Extension.node20`, choose the 24.08 branch; the script now requests 24.08 explicitly and runs non-interactively to avoid the prompt.
If you hit a `fuse: device not found` error in the dev container, the script already passes `--disable-rofiles-fuse` to flatpak-builder to avoid the kernel module requirement.
If you hit a `bwrap: No permissions to create new namespace` error (user namespaces disabled), the script sets `FLATPAK_BUILDER_NOSANDBOX=1` for flatpak-builder inside the dev container.
Flatpak needs user namespaces; the devcontainer now sets `--sysctl=kernel.unprivileged_userns_clone=1`, `--security-opt=seccomp=unconfined`, and `--cap-add=SYS_ADMIN`. Rebuild the dev container for these to take effect.

3) Run:

```bash
flatpak run ca.liminalnotes.desktop
```

The Flatpak manifest uses the home filesystem (for vault access), Wayland/X11, notifications, and GPU acceleration. `build-flatpak.sh` also installs the freedesktop runtimes/extensions if missing. In the dev container it will auto-wrap itself in `dbus-run-session` if no session bus is available.

#### Exporting from the dev container to your host

After `./scripts/build-flatpak.sh` completes in the dev container:

1) Create a bundle file you can copy out:

```bash
flatpak build-bundle flatpak-build liminal-notes.flatpak \
  ca.liminalnotes.desktop 24.08 \
  --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo
```

2) Copy `liminal-notes.flatpak` to your host.

3) On the host, install runtimes (one-time, or let the next step prompt you):

```bash
flatpak install flathub org.freedesktop.Platform//24.08 org.freedesktop.Sdk//24.08 \
  org.freedesktop.Sdk.Extension.node20 org.freedesktop.Sdk.Extension.rust-stable
```

4) Install the app:

```bash
flatpak install ./liminal-notes.flatpak
```

5) Run it:

```bash
flatpak run ca.liminalnotes.desktop
```

## Linux AppImage Troubleshooting

- The AppImage reuses your host’s WebKitGTK and EGL stack. On Wayland, missing GPU/GL packages can surface as `Could not create default EGL display: EGL_BAD_PARAMETER`.
- Install the system deps first (Arch): `sudo pacman -S webkit2gtk-4.1 gtk3 libglvnd mesa mesa-utils xorg-server-xwayland`.
- If you still hit EGL issues, collect logs with `EGL_LOG_LEVEL=debug ./Liminal\ Notes_0.1.0_amd64.AppImage` and try a pure X11 run (`env -u WAYLAND_DISPLAY GDK_BACKEND=x11 ./...`) to rule out compositor quirks.
- Please open an issue with the debug output and your GPU/driver details so we can harden the launcher defaults.

## Status & Roadmap

Current Version: **0.1.0** (Milestone 8 - Polish & Packaging)

- [x] Core Note Editing & Linking
- [x] Search & Graph View
- [x] Basic Theming
- [ ] Advanced Plugin System
- [ ] Local AI Assistant Features

See `docs/` for detailed architecture and specs.
