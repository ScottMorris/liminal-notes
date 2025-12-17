# Sync Providers

> Goal: A cross-platform sync system with **one shared SyncCore** and **provider plugins** (first-party and third-party), while keeping the app **local-first** and the vault **file-based**.
>
> Default posture: **one provider per vault**, attempt **auto-merge first**, then fall back to **conflict duplicates + UI surfacing**.

## Goals

* Support syncing a vault across **Desktop (Tauri)**, **Mobile (React Native)**, and (later) **Web**.
* Keep the vault **plain files** (Markdown + attachments) with minimal required metadata.
* Make sync **optional and swappable** via **sync provider plugins**.
* Provide a first-party **Git provider** as the initial “power user” sync path.
* Make conflicts survivable:

  * try a 3-way merge for text
  * otherwise generate conflict duplicates
  * always surface conflicts in UI
* Sync more than notes:

  * vault-level settings
  * plugin settings (vault-scoped)
  * spellcheck dictionaries / custom words

## Non-goals

* Realtime collaborative editing (CRDT/OT) in v1.
* Multiple active providers writing to the same vault simultaneously.
* Perfect rename tracking across all backends in v1 (we’ll do “good enough” with heuristics and/or provider capabilities).

## Principles

* **Local-first:** the vault is usable offline; sync is a background operation.
* **Deterministic:** the same inputs yield the same outputs; sync metadata is explicit.
* **Provider isolation:** providers adapt transport/versioning; SyncCore owns merge/apply semantics.
* **Safety over cleverness:** never lose data; prefer duplicates over destructive merges.

## Definitions

* **Vault:** a directory containing notes and attachments.
* **Provider:** a remote or service capable of storing and retrieving changes.
* **SyncCore:** the in-app engine that tracks local changes, applies remote changes, and resolves conflicts.
* **Cursor:** provider-specific checkpoint for incremental pulls.
* **Device ID:** stable identifier for the device instance participating in sync.

## Provider taxonomy

### 1) Managed API providers (preferred long-term)

Examples: Firebase/custom server, Dropbox API, Google Drive API, OneDrive API.

Pros:

* Deltas, revisions, and conflict metadata can be first-class.
* Stronger path to E2EE.

Cons:

* OAuth, token refresh, quotas, background sync complexity.

### 2) Git provider (first-party MVP)

Git is “file-based sync with history”. It’s a strong first provider because:

* revision history is built-in
* conflict behaviour is familiar to power users
* it works well with plain Markdown + attachments

### 3) External filesystem sync (out of scope as a provider)

Examples: Syncthing, OS “sync folder”, iCloud Drive folder, etc.

We don’t implement these as providers. The app still works with them because everything is files.

Optional: ship a plugin that surfaces **status hints** (e.g., “Syncthing connected / last sync time”) without taking responsibility for merging.

## Vault layout additions

### `.sync/` (SyncCore-owned metadata)

All sync providers use the same local metadata folder.

Suggested contents:

* `.sync/device.json`

  * `deviceId`, `deviceName`, `createdAt`
* `.sync/state.json`

  * provider id
  * last successful sync timestamps
  * local watermark (last applied remote op)
* `.sync/files.json`

  * per-file records:

    * stable `fileId`
    * current path
    * content hash
    * last known base revision info (provider-neutral)
* `.sync/ops.log` (or chunked JSONL)

  * append-only local operation log (create/update/delete/move)
* `.sync/conflicts.json`

  * unresolved conflicts with pointers to the involved files

### `.plugins/` (plugin settings, vault-scoped)

* `.plugins/<pluginId>.json`

  * plugin configuration that should sync with the vault

### `.liminal/spellcheck/` (spellcheck assets, vault-scoped)

* custom dictionary words / ignore lists that should sync

## SyncCore responsibilities

### 1) Observe local changes

* Watch for file system changes inside the vault.
* Convert changes into normalised **operations**:

  * `create`, `update`, `delete`, `move`
* Debounce and coalesce bursts (e.g., editor saves).

### 2) Push local changes

* Ask the provider to apply operations.
* Persist acknowledgements + cursors.

### 3) Pull remote changes

* Pull remote operations since last cursor.
* Apply operations to the local vault atomically.

### 4) Resolve conflicts

* Text files:

  * attempt 3-way merge when a base is known
  * if merge fails: create a conflict duplicate
* Binary files:

  * never merge; always duplicate on conflict

### 5) Surface state to UI

* Connection status (connected/disconnected/auth error)
* Queue sizes (pending push / pending pull)
* Last sync time
* Conflicts list
* Provider-specific warnings (quota, rate limiting, etc.)

## Operation model

```ts
export type SyncOp =
  | { type: "create"; path: string; fileId: string; bytes?: Uint8Array; mime?: string }
  | { type: "update"; path: string; fileId: string; bytes?: Uint8Array; mime?: string; base?: BaseRef }
  | { type: "delete"; path: string; fileId: string }
  | { type: "move"; from: string; to: string; fileId: string };

export type BaseRef = {
  // provider-neutral reference captured at the time the local edit was based on
  providerRev?: string;
  contentHash?: string;
};
```

Notes:

* Providers may ignore some fields; SyncCore still stores them.
* `fileId` allows better rename/move behaviour.

## Conflict strategy

### When to attempt auto-merge

Attempt auto-merge for:

* Markdown files (`.md`)
* small-ish text files (config, JSON)

Do not attempt auto-merge for:

* binaries (images/audio)
* very large files (over merge limit)

### Merge algorithm

* If `base` is known, do a 3-way merge: `base` vs `local` vs `remote`.
* If no base exists, do a best-effort 2-way merge for Markdown (optional), otherwise conflict.

### Conflict output convention

Create a conflict duplicate:

* `Note (Conflict — <DeviceName> — YYYY-MM-DD HHmm).md`

Record the conflict in `.sync/conflicts.json`:

```json
{
  "id": "conf_…",
  "path": "notes/Note.md",
  "conflictPath": "notes/Note (Conflict — PixelLaptop — 2025-12-16 2142).md",
  "provider": "git",
  "createdAt": "2025-12-16T21:42:00Z",
  "status": "unresolved"
}
```

## Attachments policy

* Treat attachments as opaque binaries.
* Define a default max attachment size (e.g., **25 MB** per file) with a per-vault override.
* If a provider cannot handle a file (size/quota/unsupported), surface a non-blocking error and keep the file local.
* Allow a per-vault ignore list (glob patterns) to exclude paths from sync.

## Settings & UI

### Where it lives

* **Settings → Vault → Sync** (per-vault)

### Core controls

* Provider selection (None / Git / …)
* Connect / Disconnect
* Sync Now
* Pause sync
* Reset provider state (dangerous)
* Status display:

  * last sync time
  * pending changes
  * errors

### Conflicts UI

* Conflicts list
* Actions:

  * Open both files
  * Mark resolved
  * Delete conflict copy (optional; never default)

### Plugin settings integration

* Settings should have a **Plugins** category.
* Plugins can register settings sections that render under Settings.
* Plugin settings must declare scope:

  * `global` (device-local)
  * `vault` (syncs with vault)

## Plugin API additions

### New concepts

* `SyncService` (core)

  * lists providers
  * enables/disables provider per vault
  * exposes status, progress events, and conflicts

* `SecretsService` (core)

  * secure storage for tokens/credentials

### Provider plugin interface (backend plugin)

```ts
export interface SyncProvider {
  id: string;
  name: string;
  capabilities: {
    supportsDelta: boolean;
    supportsRevisions: boolean;
    supportsMove: boolean;
    maxBytesPerFile?: number;
    platforms?: Array<"desktop" | "mobile" | "web">;
  };

  // lifecycle
  connect(ctx: SyncProviderContext): Promise<void>;
  disconnect(): Promise<void>;

  // sync
  pull(cursor: string | null): Promise<{ ops: SyncOp[]; nextCursor: string | null }>;
  push(ops: SyncOp[]): Promise<void>;

  // status
  getStatus(): Promise<SyncProviderStatus>;
}

export type SyncProviderStatus = {
  state: "disconnected" | "connecting" | "connected" | "error";
  message?: string;
};
```

### Plugin settings UI registration

Extend `SettingsService` so plugins can register sections:

```ts
type SettingsScope = "global" | "vault";

type SettingsSectionDef = {
  id: string;
  title: string;
  scope: SettingsScope;
  // Schema-driven rendering (preferred) OR a React component hook (advanced)
  schema?: unknown;
  render?: () => JSX.Element;
};

interface SettingsService {
  getPluginSettings<T>(pluginId: string, scope?: SettingsScope): Promise<T | null>;
  setPluginSettings<T>(pluginId: string, value: T, scope?: SettingsScope): Promise<void>;
  registerSettingsSections(pluginId: string, sections: SettingsSectionDef[]): Disposable;
}
```

Storage rules:

* `vault` scope → `.plugins/<pluginId>.json`
* `global` scope → app config store

## Git provider (first-party MVP)

### Capabilities

* Desktop: supported
* Mobile: planned (requires native support or shared Rust core)
* Web: likely not supported initially

### Behaviour

* First run:

  * `Init repo` or `Clone repo`
  * configure remote (URL)
  * auth method (PAT/HTTPS, SSH)
* Sync cycle:

  * commit local changes (with a predictable message)
  * pull (rebase or merge; configurable)
  * resolve conflicts using SyncCore semantics
  * push

### Notes

* Prefer a native Git implementation in Rust (libgit2/gix) for consistency.
* Avoid shelling out to `git` unless explicitly enabled (debug/advanced).

## Platform notes

### Desktop (Tauri)

* Background sync timer + manual button.
* Use OS keychain (via a secrets abstraction).

### Mobile (React Native)

* Background sync constraints (OS scheduling limitations).
* Secrets stored in platform keychain.
* Git provider likely needs a native layer or shared Rust core.

### Web (later)

* Providers must use browser OAuth flows.
* Local storage via OPFS/IndexedDB.
* Background sync is limited; expect manual sync + periodic foreground sync.

## Roadmap (phased)

### Phase 1 — Foundations

* SyncCore `.sync/` metadata, device identity, op normalisation, conflict output.
* Settings UI: Vault Sync screen + conflicts list.
* Plugin API updates: plugin settings sections + secrets service.

### Phase 2 — Git provider (Desktop)

* First-party Git provider plugin
* Auth storage
* Robust pull/merge/push loop

### Phase 3 — Mobile sync capability

* Platform abstractions for background jobs, secrets, filesystem access.
* Decide Git feasibility on RN (native vs shared Rust core).

### Phase 4 — Managed API providers

* Add Dropbox / Drive / OneDrive via plugins.
* Define OAuth + token refresh patterns.

## Open questions

* Do we want optional E2EE in v1 for managed providers?
* What is the default Git pull strategy (merge vs rebase) and how is that exposed to users?
* How aggressive should rename detection be when a provider doesn’t support it?
* What is the default attachment size limit and should it vary by provider?
