#!/usr/bin/env bash
set -euo pipefail

# Build and install the Flatpak for Liminal Notes locally.
# - Uses user scope (--user) to avoid needing system privileges in devcontainers.
# - Cleans build dir between runs to avoid stale artefacts.

MANIFEST="apps/desktop/flatpak/ca.liminalnotes.desktop.yml"
BUILD_DIR="flatpak-build"

# Ensure we have a session bus; in headless devcontainers, re-exec via dbus-run-session.
if [ -z "${DBUS_SESSION_BUS_ADDRESS:-}" ] && [ -z "${FLATPAK_DBUS_WRAPPED:-}" ]; then
  if command -v dbus-run-session >/dev/null 2>&1; then
    exec env FLATPAK_DBUS_WRAPPED=1 dbus-run-session -- "$0" "$@"
  else
    echo "dbus-run-session not found; install dbus (present in the devcontainer base) and retry." >&2
    exit 1
  fi
fi
# Flatpak may try the system bus; map it to our session bus when we spawned one.
if [ -z "${DBUS_SYSTEM_BUS_ADDRESS:-}" ] && [ -n "${DBUS_SESSION_BUS_ADDRESS:-}" ]; then
  export DBUS_SYSTEM_BUS_ADDRESS="$DBUS_SESSION_BUS_ADDRESS"
fi

echo "Ensuring flatpak remotes and runtimes..."
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
INSTALL_OPTS=(--user --noninteractive -y --or-update flathub)
flatpak install "${INSTALL_OPTS[@]}" runtime/org.freedesktop.Platform/x86_64/24.08
flatpak install "${INSTALL_OPTS[@]}" runtime/org.freedesktop.Platform.Locale/x86_64/24.08
flatpak install "${INSTALL_OPTS[@]}" runtime/org.freedesktop.Sdk/x86_64/24.08
flatpak install "${INSTALL_OPTS[@]}" runtime/org.freedesktop.Sdk.Extension.node20/x86_64/24.08
flatpak install "${INSTALL_OPTS[@]}" runtime/org.freedesktop.Sdk.Extension.rust-stable/x86_64/24.08

BUILDER_ARGS=(--user --force-clean --install "$BUILD_DIR" "$MANIFEST" --disable-rofiles-fuse)
echo "Note: running flatpak-builder with sandbox disabled via FLATPAK_BUILDER_NOSANDBOX=1 for devcontainer compatibility."

echo "Building and installing Liminal Notes Flatpak..."
FLATPAK_BUILDER_NOSANDBOX=1 flatpak-builder "${BUILDER_ARGS[@]}"

echo "Run with: flatpak run ca.liminalnotes.desktop"
