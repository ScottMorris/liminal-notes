# MOBILE_SPEC — Liminal Notes Mobile

This document defines the scope, architectural principles, and initial implementation plan for the Liminal Notes mobile application.

All mobile‑specific specifications live under `docs/mobile/`. This file serves as the root entry point for mobile architecture and links out to more detailed, focused documents in that folder. It establishes a stable foundation for starting development while intentionally leaving room for growth, parity with desktop, and future platform-specific refinements.

The mobile app is not a separate product; it is another surface of the same system. Decisions here should bias toward shared abstractions, predictable behaviour, and long-term maintainability over short-term convenience.

---

## 1. Goals

The mobile version of Liminal Notes exists to:

* Provide a local-first, plain-text note experience on mobile devices
* Maintain conceptual and behavioural parity with the desktop (Tauri) app
* Avoid duplicating core logic across platforms
* Support real-world mobile constraints without compromising the core model

The initial focus is on a usable, reliable editing and navigation loop, not feature completeness.

---

## 2. Non‑Goals (v0.x)

The following are explicitly out of scope for the first mobile iterations:

* Public plugin loading / third-party plugins
* Graph visualisation parity with desktop
* Canvas / Bases / advanced spatial UIs
* AI features
* Background sync engines (mobile relies on user-managed sync initially)

These are deferred intentionally and should be captured in TODO.md when relevant.

---

## 3. Core Principles

### 3.1 Local‑first, Plain‑text

All notes are stored as plain Markdown files (`.md`). The mobile app must:

* Read and write files directly
* Never require an account
* Never require a proprietary sync backend

### 3.2 Shared Mental Model

Desktop and mobile must agree on:

* What a vault is
* What a note is
* How links, search, and metadata work

UI differences are acceptable; data and behaviour differences are not.

### 3.3 Abstraction Before Duplication

If mobile needs logic that desktop already has (or vice versa), the preferred response is:

1. Extract a shared interface or utility
2. Implement platform-specific adapters

Not to fork behaviour.

### 3.4 Incremental Parity

Mobile does not need to ship every desktop feature immediately. However:

* The absence of a feature should never force a different data model
* Missing features should be additive, not divergent

---

## 4. Platform Targets

### 4.1 Android (Primary Initial Target)

Android is the first-class mobile target because:

* Folder-based storage access (SAF) is explicit and flexible
* User-picked vault locations integrate well with third-party sync tools

Android supports two vault modes:

* App storage (sandbox)
* User-picked external folder (Storage Access Framework)

### 4.2 iOS (Planned, Secondary)

iOS support is planned but deferred until device testing is available.

Design assumptions must be recorded so iOS parity is achievable later. In particular:

* Folder access via Files picker
* Security-scoped bookmarks

Default behaviour on iOS will mirror Android’s sandbox mode initially.

---

## 5. Mobile Architecture Overview

The mobile app is built using:

* React Native (Expo)
* TypeScript
* Expo Router (File-based routing)

The architecture is split into three layers:

1. App Layer (React Native)

* Navigation (Expo Router), screens, state management
* Vault orchestration
* Indexing, search, and persistence

2. Editor Layer (WebView)

* CodeMirror 6
* Markdown grammar and editor extensions
* Editor-only UI and interaction logic

3. Shared Core

* Parsing utilities (wikilinks, frontmatter)
* Shared types
* Interfaces for vaults and indexing

---

## 6. Editor Strategy

### 6.1 Decision

The mobile editor uses CodeMirror 6 hosted inside a WebView.

This matches the desktop editor model and follows the same approach used by Obsidian on mobile.

### 6.2 Rationale

* Preserves editor parity across platforms
* Avoids maintaining a second native editor implementation
* Enables reuse of editor extensions and behaviours

### 6.3 Responsibilities

React Native (host):

* Owns file I/O and persistence
* Owns dirty state and save policy
* Owns navigation and link resolution

WebView (guest):

* Owns text editing, selection, cursor, decorations
* Emits deterministic editor events
* Accepts commands from the host

---

## 7. Editor Messaging Protocol (Summary)

The RN host and WebView editor communicate via a strict, versioned message protocol.

Core characteristics:

* JSON messages with a shared envelope
* Versioned protocol
* Command / event separation
* Revision-based dirty tracking

The full protocol is specified in `docs/mobile/MOBILE_EDITOR.md`.

---

## 8. Vault Model

### 8.1 Vault Definition

A vault is a directory containing Markdown files and optional assets.

The mobile app must support multiple vault backends via adapters.

### 8.2 VaultAdapter Interface

All vault implementations conform to a common interface:

* listFiles
* readNote
* writeNote
* rename (optional, but recommended)
* stat (optional)
* mkdir (optional)

### 8.3 Mobile Vault Implementations

Initial implementations:

* SandboxVaultAdapter (default, no permissions)
* AndroidExternalVaultAdapter (SAF, user-picked folder)

Future:

* iOSExternalVaultAdapter (Files picker + bookmarks)

---

## 9. Indexing & Search

Mobile indexing must be safe for constrained devices.

Principles:

* No full-vault reads on startup
* Incremental updates on note save or debounced changes
* Persistent storage

SQLite is the preferred backing store.

For simple application settings and configuration (such as the active vault selection), the app uses `expo-sqlite/kv-store` wrapped in a centralized `src/storage/kv.ts` adapter. This is used for small preferences only; bulk data (indexes) and content (notes) use proper SQLite tables or the file system respectively.

Index responsibilities:

* Text search
* Wikilink resolution
* Backlinks

### 9.1 Storage Strategy

* **KV Store:** `expo-sqlite/kv-store` is used for simple application settings (e.g. active vault).
* **Index Database:** A dedicated `index.db` (SQLite) handles note metadata, links, and search tokens.
* **Full Text Search:** Uses SQLite FTS5 (if available) or FTS4. Note content is duplicated into the FTS table to enable fast searching without file I/O during query time.

### 9.2 Indexing Policy

* **Lazy Indexing:** Notes are indexed immediately upon open and save. This ensures the active working set is always up-to-date.
* **Background Scan:** On startup (or vault switch), a non-blocking background process identifies files missing from the index and queues them for indexing. This process yields to the UI to prevent jank.
* **Persistence:** The index persists across app restarts, eliminating the need for full re-scans.

---

## 10. State & Lifecycle

Mobile-specific lifecycle events must be handled explicitly:

* App backgrounding
* App termination
* OS memory pressure

On background/exit:

* Request current editor state
* Attempt a final save
* Persist index state

---

## 11. Testing Strategy

Given headless development constraints:

* Shared core utilities must be unit-tested
* Message protocol must be schema-validated and tested
* Editor host logic must be testable with a mocked WebView bridge

Device testing is required later for:

* Keyboard behaviour
* Scrolling and selection fidelity
* External folder permissions

---

## 12. Routing & Navigation

The mobile application uses **Expo Router** for file-based routing, mirroring web standards.

### 12.1 Route Structure

The initial route map is defined as follows:

* `/vault` - Authenticated vault root (placeholder for vault context)
* `/vault/explorer` - File explorer
* `/vault/note/[id]` - Note editor (dynamic route)
* `/search` - Global search modal
* `/settings` - Global settings modal

> **Note:** `react-native-screens` must be pinned to `~4.16.0` to avoid runtime crashes on Android when the New Architecture is enabled (as of Dec 2025). Upgrades should be verified carefully against this constraint.

### 12.2 Deep Linking

The application uses the `liminal` URL scheme.

* `liminal://vault` -> `/vault`
* `liminal://note/<id>` -> `/vault/note/[id]`
* `liminal://search` -> `/search`

### 12.3 Navigation Helpers

Navigation logic is centralized in `apps/mobile/src/navigation/router.ts` to abstract router implementation details.

* `openNote(id: string)`
* `openPath(path: string)`

### 12.4 Seamless Renaming

To support renaming the current note without a disruptive reload:

1. The `EditableHeaderTitle` component provides a tap-to-edit interface in the navigation bar.
2. The rename operation updates the file system, indexes (Search, Link), and persistent storage (Recents, Pinned) atomically.
3. The router's route parameters (`id` or `folder`) are updated in-place via `router.setParams`.
4. The `NoteScreen` uses a `ignoreNextLoadRef` mechanism to prevent the `useEffect` that loads content from firing when the ID changes. This ensures the editor state (cursor, history) is preserved seamlessly.

For folder renaming, the same pattern applies: files are moved, the search index is healed via a scan of the new location, and the `folder` parameter is updated in the explorer view.

---

## 13. Documentation & Evolution

This spec is expected to evolve.

Rules:

* Architectural decisions must be recorded here or in referenced docs
* Deferred work must be added to TODO.md with rationale
* Platform-specific deviations must be documented explicitly

Related documents:

* SPEC.md
* ARCHITECTURE.md
* docs/mobile/MOBILE_EDITOR.md (planned)
* docs/mobile/ (folder for all mobile‑specific specs)

---

End of document.
