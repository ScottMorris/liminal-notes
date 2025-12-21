# Spec ↔ Implementation Audit Report (2025-12-21)

## 1. Executive Summary

**Overall State:** **Partially Aligned / Drifting**.
The application successfully implements the "MVP Slice" described in `MVP_APP.md` (Vaults, File Tree, Editor, Wikilinks, Basic Search). However, the implementation details often diverge from the architectural vision in `ARCHITECTURE.md` and `PLUGIN_API.md`, particularly regarding the Plugin System and Search/Indexing architecture. The current "Plugin Host" is a lightweight React-internal system, not the robust sandboxed environment specified.

**Top 5 Gaps (Highest Impact):**
1.  **Plugin System Sandbox**: `PLUGIN_API.md` describes a sandboxed JS runtime (backend) + WebView (frontend) split. Implementation is a unified React Context-based system for internal plugins only.
2.  **Search/Index Performance**: `MVP_APP.md` allows in-memory indexing, but the current implementation (`SearchIndexContext`) reads *every file's full content* on startup. This is a severe performance bottleneck for mobile or large vaults.
3.  **Mobile-Ready Core**: The Rust backend (`vault.rs`) is tightly coupled to `tauri::AppHandle` and `std::fs`, requiring refactoring to support a React Native target.
4.  **Rich Text/Source Toggle**: `MVP_APP.md` specifies "Source Mode" and "Reading View". The implementation provides a "Live Preview" style experience (CodeMirror with decorations) but lacks a distinct read-only "Reading View" mode toggle in the UI (only "Preview" via generic Markdown rendering which is present but secondary).
5.  **Graph View**: `SPEC.md` and `ARCHITECTURE.md` describe a sophisticated Graph Engine. The implementation provides a basic `GraphView.tsx` but lacks the deep "Graph Service" logic (e.g., local graph filters, efficient querying).

**Top 5 Divergences (Spec vs Reality):**
1.  **Plugin Host Architecture**: The "Plugin Host" exists (`PluginHostProvider.tsx`) but ignores the `manifest.json`, `main.js`/`ui.js` split, and permission model defined in `PLUGIN_API.md`.
2.  **Settings Storage**: `SPEC.md` mentions per-vault settings. Implementation persists global settings via `tauri-plugin-store` (implied by `settings.rs` and `ipc.ts`) and plugin settings in `localStorage` (`PluginHostProvider.tsx`), not `vault.config.json` or `.liminal/` files.
3.  **Search Indexing**: `ARCHITECTURE.md` describes a background worker listening to file events. Reality is a foreground `Promise.all` read of all files on load.
4.  **Link Indexing**: `ARCHITECTURE.md` places the Link Index in the Rust Core. Reality places it in a React Context (`LinkIndexContext`), requiring full re-parse on frontend load.
5.  **Editor Engine**: `MVP_APP.md` suggests "textarea or simple code editor". Implementation uses a sophisticated **CodeMirror 6** setup with custom extensions, which is "better" but creates a huge dependency for the mobile strategy (CodeMirror won't run in React Native).

**Top 5 Undocumented Implementations:**
1.  **Internal Plugin System**: The `PluginHostProvider` and `registry.ts` system is effectively a "Core Plugin" architecture not described in docs (which describe the *public* API).
2.  **AI Worker**: `ai.worker.ts` and `aiController.ts` implement a complex off-main-thread AI system using `transformers.js` that isn't fully detailed in `LOCAL_AI_ASSISTANT_PLUGIN.md`.
3.  **Spellcheck Architecture**: `spellcheckCore.ts` and its worker implementation details (loading `.aff`/`.dic` files) are implemented but the specific protocol is only lightly touched on in `SPELLCHECK.md`.
4.  **Title Bar / Window Controls**: Custom window frame handling (`TitleBar.tsx`) and Linux accent color syncing (`lib.rs`) are implemented but not specified.
5.  **Notifications/Reminders Integration**: The specific "Platform Adapter" pattern for Reminders (`packages/reminders-core`) is implemented and matches its specific doc, but `MVP_APP.md` doesn't explicitly account for this shared package structure.

---

## 2. Spec Inventory

| Spec Doc | Intended Scope | Key Promised Features | Conflicts |
| :--- | :--- | :--- | :--- |
| `SPEC.md` | Product Vision & Domain Model | Vault, Note, Link, Graph, Properties, "Local First" | Mobile mentioned as "Future". |
| `MVP_APP.md` | Milestone 0.1 Definition | Single Vault, File Tree, Simple Editor, Wikilinks, In-memory Search | "Plugin Host" listed as Out of Scope (but implemented). |
| `ARCHITECTURE.md` | System Design | Rust Core (Vault, Index, Graph), Plugin Host, React Frontend | Describes Rust-based Index/Graph (reality is JS-based). |
| `PLUGIN_API.md` | Extension System | Sandboxed Backend + UI Plugins, Manifests, Permissions | Completely divergent from current `PluginHostProvider`. |
| `docs/plugins/*.md` | Specific Features | AI Assistant, Semantic Links | `LOCAL_AI_ASSISTANT_PLUGIN.md` aligns mostly with `features/ai/`. |
| `docs/REMINDERS_NOTIFICATIONS.md` | Feature Spec | Shared Core + Adapters, Time/Location Triggers | Matches `packages/reminders-core` well. |
| `docs/SETTINGS_UI.md` | UI Spec | Modal Layout, Schema-based rendering, MVP controls | Matches `SettingsModal` intent. |

---

## 3. Implementation Inventory

### Desktop UI (`apps/desktop/src`)
*   **Main Structure**: `App.tsx` handling Layout, `TitleBar`, `StatusBar`.
*   **Views**: `VaultPicker`, `FileTree`, `GraphView`.
*   **Editor**: `CodeMirrorEditor` (CM6) + Extensions (`wikiLinkParser`, `frontmatterHider`).
*   **Settings**: `SettingsModal`, `SettingsContext`.
*   **Contexts**: `LinkIndexContext` (Links), `SearchIndexContext` (Search), `TabsContext` (Navigation).
*   **Features**: `features/ai` (Sidebar, Worker), `features/spellcheck` (Worker), `features/reminders`.
*   **Plugins**: `plugins/PluginHostProvider` (Internal system).

### Backend / Tauri (`apps/desktop/src-tauri`)
*   **Commands**: `vault.rs` (CRUD, Listing), `settings.rs`, `lib.rs` (Linux tweaks).
*   **Storage**: `vault.json` (App Config Dir) for Vault List.
*   **Security**: `resolve_safe_path` ensures confinement to vault root.

### Shared Packages (`packages/`)
*   `reminders-core`: Types, Planner, Migration logic (Pure TS).

### Plugins (`apps/desktop/src/plugins/builtin`)
*   `aiAssistantPlugin.ts`: Integration of AI feature into Plugin Host.
*   `wordCountPlugin.ts`: Simple status bar item.

---

## 4. Crosswalk: Spec Items ↔ Implementation

### 4.1. Vault Management
| Requirement | Status | Evidence | Notes | Mobile Impact | Suggested Update |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Select Vault** (Folder Picker) | Implemented | `VaultPicker.tsx`, `vault.rs::get_vault_config` | Uses Tauri Dialog. | **Desktop Dependency**: Tauri Dialogs don't exist in React Native. | Update `ARCHITECTURE.md` to define an abstract `VaultPickerService` interface. |
| **Persist Vault Choice** | Implemented | `vault.rs::set_vault_config` | Stored in `AppConfig/vault.json`. | **Parity Gap**: Mobile needs its own storage (AsyncStorage/MMKV) for config. | Document platform-specific config storage in `ARCHITECTURE.md`. |
| **Path Safety** (No `..` traversal) | Implemented | `vault.rs::resolve_safe_path` | Explicit check for `Component::Normal`. | **Shared-core Candidate**: Logic is generic and crucial for security. | Move `resolve_safe_path` logic to a shared Rust crate (`vault-core`). |

### 4.2. File System & Navigation
| Requirement | Status | Evidence | Notes | Mobile Impact | Suggested Update |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **List Files** (Recursive) | Implemented | `vault.rs::list_markdown_files` | Uses `walkdir`, filters hidden. | **Shared-core Candidate**: File listing logic should be shared. | Move listing logic to `vault-core` crate. |
| **File Tree UI** | Implemented | `FileTree.tsx` | Renders recursive tree. | **Blocks Mobile MVP**: DOM-based tree (<ul>/<li>) not usable in RN. | None (UI is expected to differ). |

### 4.3. Editor & Preview
| Requirement | Status | Evidence | Notes | Mobile Impact | Suggested Update |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Markdown Editing** | Divergent | `CodeMirrorEditor.tsx` | `MVP_APP.md` allowed textarea; implementation is full CM6. | **Blocks Mobile MVP**: CodeMirror does not work in React Native. Requires WebView or replacement. | Update `MVP_APP.md` to explicitly acknowledge CodeMirror dependency or specify WebView for mobile editor. |
| **Wikilink Syntax** | Implemented | `wikiLinkParser.ts`, `decorations.ts` | Custom regex parser. | **Shared-core Candidate**: Regex logic is JS, reusable if extracted. | Extract parsing logic to `packages/markdown-utils` (if created). |
| **Read/Write Pipeline** | Implemented | `ipc.ts` -> `vault.rs` | Direct IPC calls. | **Desktop Dependency**: `ipc.ts` imports `@tauri-apps/api`. | Abstract data access behind a `VaultRepository` interface. |

### 4.4. Search & Indexing
| Requirement | Status | Evidence | Notes | Mobile Impact | Suggested Update |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **In-Memory Search** | Implemented | `SearchIndexContext.tsx` | Simple loop over `Map`. | **Parity Gap**: Valid for MVP, but performance trap. | - |
| **Index Construction** | Divergent | `SearchIndexContext.tsx` | Reads *all* files on load (`readNote`). | **Blocks Mobile MVP**: Reading all files on startup is non-viable for mobile performance. | Update `ARCHITECTURE.md` to mandate persistent index (e.g. SQLite) for Mobile/Future. |
| **Scoring** | Implemented | `SearchIndexContext.tsx` | Title (+2), Content (+1). | **Unclear**: Naive implementation. | - |

### 4.5. Plugin System
| Requirement | Status | Evidence | Notes | Mobile Impact | Suggested Update |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Manifest.json** | Missing | `apps/desktop/src/plugins/` | Plugins are TS objects in `registry.ts`. | **Desktop-only by design** (current impl). | Update `PLUGIN_API.md` to distinguish "Core/Internal Plugins" from "Public Plugins". |
| **Sandboxed Runtime** | Missing | `PluginHostProvider.tsx` | Plugins run in main thread context. | **Unclear**: Mobile might not support dynamic plugin loading easily (Store policies). | Flag Plugin System as "Desktop First" in specs. |
| **Permissions** | Missing | `PluginHostProvider.tsx` | No permission checks implemented. | - | - |

---

## 5. Gaps (Specified but Not Implemented)

1.  **Sandboxed Plugin Host** (`PLUGIN_API.md`)
    *   **Missing**: The `manifest.json` parsing, `main.js` execution in a separate VM/Worker, and Permission boundaries.
    *   **Mobile Impact**: **Desktop-only by design** (mostly). Mobile stores restrict dynamic code execution. Mobile plugins likely need to be "bundled" or strictly limited.
    *   **Suggested Spec Update**: Add a section to `PLUGIN_API.md` regarding "Mobile Constraints" (no dynamic code loading on iOS).

2.  **Persistent Search Index** (`ARCHITECTURE.md`)
    *   **Missing**: The Architecture doc describes a `FileWatcher` feeding a background `Indexer`. Reality is a "read everything on boot" approach.
    *   **Mobile Impact**: **Blocks Mobile MVP** (Performance). Mobile cannot afford to read thousands of files on launch.
    *   **Suggested Spec Update**: Explicitly require a persistent index format (e.g., `index.db` or `search.json`) in `MVP_APP.md` or `ARCHITECTURE.md` to enable mobile parity.

3.  **Reading View** (`MVP_APP.md`)
    *   **Missing**: A dedicated "Reading Mode" that renders pure HTML (using `react-markdown` or similar) replacing the editor. Current "Preview" exists but `MVP_APP.md` implies a mode switch (Source vs Reading).
    *   **Mobile Impact**: **Parity Gap**. Mobile users often consume content more than edit.
    *   **Suggested Spec Update**: Clarify if "Live Preview" (CodeMirror) replaces the need for a separate "Reading View".

---

## 6. Divergences (Implemented Differently)

1.  **Plugin System Implementation**
    *   **Spec**: `PLUGIN_API.md` describes a public-facing, sandboxed API.
    *   **Code**: `PluginHostProvider.tsx` implements an *internal* plugin system used for "Built-in" features (AI, Word Count).
    *   **Why it matters**: The internal API does not match the public spec. If we open this to developers, we need to rewrite it.
    *   **Mobile Impact**: **Unclear**. If internal plugins are just React components, they might be reusable in RN if they don't use DOM.
    *   **Suggested Spec Update**: Rename `PLUGIN_API.md` to `PUBLIC_PLUGIN_API.md` and document the existence of an "Internal Plugin Architecture" for core features.

2.  **Indexing Location**
    *   **Spec**: `ARCHITECTURE.md` says "Core Engine (Rust): Indexing/search".
    *   **Code**: Indexing is entirely Frontend (React Context).
    *   **Why it matters**: Rust would be faster and shareable. React is desktop-coupled.
    *   **Mobile Impact**: **Shared-core Candidate**. Moving indexing to Rust (or shared TS core) is essential for React Native reuse.
    *   **Suggested Spec Update**: Update `ARCHITECTURE.md` to reflect that MVP Indexing is Frontend-based, with Rust migration as a "Future" goal.

3.  **Settings Storage**
    *   **Spec**: `SPEC.md` implies vault-scoped settings. `SETTINGS_UI.md` mentions `settings.json` in app config.
    *   **Code**: `settings.rs` uses `tauri-plugin-store` (or similar simple JSON) for global settings. Vault-specific settings are not clearly implemented beyond `vault.config.json` (which only holds name/path).
    *   **Why it matters**: Users expect per-vault themes/plugins (per Spec).
    *   **Mobile Impact**: **Parity Gap**.
    *   **Suggested Spec Update**: Clarify "Global vs Vault" settings hierarchy in `SETTINGS_UI.md`.

---

## 7. Undocumented Implementations

1.  **AI Worker Architecture**: The `apps/desktop/src/features/ai/ai.worker.ts` is a sophisticated piece of engineering not fully captured in `LOCAL_AI_ASSISTANT_PLUGIN.md`. It handles model loading and inference off-thread.
    *   *Suggestion*: Add `docs/AI_ARCHITECTURE.md` or expand the plugin doc.
2.  **Spellcheck Worker**: `apps/desktop/src/features/spellcheck/` implements an offline spellchecker using `nspell`.
    *   *Suggestion*: Update `docs/SPELLCHECK.md` with implementation details (worker-based).
3.  **Command Registry**: `apps/desktop/src/commands/CommandRegistry.ts` is the central nervous system for actions, effectively a "Command Bus". It is critical infrastructure but not explicitly documented as a spec.
    *   *Suggestion*: Create `docs/COMMAND_SYSTEM.md`.

---

## 8. Spec Conflicts / Ambiguities

*   **Plugin API**: `PLUGIN_API.md` (Public) vs `PluginHostProvider.tsx` (Internal). There is no document describing the *internal* plugin API which is what is actually running.
*   **Graph View**: `SPEC.md` promises Global and Local graph. `MVP_APP.md` says "Graph visualiser" is Out of Scope. Implementation *exists* (`GraphView.tsx`) but is likely MVP-level.
    *   *Resolution*: Mark Graph as "Experimental/Bonus" in `MVP_APP.md`.

---

## 9. Mobile Parity Notes

*   **Filesystem Access**: The biggest blocker. `vault.rs` assumes it can walk a directory. React Native requires `react-native-fs` or similar, and on iOS, "picking a folder" permissions are complex (Security Scoped Bookmarks).
    *   *Recommendation*: Create a `packages/filesystem-abstraction` that wraps these differences.
*   **Editor**: `CodeMirror` is web-only. React Native will need a completely different editor component (e.g., `react-native-markdown-display` for view, plain `TextInput` for edit, or a WebView wrapping CodeMirror).
    *   *Recommendation*: If parity is key, **Tauri Mobile** might be a better target than **React Native** to reuse the CodeMirror investment. If React Native is strict, plan for a "Split Editor" strategy.
*   **Performance**: The "Read all files on load" strategy for Search/Links must go. Mobile requires lazy loading + persistent index (SQLite).

---

## 10. Recommended Updates

1.  **Update `MVP_APP.md`**:
    *   Add "Graph View" to "Stretch Goals" (since it exists).
    *   Explicitly note that "Indexing" is Frontend-side for MVP.
2.  **Update `ARCHITECTURE.md`**:
    *   Add a section "Mobile Strategy" explicitly mentioning the React Native target and the need for Shared Core abstraction (Data Layer vs UI Layer).
    *   Mark `vault.rs` and `SearchIndexContext` as "Technical Debt" to be refactored into a Shared Core.
3.  **Refine `PLUGIN_API.md`**:
    *   Add a disclaimer: "This is the *target* API for future public plugins. Internal core plugins currently use a simplified React-based host."
4.  **Create `docs/MOBILE_GAP_ANALYSIS.md`**:
    *   Formalize the findings about CodeMirror, FileSystem, and Indexing performance to guide the mobile team.
