# BUILD_PLAN.md – Liminal Notes

## 0. Project Identity

### 0.1 Name

**Project name:** `Liminal Notes`

**Rationale:**

* "Liminal" evokes the in-between space where ideas move from messy to structured.
* Fits a PKM tool that lives between raw text, graphs, and AI augmentation.

Feel free to rename later, but this gives the repo and artefacts a concrete identity.

### 0.2 Repo Description

**Short GitHub description:**

> A local-first, Markdown-based note-taking app with Obsidian-style linking, built with Tauri + React. Designed to be extensible and AI-ready using a plugin system and transformers.js.

**Longer README blurb:**

> Liminal Notes is a local-first, Markdown-only note-taking app inspired by tools like Obsidian. It runs on Linux, Windows, and macOS using Tauri and React, stores your notes as plain `.md` files, and lets you link them together with `[[wikilinks]]`. The first versions focus on fast editing, backlinks, search, quick-open, and a graph view, with a plugin system and local AI assistant (via transformers.js) planned as first-class features.

---

## 1. Overall Milestones

1. **Milestone 0 – Skeleton & Repo Setup**
2. **Milestone 1 – Vault Selection & File Tree**
3. **Milestone 1.25 – Dev Container & VS Code Setup**
4. **Milestone 1.5 – Theming & Dark Mode**
5. **Milestone 2 – Editor & Preview**
6. **Milestone 3 – Wikilinks & Backlinks**
7. **Milestone 4 – Search & Quick Open**
8. **Milestone 5 – Graph View & Link Navigation**
9. **Milestone 6 – Built-in Plugin Host (Frontend Only)**
10. **Milestone 7 – AI Assistant Plugin Scaffold**
11. **Milestone 8 – Polish & Packaging**

The goal is to ship something usable by Milestone 4–5, then layer in plugins, AI, and packaging.

---

## 2. Milestone 0 – Skeleton & Repo Setup

**Goal:** Get a working Tauri + React app compiling and running with a clean repo structure.

### 2.1 Repo Structure

Initial structure:

```text
liminal-notes/
  apps/
    desktop/
      src-tauri/
      src/
  packages/
    ui/             # shared UI components (optional, can be added later)
    plugin-api/     # TS types for plugin authors (stub for now)
  .gitignore
  package.json
  pnpm-workspace.yaml
  README.md
```

### 2.2 Tasks

1. **Initial repo creation**

   * Create Git repo `liminal-notes`.
   * Add `README.md` with project name + short description.

2. **Monorepo tooling**

   * Add `package.json` at root with workspace config.
   * Choose a package manager: `pnpm` (current choice).
   * Add `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.

3. **Tauri + React app scaffold**

   * Use `create-tauri-app` (or equivalent) to generate `apps/desktop` with:

     * Frontend: React + TypeScript.
     * Backend: Rust.
   * Confirm `pnpm install` and `pnpm tauri dev` runs on your machine.

4. **Basic cleanup**

   * Remove template boilerplate (counters, logos, etc.).
   * Replace with a simple `Liminal Notes` shell.

**Deliverable:** A blank desktop app window titled “Liminal Notes” that builds and runs.

---

## 3. Milestone 1 – Vault Selection & File Tree

**Goal:** User can select a folder as a vault and see `.md` files in a sidebar.

### 3.1 Backend (Rust / Tauri commands)

1. **Vault config storage**

   * Define a `VaultConfig` struct stored in the Tauri **app config directory** (not in the vault itself):

     ```rust
     struct VaultConfig {
         root_path: String,
         name: String,
     }
     ```

   * Implement Tauri commands:

     * `get_vault_config() -> Option<VaultConfig>`
     * `set_vault_config(root_path: String, name: String) -> Result<(), Error>`

   * Use Tauri’s path API to resolve the config dir and store `vault.json` there.

2. **File listing**

   * Implement `list_markdown_files() -> Result<Vec<FileEntry>, Error>` where:

     ```rust
     struct FileEntry {
         path: String,   // relative to root
         is_dir: bool,
     }
     ```

   * Walk the vault recursively and return a **flat list** of directories and `.md` files.

### 3.2 Frontend (React)

1. **Vault picker UI**

   * On startup, call `get_vault_config`.
   * If no config, show a “Select vault” view with a button.
   * Use Tauri’s dialog API to select a directory.
   * Call `set_vault_config` and then continue to the main app.

2. **File tree component**

   * Call `list_markdown_files` after vault is set.
   * Build an in-memory tree from the flat `FileEntry` list.
   * Render as a collapsible file tree in a left sidebar.
   * Clicking a file emits an `openNote(path)` action to the main pane.

**Deliverable:** You can pick a folder and see your Markdown files in the sidebar.

---

## 3.25 Milestone 1.25 – Dev Container & VS Code Setup

**Goal:** Provide a reproducible development environment using VS Code Dev Containers and Docker, so a contributor on Linux (and other platforms with Docker) can open the repo, "Reopen in Container", and immediately run `pnpm tauri dev` without manually installing Node, pnpm, Rust, or Tauri build dependencies.

### 3.25.1 Dev Container structure

* Add a `.devcontainer/` directory at the repo root containing:

  * `.devcontainer/devcontainer.json`
  * `.devcontainer/Dockerfile`

* `devcontainer.json` should:

  * Use `"dockerFile": "Dockerfile"`.
  * Set `workspaceFolder` to the repo root (e.g., `/workspaces/liminal-notes`).
  * Forward Tauri dev ports, at minimum:

    * Vite dev server: **5173**
    * Tauri dev port: **1420**
  * Recommend useful extensions (Rust, TS/JS, ESLint, Prettier, Tauri extension, etc.).
  * Run a `postCreateCommand` that installs dependencies, e.g. `pnpm install` and rust components like `rustfmt`/`clippy`.

* `Dockerfile` should be based on a recent Linux image (e.g., Ubuntu 22.04) and:

  * Install system packages required to build a Tauri app on Linux (build tools, GTK, WebKit, SSL, etc.).
  * Install Node.js (LTS) and pnpm.
  * Install Rust via `rustup` (stable toolchain) and ensure `cargo`/`rustc` are on `PATH`.

### 3.25.2 VS Code project configuration

* Add a `.vscode/` folder with:

  * `.vscode/extensions.json` – recommended extensions (matching those in `devcontainer.json`).
  * `.vscode/settings.json` – light, non-invasive defaults (format-on-save, Prettier for TS/TSX, workspace TypeScript version, etc.).

### 3.25.3 Docs and verification

* Update `CONTRIBUTING.md` with a short section under "Getting Started" explaining:

  * That a Dev Container is available for VS Code + Docker users.
  * How to open the repo, run "Reopen in Container", and get a preconfigured environment.

* From inside the dev container, verify that:

  * `pnpm -v`, `node -v`, `cargo -V` all work.
  * `pnpm install` from the repo root succeeds.
  * `pnpm tauri dev` from the repo root starts the Tauri dev process without immediate build failures.

**Deliverable:** A VS Code Dev Container setup that lets contributors clone the repo, reopen in container, and immediately run the documented dev commands.

## 3.5 Milestone 1.5 – Theming & Dark Mode

**Goal:** Add a simple but extensible theming system with support for light, dark, Dracula, and system themes.

### 3.5.1 Theme model

* Introduce a `ThemeId` union, e.g. `'system' | 'light' | 'dark' | 'dracula'`.
* Define a `Theme` type in TS with a map of CSS variable values.
* Store built-in themes in `apps/desktop/src/theme/` (e.g. `themes.ts`).

### 3.5.2 CSS variables & ThemeProvider

* Use CSS variables to style the app:

  * `--ln-bg`, `--ln-fg`, `--ln-muted`
  * `--ln-border`, `--ln-accent`
  * `--ln-sidebar-bg`, `--ln-sidebar-fg`
* Create a `ThemeProvider` and `useTheme()` hook that:

  * Tracks the current `ThemeId`.
  * Applies the appropriate variables to `:root`/`body`.
  * Handles `system` by using `prefers-color-scheme` to pick light/dark.

### 3.5.3 Persistence & UI

* Persist theme choice via `localStorage` (e.g. `liminal-notes.theme`).
* On first run, default to `system`.
* Add a small theme selector (e.g. `<select>`) in the app chrome (currently the sidebar header) with options:

  * System / Light / Dark / Dracula.

**Deliverable:** The app can switch between themes, respects OS theme when in `system` mode, and new UI uses CSS variables instead of hard-coded colours.

---

## 4. Milestone 2 – Editor & Preview

**Goal:** Open, edit, and save notes in Markdown with a split editor/preview view.

### 4.1 Backend

1. **Note read/write commands**

   * Implement:

     ```rust
     struct NotePayload {
         path: String,
         body: String,
     }

     fn read_note(path: String) -> Result<NotePayload, Error>;
     fn write_note(path: String, body: String) -> Result<(), Error>;
     ```

   * Ensure paths are resolved relative to the configured vault root and remain inside it (prevent `..` traversal).

### 4.2 Frontend

1. **Note state model**

   * Define a note type:

     ```ts
     interface Note {
       path: string;
       title: string;
       body: string;
     }
     ```

   * Maintain state for:

     * `selectedNotePath`
     * `noteContent`
     * `isDirty` / saving state

2. **Editor + preview split view**

   * When a user clicks a file in the tree:

     * Call `read_note` via Tauri.
     * Store in state and mark as current note.
   * Render a split view with:

     * Left: text editor (a `<textarea>` is sufficient for now).
     * Right: Markdown preview (using `react-markdown` or similar).
   * Add a **Save** button and/or `Ctrl/Cmd+S` handler that calls `write_note` with the updated content.
   * Show a `● Unsaved changes` indicator in the header when `isDirty === true`.

**Deliverable:** You can click a note, edit it, save it, and see a rendered preview beside the editor.

---

## 5. Milestone 3 – Wikilinks & Backlinks

**Goal:** Support `[[wikilinks]]` and show backlinks for the current note.

### 5.1 Link extraction & index

1. **Link parsing utility**

   * Implement a TS function to extract wiki-style links from Markdown:

     ```ts
     function extractWikiLinks(markdown: string): string[] {
       // returns array of link targets like "My Note"
     }
     ```

   * Regex-based extraction is fine for MVP.

2. **Link index structure**

   * Maintain an in-memory index:

     ```ts
     interface LinkIndex {
       out: Map<string, string[]>; // sourcePath -> targetTitles
       in: Map<string, string[]>;  // targetPath -> sourcePaths
     }
     ```

   * After loading or saving a note:

     * Re-run `extractWikiLinks` on its body.
     * Update the `out` map for that note.
     * Rebuild the `in` map from `out` in a simple pass.

3. **Link resolution**

   * Resolve a wikilink target string to a note path by:

     1. Matching an existing note title (H1 or filename without extension).
     2. Falling back to matching filename.

### 5.2 Backlinks UI & navigation

1. **Backlinks panel**

   * For the current note path, look up `linkIndex.in.get(currentPath)`.
   * Display a list of source note titles.
   * Clicking an entry opens that note.

2. **Wikilink navigation**

   * In the preview pane, render `[[Link]]` as clickable.
   * On click, resolve and open the linked note if it exists.

**Deliverable:** Notes can link to each other with `[[wikilinks]]`, and you see backlinks for the current note.

---

## 6. Milestone 4 – Search & Quick Open

**Goal:** Simple global search over note titles and bodies, plus a quick-open palette.

### 6.1 Search index

1. **Index structure**

   * Maintain a simple in-memory index of notes:

     ```ts
     interface SearchIndexEntry {
       path: string;
       title: string;
       body: string;
     }
     ```

   * Populate the index by:

     * Loading notes on demand as they are opened, and/or
     * Scanning files in the background (implementation detail can evolve).

2. **Search function**

   * Implement a naive search:

     ```ts
     function searchNotes(
       query: string,
       index: SearchIndexEntry[]
     ): SearchResult[] {
       // lowercase query, split on spaces
       // return notes where all tokens appear in title or body
     }
     ```

### 6.2 Search UI

1. **Search modal**

   * Add a global hotkey for search (e.g., `Ctrl/Cmd+Shift+F`).
   * Open a modal with a search input.
   * Run search on debounce and render a results list.
   * Arrow keys + Enter to open a note.

### 6.3 Quick-open palette

1. **Quick-open behaviour**

   * Add a global hotkey (e.g., `Ctrl/Cmd+P`).
   * Use the same index (or a simplified variant) to quickly filter notes by title/path.
   * Show a compact list that supports:

     * Fuzzy-ish matching (basic substring is fine for now).
     * Arrow key navigation + Enter to open.

**Deliverable:** You can search across your vault and use a quick-open palette to jump to notes quickly.

---

## 7. Milestone 5 – Graph View & Link Navigation

**Goal:** Visualise the note graph derived from wikilinks/backlinks and use it for navigation.

### 7.1 Graph data model

1. **Derive graph from link index**

   * Reuse the existing `LinkIndex` from Milestone 3.

   * Build a graph representation:

     ```ts
     interface GraphNode {
       id: string;        // note path
       title: string;
       degree: number;    // total number of links in + out
     }

     interface GraphEdge {
       source: string;    // source note path
       target: string;    // target note path
     }
     ```

   * Maintain `nodes: GraphNode[]` and `edges: GraphEdge[]` in state, derived from current vault/link index.

### 7.2 Graph UI

1. **Graph view component**

   * Add a "Graph" view/tab to the UI.
   * Render nodes and edges:

     * Simple force-directed layout or any basic layout library is fine for MVP.
     * Highlight the **current note** node.
   * Interactions:

     * Clicking a node opens that note.
     * Optionally, hovering a node shows its title and basic stats (e.g., links in/out).

2. **Filters & focus (MVP-level)**

   * Provide simple filtering options, such as:

     * Show only neighbours of the current note.
     * Hide isolated nodes (degree 0 or 1).
   * Allow re-centering the graph on the current note.

**Deliverable:** You can open a graph view of your vault, see how notes are connected, and navigate between notes by clicking nodes.

---

## 8. Milestone 6 – Built-in Plugin Host (Frontend Only)

**Goal:** Introduce a minimal plugin host so Liminal Notes can run **built-in plugins** inside the desktop app, reacting to core app events (note open/edit/save) and exposing simple UI surfaces (e.g., a status bar). This lays the groundwork for future plugins such as the Local AI Assistant and Semantic Links without yet loading arbitrary third-party code from disk.

### 8.1 Plugin model (TypeScript)

1. **Core types**

   * Create `apps/desktop/src/plugins/` with a `types.ts` file defining:

     ```ts
     export type PluginId = string;

     export interface PluginMeta {
       id: PluginId;
       name: string;
       description?: string;
       version?: string;
       author?: string;
       enabledByDefault?: boolean;
     }

     export interface NoteSnapshot {
       path: string;
       title: string;
       content: string;
     }

     export interface PluginStatusItem {
       id: string;
       label: string;
       value: string;
       tooltip?: string;
     }

     export interface PluginContext {
       log: (message: string, extra?: unknown) => void;
       getCurrentNote: () => NoteSnapshot | null;
       // future: access to link index, search index, etc.
     }

     export interface LiminalPlugin {
       meta: PluginMeta;

       onActivate?: (ctx: PluginContext) => void;
       onDeactivate?: (ctx: PluginContext) => void;

       onNoteOpened?: (ctx: PluginContext, note: NoteSnapshot) => void;
       onNoteContentChanged?: (ctx: PluginContext, note: NoteSnapshot) => void;
       onNoteSaved?: (ctx: PluginContext, note: NoteSnapshot) => void;

       getStatusItems?: (ctx: PluginContext) => PluginStatusItem[];
     }
     ```

   * This is an **internal, frontend-only plugin shape** for first-party plugins.

2. **Registry of built-in plugins**

   * Add `apps/desktop/src/plugins/registry.ts` exporting `builtInPlugins: LiminalPlugin[]`.
   * Implement at least one plugin: `WordCountPlugin` (shows word/character count for the current note).

### 8.2 Plugin host & status bar

1. **PluginHostProvider**

   * Create `PluginHostProvider` that:

     * Tracks `enabledPlugins: Set<PluginId>`.
     * Maintains the current `NoteSnapshot`.
     * Exposes a `PluginHostContext` with:

       * `enabledPlugins`
       * `setPluginEnabled(pluginId: PluginId, enabled: boolean)`
       * `statusItems: PluginStatusItem[]`
     * On mount: activates all enabled plugins.
     * On unmount: deactivates all enabled plugins.
     * Forwards events:

       * `onNoteOpened` when a note is successfully loaded.
       * `onNoteContentChanged` when the editor content changes.
       * `onNoteSaved` when a save completes successfully.

   * Wrap the main app tree with `PluginHostProvider` so it can:

     * Receive current note data via props/hooks.
     * Provide status items and toggles to the UI.

2. **Status bar component**

   * Add `StatusBar.tsx` that consumes `statusItems` and renders them along the bottom of the window.
   * Style it using theme variables (subtle background, border, compact text).
   * Ensure the Word Count plugin’s items show up here (e.g., `Words: 532 | Characters: 3 124`).

### 8.3 Plugin settings & persistence

1. **Persistence**

   * Store plugin enablement in `localStorage` under `liminal-notes.plugins` as a map:

     * `PluginId -> boolean`.
   * On startup:

     * Load the map.
     * For any built-in plugin not present, default to `meta.enabledByDefault ?? true`.
   * When toggling a plugin, update state and persist the map.

2. **Plugins UI**

   * Add a simple “Plugins” section (e.g., in Settings or a modal) that:

     * Lists built-in plugins (from `builtInPlugins`).
     * Shows name and description.
     * Provides a toggle/checkbox for **Enabled**.
   * Toggling updates `enabledPlugins` and calls `onActivate`/`onDeactivate` as appropriate.

### 8.4 Scope vs future plugin system

* This milestone is **frontend-only**:

  * No Rust-side JS runtime.
  * No plugin manifests on disk.
  * No third-party plugin loading.
* It mirrors concepts from `docs/PLUGIN_API.md` (activation, note events, status items) but does **not** replace the public plugin API.
* Later milestones can introduce:

  * Manifest-based plugin discovery (`plugins/` folders + `manifest.json`).
  * A Rust-backed JS runtime for backend plugins.
  * The full `App` / `UiApp` / `PluginContext` API described in `PLUGIN_API.md`.

**Deliverable:** A small, internal plugin host powering at least one built-in plugin (Word Count), with a status bar and a simple Plugins UI to enable/disable it.

---

## 9. Milestone 7 – AI Assistant Plugin Scaffold

**Goal:** Create the folders and stub code for the AI assistant plugin, wired into the built-in plugin host and ready for transformers.js integration.

### 9.1 Plugin skeleton

* Create `plugins/core.ai-assistant/` (or an equivalent built-in plugin module) with:

  * A metadata object compatible with the plugin host.
  * A backend-facing stub (for future Rust/JS work).
  * A frontend UI stub (React component for the AI sidebar).

### 9.2 Backend stub

* Register commands such as:

  * `ai.summariseCurrentNote`
  * `ai.suggestTags`
  * `ai.classifyNoteType`
  * `ai.findRelatedNotes`
* For now, commands can simply log a message or show a placeholder.

### 9.3 Frontend stub

* Add an AI sidebar view with:

  * Basic layout and buttons for the above commands.
  * Integration with the plugin host so it appears as a plugin-provided UI surface.

### 9.4 transformers.js integration hook

* Install `@xenova/transformers` (or similar) into the project.
* Add a placeholder helper that imports `pipeline` and logs where models will be loaded.

**Deliverable:** A visible "AI Assistant" plugin with buttons that don’t do real AI yet, but demonstrate the flow and are ready for implementation.

---

## 10. Milestone 8 – Polish & Packaging

**Goal:** Turn Liminal Notes from a dev-only app into a shippable desktop application for Linux, Windows, and macOS, with basic polish so you can comfortably use it day-to-day.

### 10.1 Polish

Focus on small, high-impact improvements without changing core architecture:

* **Empty states:**

  * Friendly messages when there is no vault, no notes, or no search results.
* **Error handling:**

  * Clear error toasts/messages for failed vault loads, read/write errors, and search/graph failures.
* **Keyboard shortcuts:**

  * Ensure core actions (new note when available, save, search, quick-open, theme toggle) have consistent shortcuts and are documented.
* **Layout tweaks:**

  * Ensure the app behaves reasonably on small and large windows (sidebars collapsible where appropriate, scrollbars usable, etc.).
* **Performance passes:**

  * Avoid unnecessary re-renders in large vaults (memoise heavy components where it’s easy and obvious).

### 10.2 Packaging & distribution

Set up packaging using Tauri’s bundling system so you can produce installable apps:

* **Tauri configuration:**

  * Ensure `tauri.conf.json` (or `tauri.conf.toml` for v2) has appropriate:

    * App name, identifier, version.
    * Icons for all three platforms.
  * Configure release builds for:

    * Linux: `.AppImage` or `.deb`/`.rpm` as appropriate.
    * Windows: `.msi` or `.exe` installer.
    * macOS: `.app` bundle (and optionally `.dmg`).

* **Build scripts:**

  * Add `pnpm` scripts in the root `package.json` for:

    * `pnpm tauri build` (existing) as the canonical release build.
    * Optional convenience scripts like `pnpm build:desktop` that call Tauri build for `@liminal-notes/desktop`.

* **Signing (optional / future):**

  * Document what would be needed for code signing on macOS and Windows, but treat it as optional until you’re ready to register certificates.

### 10.3 Docs & “how to run it”

* Update `README.md` to include a **“Running & Installing”** section:

  * How to run in dev: `pnpm install` + `pnpm tauri dev`.
  * How to build a release: `pnpm tauri build`.
  * Where to find the built artefacts (e.g., `apps/desktop/src-tauri/target/release/bundle/...`).
* Optionally add a short **“Releases”** section explaining:

  * That prebuilt binaries/installers may be attached to GitHub Releases.
  * That the app is local-first and stores data in your chosen vault folder.

**Deliverable:** You can:

* Use Liminal Notes comfortably for real notes.
* Run a single build command to produce installable binaries for your platform.
* Hand those binaries to someone else and have them run the app without a dev environment.

---

## 11. Hand-off to an AI Coding Agent (Jules)

When this build plan is ready to execute (or extend), you can:

1. Give Jules the repo with:

   * `docs/ARCHITECTURE.md`
   * `docs/MVP_APP.md`
   * `docs/PLUGIN_API.md`
   * `docs/plugins/LOCAL_AI_ASSISTANT_PLUGIN.md`
   * `docs/plugins/SEMANTIC_LINKS_PLUGIN.md`
   * `docs/BUILD_PLAN.md` (this file)

2. Ask Jules to implement or refine milestones incrementally:

   * Milestone 0 → 5 (core app, theming, graph view).
   * Milestone 6 (built-in plugin host).
   * Milestone 7 (AI assistant scaffold).
   * Milestone 8 (polish & packaging).

This keeps the scope sane while still aiming directly at the experience you want: notes on desktop (and eventually mobile/web), Obsidian-adjacent linking and graph, plus an AI helper layered on top of a clean, extensible architecture.
