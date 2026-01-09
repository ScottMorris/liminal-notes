# Flatpak build notes (dev container)

Context: Working in the Codespaces/Dev Container environment where unprivileged user namespaces are disabled by default, causing bubblewrap failures when running `flatpak-builder`.

What changed
- Devcontainer run arguments were updated to enable user namespaces and relax seccomp: `--sysctl=kernel.unprivileged_userns_clone=1 --security-opt=seccomp=unconfined --cap-add=SYS_ADMIN`. This needs a devcontainer rebuild to take effect.
- Flatpak runtime bumped to 24.08 in the manifest.
- Flatpak app ID changed to `ca.liminalnotes.desktop` (hyphenless for Flatpak). Core app (Tauri) keeps `ca.liminal-notes.desktop`.
- Helper script `scripts/build-flatpak.sh` installs runtimes, wraps flatpak-builder with `FLATPAK_BUILDER_NOSANDBOX=1`, and adds `--disable-rofiles-fuse` to avoid fuse issues.
- README documents the build/export steps and the devcontainer requirements.

Remaining issues / tips
- If bwrap still complains about namespaces, ensure the dev container was rebuilt after the runArg changes.
- PolicyKit warnings in the container are expected; installs still succeed in user scope.
- XDG_DATA_DIRS warnings are harmless for building; they only affect desktop entry visibility inside the container.
- Host packaging is unaffected (AppImage/.deb/etc.); Flatpak is for cross-distro portability.

Quick recipe (after rebuild)
1) `./scripts/build-flatpak.sh`
2) Bundle for host: `flatpak build-bundle flatpak-build liminal-notes.flatpak ca.liminalnotes.desktop 24.08 --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo`
3) On host: `flatpak install ./liminal-notes.flatpak` then `flatpak run ca.liminalnotes.desktop`
