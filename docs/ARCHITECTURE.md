# ARCHITECTURE.md – Liminal Notes

## 1. Architectural Goals

This architecture is designed to support **Liminal Notes**, a local-first PKM app with:

- **Local-first, offline-by-default** behaviour.
- **Cross-platform desktop support** (Linux, Windows, macOS) via **Tauri**.
- A **web-tech front end** (TypeScript + React) for rapid iteration.
- A **shared core engine** (Rust) that can eventually be reused by mobile clients.
- A **plugin-friendly design**, where most features can be implemented as extensions over a small, stable core.
- Clean separation between:
  - **Data layer** (vault, notes, index, graph)
  - **Application services** (search, sync, publish, plugin host)
  - **Presentation layer** (desktop UI, future mobile UI, CLI tooling).

React Native remains an option for future mobile clients, but the initial architecture assumes **Tauri-based desktop** as the primary target.

---

## 2. Platform Strategy

### 2.1 Desktop (Primary)

- **Shell:** Tauri

  - Small footprint, native windowing, system tray, menus.
  - Rust backend with WebView front end.

- **Frontend:** React + TypeScript

  - SPA loaded in the Tauri WebView.
  - Component-based UI, easy theming, and good ecosystem.

- **Backend/Core:** Rust

  - Vault engine, file watching, indexing, plugin host, sync, publish.

Rationale:

- Tauri gives excellent **Linux/Windows/macOS** coverage.
- Rust is well-suited for efficient indexing, graph computation, and filesystem work.
- Web tech UI aligns with the plugin and theming model.

### 2.2 Mobile (Future)

Two potential options, both supported by the same Rust core:

1. **React Native client**

   - Shared core via Rust compiled to native libraries (FFI bindings).
   - Uses mobile-native UI components but the same vault/index logic.

2. **Tauri Mobile** (when sufficiently mature)

   - Same Tauri + React app, adjusted for mobile constraints.

For the first iteration, mobile is considered **out of scope**. The architecture below is designed so the Rust core and data formats are reusable by a future mobile app.

---

## 3. High-Level Architecture

Layers (bottom → top):

1. **Storage Layer (Filesystem)**

   - Vault directory, Markdown files, attachments, config files, derived JSON.

2. **Core Engine (Rust)**

   - Vault manager
   - File watcher
   - Markdown parser + link extractor
   - Indexing/search
   - Graph engine
   - Properties/Bases engine
   - Canvas engine
   - Sync + publish modules (optional)

3. **Plugin Host (Rust + JS/TS)**

   - Loads plugin manifests and scripts.
   - Exposes a stable API surface to JS plugins.

4. **Tauri Bridge Layer**

   - Commands and events exposed from Rust to the React front end.
   - IPC for requests (e.g., `getNote`, `search`, `openVault`).

5. **Frontend Application (React + TS)**

   - State management (e.g. Zustand/Redux-like store).
   - UI: editors, graph view, bases, canvas, panes, settings, command palette.
   - Plugin UI integration points.

---

## 4. Core Engine (Rust)

The core engine is implemented as one or more Rust crates, compiled into a Tauri backend and potentially reused by other clients.

### 4.1 Vault Manager

Responsibilities:

- Manage a list of known vaults.
- Open/close vaults and keep track of the active vault.
- Load and persist `vault.config` (JSON/YAML).
- Expose a platform-neutral vault descriptor (`VaultDescriptor`) via a `VaultConfigAdapter` so frontends do not handle platform-specific locators directly (desktop path, Android SAF URI, iOS bookmark).
- Resolve platform-specific absolute paths/URIs on behalf of callers (e.g., “open in explorer”) through the adapter surface instead of leaking locator details into the UI.
- The canonical descriptor and locator types (plus the config adapter interface) live in `@liminal-notes/vault-core`.

Key types:

- `VaultId`
- `VaultConfig`
- `VaultHandle` (includes paths, watchers, indexes, settings).

### 4.2 Filesystem Layer

Responsibilities:

- Wrap filesystem operations with a constrained API (for plugins and frontend).
- Maintain a file tree representation of the vault.
- Provide abstractions for:

  - `FileItem` (markdown, attachment, canvas, base, other).
  - Reading/writing files with atomic operations.

Implementation details:

- Use OS-specific file watchers to detect changes (e.g., `notify` crate).
- Normalise events into a cross-platform `FileEvent` type.

### 4.3 Markdown & Note Parsing

Responsibilities:

- Parse Markdown file contents into:

  - raw text
  - AST
  - extracted frontmatter
  - links (wikilinks, markdown links, embeds)
  - tags and other tokens.

Key types:

- `Note` (matches SPEC: id, title, body, frontmatter, links, tags, properties).
- `Link` (source, target, type, position).

Implementation notes:

- Use a Markdown parser with extensibility for:

  - wikilinks (`[[Note]]`)
  - callouts
  - custom fenced blocks (e.g. `base`, `canvas`, plugin blocks).

### 4.4 Indexing & Search Engine

Responsibilities:

- Maintain an inverted index for:

  - note titles
  - bodies
  - tags
  - properties.

- Provide query API:

  - full-text search
  - property-based filters
  - tag filters
  - saved queries.

Architecture:

- Background worker that:

  - listens to `FileEvent`s.
  - re-parses changed notes.
  - updates the index incrementally.

Key modules:

- `Indexer`
- `SearchService`
- `QueryParser` (turns user query strings into an AST evaluated against the index).

### 4.5 Link & Graph Engine

Responsibilities:

- Construct link index from `Note.links`.
- Provide:

  - backlinks
  - unlinked mentions
  - global graph
  - local graph (within N hops of a note).

Key modules:

- `LinkIndex`
- `GraphService`

Graph computation:

- Represent notes as nodes, links as edges.
- Provide APIs for graph queries:

  - `getGlobalGraph(filters)`
  - `getLocalGraph(noteId, depth, filters)`.

### 4.6 Properties & Bases Engine

Responsibilities:

- Normalise frontmatter and tags into structured properties.
- Provide typed access to properties.
- Evaluate Base definitions:

  - underlying query (folder, tag, search expression).
  - columns/fields referencing properties.

Key modules:

- `PropertyIndex`
- `BaseEngine` (evaluates `.base` definitions against the note index).

### 4.7 Canvas Engine

Responsibilities:

- Read/write `.canvas` JSON files.
- Resolve card references to notes/attachments.
- Provide graph-like relationships derived from canvas connections (optional).

Key modules:

- `CanvasModel`
- `CanvasService` (CRUD over canvases).

### 4.8 Sync Module (Optional)

Responsibilities:

- Monitor vault changes and send encrypted deltas to a remote service.
- Apply remote changes to local files.
- Manage conflict resolution and version history.

Implementation notes:

- Separate from core; opt-in.
- Store sync metadata in a dedicated subfolder (e.g., `.sync/`).
- Define a generic sync adapter interface so multiple backends can be implemented (self-hosted, cloud, etc.).

### 4.9 Publish Module (Optional)

Responsibilities:

- Generate a static/dynamic site from a subset of notes.
- Resolve internal links to site-relative URLs.
- Optionally include graph, search, and custom navigation.

Implementation notes:

- Uses the same Markdown/AST pipeline as the desktop app.
- Outputs standard HTML/CSS/JS, with a documented structure.

---

## 5. Tauri Integration

### 5.1 Tauri Commands (Rust → Frontend)

Expose a set of commands for the React app to call via IPC:

- Vault

  - `list_vaults()`
  - `open_vault(vaultId | path)`
  - `close_vault(vaultId)`

- Files & Notes

  - `list_files(vaultId, filter)`
  - `read_note(vaultId, noteId)`
  - `write_note(vaultId, noteId, content)`
  - `create_note(vaultId, path, content)`
  - `delete_file(vaultId, path)`

- Search & Graph

  - `search(vaultId, query)`
  - `get_backlinks(vaultId, noteId)`
  - `get_graph(vaultId, options)`

- Bases & Canvas

  - `list_bases(vaultId)`
  - `evaluate_base(vaultId, baseId)`
  - `read_canvas(vaultId, canvasId)`
  - `write_canvas(vaultId, canvasId, data)`

- Plugins & Settings

  - `list_plugins(vaultId)`
  - `enable_plugin(vaultId, pluginId)`
  - `disable_plugin(vaultId, pluginId)`
  - `get_settings(vaultId)`
  - `set_settings(vaultId, settings)`

### 5.2 Events (Backend → Frontend)

Use Tauri’s event system to notify the React app of:

- `file_changed` (path, type)
- `vault_indexed` (vaultId)
- `search_index_updated` (vaultId)
- `plugin_state_changed` (pluginId, enabled/disabled)

Frontend subscribes to these events to refresh views, update caches, and show status indicators.

---

## 6. Frontend Architecture (React + TS)

### 6.1 State Management

- Single app-wide store (e.g. Zustand/Redux-like) holding:

  - active vault
  - open panes/tabs
  - current note, search results, graph data
  - bases, canvases
  - plugin state
  - UI preferences (theme, layout).

### 6.2 Major UI Modules

- **Vault Selector**
- **File Explorer**
- **Editor** (source, live preview, reading)
- **Backlinks & Link Preview**
- **Graph View** (global/local)
- **Bases View** (table/cards)
- **Canvas View**
- **Search Panel**
- **Command Palette**
- **Settings & Plugin Manager**

Each module communicates with the Tauri backend via a thin `api` layer (TS functions that wrap Tauri commands).

### 6.3 Plugin UI Integration

- Plugins can:

  - register custom views (panes).
  - add commands to the command palette.
  - contribute editor decorations and context menu items.

Implementation approach:

- Frontend maintains a `PluginRegistry` in state.
- Plugin metadata describes:

  - view components
  - commands
  - routes/locations where UI should appear.

- Runtime loads plugin UI bundles as ES modules in a sandboxed way.

---

## 7. Plugin System

### 7.1 Plugin Packaging

Each plugin is a directory with:

- `manifest.json`

  - `id`, `name`, `version`
  - `minAppVersion`
  - `permissions` (fs, network, index, etc.)
  - entry points for backend/frontend scripts.

- `main.js` (backend logic, runs in plugin host VM)
- optional `ui.js` (frontend UI components)
- optional `styles.css`

### 7.2 Execution Model

- **Backend plugins** run in a JS runtime embedded in the Rust core (e.g. Deno/quickjs-like).

  - They register hooks:

    - on note change
    - on command invocation
    - on app events.

  - They access core services via a well-defined API (vault, index, graph).

- **Frontend plugins** run in the React/WebView environment.

  - They register UI contributions (views, buttons, context menus).

Security & isolation:

- Permission system enforced at the API boundary.
- Network access and arbitrary filesystem access are opt-in and visible to the user.

---

## 8. Data Formats

Core formats (designed to be simple and portable):

- **Notes:**

  - `.md` files with optional YAML frontmatter.

- **Vault Config:**

  - `vault.config.json` in the root of the vault.

- **Canvas Files:**

  - `.canvas` JSON documents with:

    - nodes (cards) referencing notes/files/URLs
    - edges (connections)
    - layout metadata.

- **Bases:**

  - `.base` JSON or YAML documents specifying:

    - source query (search expression)
    - columns and view configuration.

- **Plugin Config:**

  - per-vault plugin settings in `.plugins/<pluginId>.json`.

- **Sync Metadata:** (optional)

  - `.sync/` directory containing:

    - device IDs
    - change history
    - conflict markers.

All formats are documented and versioned so third-party tools can interoperate.

---

## 9. Mobile & Future Extensions

### 9.1 Mobile (React Native Option)

If a React Native client is developed:

- The Rust core becomes a separate crate compiled for mobile targets.
- Expose FFI bindings to RN via a native module:

  - `openVault`, `listNotes`, `readNote`, `search`, etc.

- Store data either:

  - in a synced vault folder (via platform-specific sync), or
  - in a mobile-local vault that syncs with desktop via the Sync module.

The mobile app reuses:

- Data formats
- Core search/graph logic
- Base/canvas definitions (where applicable).

### 9.2 Optional Local LLM Integration

Future module that:

- Reads from the note index.
- Provides semantic search, summarisation, link suggestions.
- Runs entirely locally using a separate process or WASM module.

---

## 10. Development & Repository Layout

Suggested monorepo structure:

- `/apps/desktop` – Tauri app

  - `/src-tauri` – Rust backend (core + Tauri commands)
  - `/src` – React frontend

- `/packages/core` – pure Rust crates

  - `vault-core`
  - `index-core`
  - `graph-core`
  - `base-core`
  - `canvas-core`

- `/packages/plugin-api` – TypeScript definitions for plugin authors

- `/packages/ui` – shared React UI components

- `/examples/plugins` – sample plugins (for testing the API)

Build & tooling:

- Use a JS package manager (pnpm/yarn) for frontend + plugin API.
- Use Cargo for Rust crates.
- CI pipeline:

  - Rust tests & lints
  - TypeScript/React tests & lints
  - Integration tests spinning up a headless Tauri app against a test vault.

This structure keeps the **core engine** clean and reusable, while letting the Tauri desktop app and any future mobile or web clients build on the same foundations.
