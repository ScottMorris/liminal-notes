# Releasing Liminal Notes Desktop

This document describes the process for creating a new release of the desktop application.

## Prerequisites

- Access to the GitHub repository with write permissions.
- Git configured locally.

## Release Process

1.  **Bump Version**
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

5.  **Review Draft Release**
    - Once the build completes, a **Draft** release will be created/updated on GitHub.
    - Go to the "Releases" section.
    - Verify that the assets (AppImage, deb) are present.
    - Add release notes to the body.

6.  **Publish**
    - When satisfied, click "Edit" on the release and "Publish release" to make it public.

## Current CI Limitations

- **Windows & macOS**: Currently skipped in the CI pipeline pending research on code signing and notarization.
- **Linux ARM**: Builds are performed on `ubuntu-24.04-arm` runners.
