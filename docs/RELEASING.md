# Releasing Liminal Notes Desktop

This document describes the process for creating a new release of the desktop application.

## Prerequisites

- Access to the GitHub repository with write permissions.
- Git configured locally.

## Release Process

1.  **Bump Version**
    - Preferred: run `scripts/release-desktop.sh <version>` (for example `scripts/release-desktop.sh 0.1.1`).
    - The script updates:
      - `apps/desktop/package.json`
      - `apps/desktop/src-tauri/tauri.conf.json`
      - Creates local git tag `desktop-v<version>` by default
    - Optional flags:
      - `--dry-run` to preview changes without writing files.
      - `--no-tag` to skip local tag creation.
    - Manual fallback:
      - Update the `version` field in `apps/desktop/package.json`.
      - Update the `version` field in `apps/desktop/src-tauri/tauri.conf.json`.
    - *(Optional)* Update `CHANGELOG.md` if maintained.

2.  **Commit Changes**
    ```bash
    git add .
    git commit -m "chore(release): desktop-v0.1.0"
    ```

3.  **Tag the Release**
    The CI workflow is triggered by tags matching `desktop-v*`.
    If you used `scripts/release-desktop.sh` without `--no-tag`, the local tag is already created and you only need to push it.
    ```bash
    git tag desktop-v0.1.0
    git push origin desktop-v0.1.0
    ```
    *Note: Ensure the tag version matches the version in the files.*

4.  **Monitor Build**
    - Go to the "Actions" tab in the GitHub repository.
    - Select the `publish-desktop` workflow.
    - Watch the build progress. It currently targets:
        - Linux x64 (Ubuntu 24.04)
        - Linux ARM64 (Ubuntu 24.04)
        - Windows x64 (`x86_64-pc-windows-msvc`)
        - Windows ARM64 (`aarch64-pc-windows-msvc`)

5.  **Review Release**
    - Once the build completes, a release will be created or updated on GitHub.
    - Go to the "Releases" section.
    - Verify that Linux and Windows assets are present.
    - Confirm the generated release notes look correct.
      - Generated note categories are configured in `.github/release.yml`.
    - If needed, edit the release text with additional context.

6.  **Optional Draft Mode**
    - The default release path publishes immediately.
    - For manual runs via `workflow_dispatch`, set `release_draft=true` to keep the release as a draft.
    - This keeps historical/manual review workflows available without changing the default path.

## Windows unsigned installer flow

- Windows builds are currently unsigned and may trigger SmartScreen warnings.
- Installers are still deterministic build artefacts generated in CI.
- Each Windows CI job also uploads checksum assets to the release:
  - `checksums-windows-x64.txt`
  - `checksums-windows-arm64.txt`

### Verify a downloaded installer on Windows (PowerShell)

```powershell
Get-FileHash .\liminal-notes_<version>_x64_en-US.msi -Algorithm SHA256
```

- Compare the printed hash with the matching checksum file attached to the release.

## Linux AppImage runtime

- CI installs `tauri-cli` from `feat/truly-portable-appimage` and sets `TAURI_BUNDLER_NEW_APPIMAGE_FORMAT=true` to avoid the `EGL_BAD_PARAMETER` blank-screen bug on Arch/Fedora/Steam Deck.
- Keep this flow until the upstream Tauri PR merges and the portable AppImage runtime becomes the default.

## Current CI Limitations

- **macOS**: Not yet included in the desktop release pipeline.
- **Linux ARM**: Builds are performed on `ubuntu-24.04-arm` runners.
- **Windows code signing**: Installer signing is not configured yet.
