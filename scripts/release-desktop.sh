#!/usr/bin/env bash

: <<'COMMENT_FREE_CODE_VIEW'

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_PACKAGE_JSON="$ROOT_DIR/apps/desktop/package.json"
TAURI_CONF_JSON="$ROOT_DIR/apps/desktop/src-tauri/tauri.conf.json"

if [[ -t 1 ]]; then
  C_RESET="\033[0m"
  C_RED="\033[31m"
  C_GREEN="\033[32m"
  C_YELLOW="\033[33m"
  C_BLUE="\033[34m"
else
  C_RESET=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
fi

info() { printf "%b\n" "${C_BLUE}info:${C_RESET} $*"; }
warn() { printf "%b\n" "${C_YELLOW}warn:${C_RESET} $*"; }
ok() { printf "%b\n" "${C_GREEN}ok:${C_RESET} $*"; }
die() { printf "%b\n" "${C_RED}error:${C_RESET} $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  scripts/release-desktop.sh [version] [--dry-run] [--no-tag]

Examples:
  scripts/release-desktop.sh 0.2.0
  scripts/release-desktop.sh v0.2.0 --dry-run --no-tag

Notes:
  - Accepts versions in the form X.Y.Z (optionally prefixed with "v").
  - Updates:
      apps/desktop/package.json
      apps/desktop/src-tauri/tauri.conf.json
  - Creates local git tag `desktop-vX.Y.Z` by default (use `--no-tag` to skip).
EOF
}

normalise_version() {
  local input="$1"
  input="${input#v}"
  if [[ ! "$input" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    die "Invalid version '$1'. Use X.Y.Z or vX.Y.Z."
  fi
  printf "%s" "$input"
}

require_file() {
  local path="$1"
  [[ -f "$path" ]] || die "Required file not found: $path"
}

read_version_from_json() {
  local file_path="$1"
  node -e "const fs=require('fs'); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write(String(j.version ?? ''));" "$file_path"
}

write_version_to_json() {
  local file_path="$1"
  local version="$2"
  node -e "const fs=require('fs'); const p=process.argv[1]; const v=process.argv[2]; const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version=v; fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');" "$file_path" "$version"
}

create_git_tag() {
  local tag_name="$1"

  if ! command -v git >/dev/null 2>&1; then
    die "git is required to create release tags."
  fi

  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not inside a git repository; cannot create tag $tag_name."
  fi

  if git rev-parse -q --verify "refs/tags/$tag_name" >/dev/null 2>&1; then
    warn "Tag $tag_name already exists locally. Skipping tag creation."
    return 0
  fi

  git tag "$tag_name"
  ok "Created local git tag $tag_name"
}

DRY_RUN=false
CREATE_TAG=true
VERSION_ARG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --no-tag)
      CREATE_TAG=false
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -n "$VERSION_ARG" ]]; then
        die "Unexpected argument: $1"
      fi
      VERSION_ARG="$1"
      shift
      ;;
  esac
done

if [[ -z "$VERSION_ARG" ]]; then
  read -r -p "Enter desktop release version (X.Y.Z or vX.Y.Z): " VERSION_ARG
fi

NEW_VERSION="$(normalise_version "$VERSION_ARG")"
TAG_NAME="desktop-v$NEW_VERSION"

require_file "$DESKTOP_PACKAGE_JSON"
require_file "$TAURI_CONF_JSON"

CURRENT_DESKTOP_VERSION="$(read_version_from_json "$DESKTOP_PACKAGE_JSON")"
CURRENT_TAURI_VERSION="$(read_version_from_json "$TAURI_CONF_JSON")"

info "Current apps/desktop/package.json version: $CURRENT_DESKTOP_VERSION"
info "Current apps/desktop/src-tauri/tauri.conf.json version: $CURRENT_TAURI_VERSION"
info "Requested new version: $NEW_VERSION"

if [[ "$CURRENT_DESKTOP_VERSION" == "$NEW_VERSION" && "$CURRENT_TAURI_VERSION" == "$NEW_VERSION" ]]; then
  warn "Both files are already at version $NEW_VERSION. No changes required."
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  warn "Dry run enabled. No files will be modified."
  info "Would set apps/desktop/package.json to $NEW_VERSION"
  info "Would set apps/desktop/src-tauri/tauri.conf.json to $NEW_VERSION"
  if [[ "$CREATE_TAG" == true ]]; then
    info "Would create local git tag $TAG_NAME"
  else
    info "Would skip git tag creation (--no-tag)"
  fi
  exit 0
fi

write_version_to_json "$DESKTOP_PACKAGE_JSON" "$NEW_VERSION"
write_version_to_json "$TAURI_CONF_JSON" "$NEW_VERSION"
if [[ "$CREATE_TAG" == true ]]; then
  create_git_tag "$TAG_NAME"
fi

ok "Updated desktop release version to $NEW_VERSION"
info "Next steps:"
info "  git add apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json"
info "  git commit -m \"chore(release): desktop-v$NEW_VERSION\""
if [[ "$CREATE_TAG" == true ]]; then
  info "  git push origin $TAG_NAME"
else
  info "  git tag $TAG_NAME && git push origin $TAG_NAME"
fi
COMMENT_FREE_CODE_VIEW


# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment explains why strict shell flags are documented below.
# Exit on error (`-e`), undefined variable (`-u`), and failed pipeline segment (`-o pipefail`).
set -euo pipefail

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment explains why path-related comments are grouped here.
# Resolve repository paths relative to this script so it works from any cwd.
# `BASH_SOURCE[0]` points at this file even when sourced via symlinked paths.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Desktop package manifest that must be version-aligned for release.
DESKTOP_PACKAGE_JSON="$ROOT_DIR/apps/desktop/package.json"
# Tauri manifest that drives bundled app version metadata.
TAURI_CONF_JSON="$ROOT_DIR/apps/desktop/src-tauri/tauri.conf.json"

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment clarifies that terminal-style notes describe readability behaviour.
# Only emit ANSI colours when stdout is a terminal.
if [[ -t 1 ]]; then
  # Reset sequence clears any previously applied terminal style.
  C_RESET="\033[0m"
  # Red is used for error-level output.
  C_RED="\033[31m"
  # Green is used for success-level output.
  C_GREEN="\033[32m"
  # Yellow is used for warnings.
  C_YELLOW="\033[33m"
  # Blue is used for informational output.
  C_BLUE="\033[34m"
else
  # In non-interactive contexts (CI/log files), emit plain text with no escape codes.
  C_RESET=""
  C_RED=""
  C_GREEN=""
  C_YELLOW=""
  C_BLUE=""
fi

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment marks that helper comments document logging intent.
# Small logging helpers keep output consistent and easy to scan.
# `info` is for normal progress/state messages.
info() { printf "%b\n" "${C_BLUE}info:${C_RESET} $*"; }
# `warn` is for non-fatal issues or no-op conditions.
warn() { printf "%b\n" "${C_YELLOW}warn:${C_RESET} $*"; }
# `ok` is for completion/success output.
ok() { printf "%b\n" "${C_GREEN}ok:${C_RESET} $*"; }
# `die` prints an error and terminates with non-zero status.
die() { printf "%b\n" "${C_RED}error:${C_RESET} $*" >&2; exit 1; }

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment introduces documentation for the usage printer comment.
# Print CLI usage instructions and exit.
usage() {
  # Single-quoted heredoc avoids variable interpolation in help text.
  cat <<'EOF'
Usage:
  scripts/release-desktop.sh [version] [--dry-run] [--no-tag]

Examples:
  scripts/release-desktop.sh 0.2.0
  scripts/release-desktop.sh v0.2.0 --dry-run --no-tag

Notes:
  - Accepts versions in the form X.Y.Z (optionally prefixed with "v").
  - Updates:
      apps/desktop/package.json
      apps/desktop/src-tauri/tauri.conf.json
  - Creates local git tag `desktop-vX.Y.Z` by default (use `--no-tag` to skip).
EOF
}

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment notes that validation comments focus on release safety.
# Validate and normalise the requested release version.
normalise_version() {
  # Capture raw user input for validation.
  local input="$1"
  # Accept optional "v" prefix, then enforce strict semver core (X.Y.Z).
  input="${input#v}"
  # Keep format intentionally strict to match tag convention `desktop-vX.Y.Z`.
  if [[ ! "$input" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    die "Invalid version '$1'. Use X.Y.Z or vX.Y.Z."
  fi
  # Return canonical (non-prefixed) version.
  printf "%s" "$input"
}

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment marks that this section enforces file preconditions.
# Ensure required file path exists before continuing.
require_file() {
  # File path to validate.
  local path="$1"
  # Stop early with a clear message if file is missing.
  [[ -f "$path" ]] || die "Required file not found: $path"
}

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment explains why the JSON helper comment exists.
# Use Node for JSON edits to avoid brittle sed/jq dependencies.
# Read the `version` field from a JSON file and print it.
read_version_from_json() {
  # Path to JSON file containing a top-level `version` key.
  local file_path="$1"
  # Inline Node keeps dependency surface minimal and formatting predictable.
  node -e "const fs=require('fs'); const p=process.argv[1]; const j=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write(String(j.version ?? ''));" "$file_path"
}

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment indicates the write helper comments preserve formatting intent.
# Set the `version` field in a JSON file and write back pretty-printed content.
write_version_to_json() {
  # Target JSON file path.
  local file_path="$1"
  # New version string to persist.
  local version="$2"
  # Preserve 2-space indentation and trailing newline for stable diffs.
  node -e "const fs=require('fs'); const p=process.argv[1]; const v=process.argv[2]; const j=JSON.parse(fs.readFileSync(p,'utf8')); j.version=v; fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');" "$file_path" "$version"
}

create_git_tag() {
  # Local tag name to create, e.g. `desktop-v0.2.0`.
  local tag_name="$1"

  # Fail fast if git is unavailable.
  if ! command -v git >/dev/null 2>&1; then
    die "git is required to create release tags."
  fi

  # Ensure we are running within a git repository.
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    die "Not inside a git repository; cannot create tag $tag_name."
  fi

  # Treat existing local tag as a non-fatal condition.
  if git rev-parse -q --verify "refs/tags/$tag_name" >/dev/null 2>&1; then
    warn "Tag $tag_name already exists locally. Skipping tag creation."
    return 0
  fi

  # Create the local lightweight tag.
  git tag "$tag_name"
  ok "Created local git tag $tag_name"
}

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment tells readers that runtime-state comments begin here.
# Default execution mode writes files.
DRY_RUN=false
# Toggle for creating local release tag as part of this script.
CREATE_TAG=true
# Optional positional argument for requested version.
VERSION_ARG=""

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment labels CLI parsing commentary for scanability.
# Parse flags and optional positional version argument.
while [[ $# -gt 0 ]]; do
  # Branch on current argument.
  case "$1" in
    --dry-run)
      # Enable preview mode that reports intended changes only.
      DRY_RUN=true
      # Consume this flag.
      shift
      ;;
    --no-tag)
      # Allow skipping local tag creation when needed.
      CREATE_TAG=false
      # Consume this flag.
      shift
      ;;
    -h|--help)
      # Show usage text for help request.
      usage
      # Exit successfully after showing help.
      exit 0
      ;;
    *)
      # Reject extra positional args beyond a single version value.
      if [[ -n "$VERSION_ARG" ]]; then
        die "Unexpected argument: $1"
      fi
      # First non-flag argument is treated as the target version.
      VERSION_ARG="$1"
      # Consume this argument.
      shift
      ;;
  esac
done

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment introduces input fallback commentary.
# Fall back to an interactive prompt if no version was provided.
if [[ -z "$VERSION_ARG" ]]; then
  # `-r` prevents backslash escaping during input capture.
  read -r -p "Enter desktop release version (X.Y.Z or vX.Y.Z): " VERSION_ARG
fi

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment marks version resolution and guard-rail commentary.
# Convert the user input to canonical `X.Y.Z` form.
NEW_VERSION="$(normalise_version "$VERSION_ARG")"
# Canonical release tag that matches CI trigger expectations.
TAG_NAME="desktop-v$NEW_VERSION"

# Verify both target manifests exist before reading/updating.
require_file "$DESKTOP_PACKAGE_JSON"
require_file "$TAURI_CONF_JSON"

# Read current versions so the script can report state and detect no-op cases.
CURRENT_DESKTOP_VERSION="$(read_version_from_json "$DESKTOP_PACKAGE_JSON")"
CURRENT_TAURI_VERSION="$(read_version_from_json "$TAURI_CONF_JSON")"

# Print current and target versions for traceability.
info "Current apps/desktop/package.json version: $CURRENT_DESKTOP_VERSION"
info "Current apps/desktop/src-tauri/tauri.conf.json version: $CURRENT_TAURI_VERSION"
info "Requested new version: $NEW_VERSION"

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment highlights that the branch below avoids redundant writes.
# Exit early when both files already match the requested version.
if [[ "$CURRENT_DESKTOP_VERSION" == "$NEW_VERSION" && "$CURRENT_TAURI_VERSION" == "$NEW_VERSION" ]]; then
  warn "Both files are already at version $NEW_VERSION. No changes required."
  exit 0
fi

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment explains the preview-only branch commentary.
# Dry run shows intent without mutating files.
if [[ "$DRY_RUN" == true ]]; then
  # Warn so output makes it obvious this was a preview run.
  warn "Dry run enabled. No files will be modified."
  # Show exact mutations that would have happened.
  info "Would set apps/desktop/package.json to $NEW_VERSION"
  info "Would set apps/desktop/src-tauri/tauri.conf.json to $NEW_VERSION"
  # Show the tag action that would be taken.
  if [[ "$CREATE_TAG" == true ]]; then
    info "Would create local git tag $TAG_NAME"
  else
    info "Would skip git tag creation (--no-tag)"
  fi
  exit 0
fi

# Comment comment comment: this comment comments on the comment comment comment comment below.
# Comment comment: this comment introduces the final mutation/success commentary section.
# Write both files in one run so versions stay in sync.
# Update desktop package manifest.
write_version_to_json "$DESKTOP_PACKAGE_JSON" "$NEW_VERSION"
# Update Tauri application manifest.
write_version_to_json "$TAURI_CONF_JSON" "$NEW_VERSION"
# Optionally create the local release tag.
if [[ "$CREATE_TAG" == true ]]; then
  create_git_tag "$TAG_NAME"
fi

# Report success and suggested git steps.
ok "Updated desktop release version to $NEW_VERSION"
info "Next steps:"
info "  git add apps/desktop/package.json apps/desktop/src-tauri/tauri.conf.json"
info "  git commit -m \"chore(release): desktop-v$NEW_VERSION\""
if [[ "$CREATE_TAG" == true ]]; then
  info "  git push origin $TAG_NAME"
else
  info "  git tag $TAG_NAME && git push origin $TAG_NAME"
fi
