# BUILD_PLAN.md – Liminal Notes

## 0. Project Identity

### 0.1 Name

**Project name:** `Liminal Notes`

**Rationale:**

- "Liminal" evokes the in-between space where ideas move from messy to structured.
- Fits a PKM tool that lives between raw text, graphs, and AI augmentation.

Feel free to rename later, but this gives the repo and artefacts a concrete identity.

### 0.2 Repo Description

**Short GitHub description:**

> A local-first, Markdown-based note-taking app with Obsidian-style linking, built with Tauri + React. Designed to be extensible and AI-ready using a plugin system and transformers.js.

**Longer README blurb:**

> Liminal Notes is a local-first, Markdown-only note-taking app inspired by tools like Obsidian. It runs on Linux, Windows, and macOS using Tauri and React, stores your notes as plain `.md` files, and lets you link them together with `[[wikilinks]]`. The first versions focus on fast editing, backlinks, and simple search, with a plugin system and local AI assistant (via transformers.js) planned as first-class features.

---

## 1. Overall Milestones

1. **Milestone 0 – Skeleton & Repo Setup**
2. **Milestone 1 – Vault Selection & File Tree**
3. **Milestone 2 – Editor & Preview**
4. **Milestone 3 – Wikilinks & Backlinks**
5. **Milestone 4 – Search**
6. **Milestone 5 – Polish & Packaging**
7. **Milestone 6 – Plugin Host (Minimal)**
8. **Milestone 7 – AI Assistant Plugin (Scaffold)**

The goal is to ship something usable by Milestone 4–5, then layer in plugins and AI.

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
    ui/            # shared UI components (optional, can be added later)
    plugin-api/    # TS types for plugin authors (stub for now)
  .gitignore
  package.json
  pnpm-workspace.yaml (or yarn workspaces)
  README.md
```

### 2.2 Tasks

1. **Initial repo creation**

   - Create Git repo `liminal-notes`.
   - Add `README.md` with project name + short description.

2. **Monorepo tooling**

   - Add `package.json` at root with workspace config.
   - Choose a package manager: `pnpm` recommended.
   - Add `pnpm-workspace.yaml` listing `apps/*` and `packages/*`.

3. **Tauri + React app scaffold**

   - Use `create-tauri-app` (or equivalent) to generate `apps/desktop` with:

     - Frontend: React + TypeScript.
     - Backend: Rust.

   - Confirm `pnpm install` and `pnpm tauri dev` (or equivalent) runs on your machine.

4. **Basic cleanup**

   - Remove template boilerplate (counters, logos, etc.).
   - Replace with a simple `Liminal Notes` splash screen.

Deliverable: A blank desktop app window titled “Liminal Notes” that builds and runs.

---

## 3. Milestone 1 – Vault Selection & File Tree

**Goal:** User can select a folder as a vault and see `.md` files in a sidebar.

### 3.1 Backend (Rust / Tauri commands)

Tasks:

1. **Vault config storage**

   - Define a `VaultConfig` struct stored in app config (not in the vault yet):

     ```rust
     struct VaultConfig {
         root_path: String,
         name: String,
     }
     ```

   - Implement Tauri commands:

     - `get_vault_config() -> Option<VaultConfig>`
     - `set_vault_config(root_path: String, name: String) -> Result<(), Error>`

2. **File listing**

   - Implement `list_markdown_files() -> Result<Vec<FileEntry>, Error>` where:

     ```rust
     struct FileEntry {
         path: String;    // relative to root
         is_dir: bool;
     }
     ```

   - Filter to only `.md` files and directories.

### 3.2 Frontend (React)

Tasks:

1. **Vault picker UI**

   - On startup, call `get_vault_config`.
   - If no config, show a “Select Vault Folder” view with a button.
   - Use Tauri’s dialog API to select a directory.
   - Call `set_vault_config` and then continue to main app.

2. **File tree component**

   - Call `list_markdown_files` after vault is set.
   - Build an in-memory tree from `FileEntry` list.
   - Render as a collapsible file tree in a left sidebar.
   - Click on a file should emit `openNote(path)` event to main pane.

Deliverable: You can pick a folder and see your Markdown files in the sidebar.

---

## 4. Milestone 2 – Editor & Preview

**Goal:** Open, edit, and save notes in Markdown with a simple preview mode.

### 4.1 Backend

Tasks:

1. **Note read/write commands**

   - Implement:

     - `read_note(path: String) -> Result<NotePayload, Error>`
     - `write_note(path: String, body: String) -> Result<(), Error>`

   - `NotePayload`:

     ```rust
     struct NotePayload {
         path: String,
         body: String,
     }
     ```

### 4.2 Frontend

Tasks:

1. **Note state model**

   - Define TS interfaces:

     ```ts
     interface Note {
       id: string; // maybe same as path for now
       path: string;
       title: string;
       body: string;
     }
     ```

   - Create a simple notes cache in app state (Map of path → Note).

2. **Editor view**

   - When a user clicks a file in the tree:

     - Call `read_note` via Tauri.
     - Store in state and mark as current note.

   - Render a split view with:

     - Left: text editor (start with `<textarea>` or basic code editor component).
     - Right: Markdown rendered preview (use a library like `marked` or `react-markdown`).

   - Add a `Ctrl/Cmd+S` handler that:

     - calls `write_note` with updated `body`.

Deliverable: You can click a note, edit it, save it, and see a rendered preview.

---

## 5. Milestone 3 – Wikilinks & Backlinks

**Goal:** Support `[[wikilinks]]` and show backlinks for the current note.

### 5.1 Frontend – Link Extraction & Index

Tasks:

1. **Link parsing utility**

   - Implement a function in TS to extract wiki-style links from Markdown:

     ```ts
     function extractWikiLinks(markdown: string): string[] {
       // returns array of link targets like "My Note"
     }
     ```

   - Regex-based extraction is fine for MVP.

2. **Link index structure**

   - In state, maintain:

     ```ts
     interface LinkIndex {
       out: Map<string, string[]>; // sourcePath -> targetTitles
       in: Map<string, string[]>; // targetPath -> sourcePaths
     }
     ```

   - After loading or saving a note:

     - re-run `extractWikiLinks` on its `body`.
     - update the `out` map.
     - rebuild `in` map from `out` (simple pass over entries).

3. **Link resolution**

   - For MVP, resolve a wikilink target string to a note path by:

     1. trying to match an existing note title (H1 or filename without extension);
     2. fallback to matching filename.

### 5.2 Backlinks UI

Tasks:

1. **Backlinks panel component**

   - For the current note path, look up `linkIndex.in.get(currentPath)`.
   - Display a list of source note titles.
   - Clicking an entry opens that note.

2. **Wikilink navigation**

   - In the preview pane, render `[[Link]]` as clickable.
   - On click, resolve and open the linked note if it exists.

Deliverable: Notes can link to each other with `[[wikilinks]]`, and you see backlinks for the current note.

---

## 6. Milestone 4 – Search

**Goal:** Simple global search over note titles and bodies.

### 6.1 Frontend – Search Index

Tasks:

1. **Index structure**

   - At app load (or after first vault scan):

     - fetch all note bodies (or lazily load as you go, then expand later).

   - Build a simple in-memory index:

     ```ts
     interface SearchIndexEntry {
       path: string;
       title: string;
       body: string;
     }
     ```

   - Store in `searchIndex: SearchIndexEntry[]`.

2. **Search function**

   - Implement a naive search:

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

Tasks:

1. **Search modal**

   - Add a global hotkey (e.g., `Ctrl/Cmd+P` or `Ctrl/Cmd+Shift+F`).
   - Open a modal with a search input.
   - Run search on debounce and render results list.
   - Arrow keys + Enter to open a note.

Deliverable: You can fuzzy-ish search across your vault and jump to notes quickly.

---

## 7. Milestone 5 – Polish & Packaging

**Goal:** Make the MVP nice enough to use daily.

### Tasks

1. **Theming**

   - Light and dark themes, toggle in settings.

2. **Command palette** (optional but nice)

   - Show list of core commands: open search, new note, change vault, etc.

3. **Settings view**

   - Change active vault.
   - Basic editor preferences (font size, wrap, etc.).

4. **Packaging**

   - Configure Tauri build for Linux, Windows, macOS.
   - Test signed builds where relevant.

Deliverable: A small but solid Markdown PKM app.

---

## 8. Milestone 6 – Minimal Plugin Host

**Goal:** Add just enough plugin infrastructure to support the future AI plugin.

### Tasks

1. **Plugin manifest loading**

   - Define a `plugins/` folder in the app config dir or vault.
   - Load `manifest.json` files and show them in a Plugin Manager UI.

2. **Backend plugin execution (minimal)**

   - Embed a JS runtime (e.g., QuickJS or Deno-based) in Rust.
   - Support `activate(app, ctx)` / `deactivate()` lifecycle.
   - Expose a tiny subset of `App` API: `notes`, `commands`.

3. **Frontend plugin execution (minimal)**

   - Allow UI plugins to register commands and a sidebar view.

Deliverable: A simple plugin system that can load a core plugin without crashing the app.

---

## 9. Milestone 7 – AI Assistant Plugin Scaffold

**Goal:** Create the folders, manifest, and stub code for the AI assistant plugin, ready for an AI coding agent (Jules) to implement.

### Tasks

1. **Plugin skeleton**

   - Create `plugins/core.ai-assistant/` with:

     - `manifest.json` (as in AI_PLUGIN_DESIGN)
     - `main.js` (backend stub)
     - `ui.js` (frontend stub)

2. **Backend stub**

   - Implement empty `activate(app, ctx)` / `deactivate()`.
   - Register basic commands:

     - `ai.summariseCurrentNote`
     - `ai.suggestTags`
     - `ai.classifyNoteType`
     - `ai.findRelatedNotes`

   - For now, commands can just log a message.

3. **Frontend stub**

   - Register an AI sidebar view with placeholder buttons.
   - Wire buttons to call the stub commands.

4. **transformers.js integration hook**

   - Install `@xenova/transformers` (or similar) into the project.
   - In `ui.js`, add a placeholder helper that imports `pipeline` and logs that models will be loaded here.

Deliverable: A visible "AI Assistant" plugin with buttons that don’t do real AI yet, but demonstrate the flow and are ready for implementation.

---

## 10. Hand-off to an AI Coding Agent (Jules)

When this build plan is ready to execute, you can:

1. Give Jules the repo with:

   - `docs/ARCHITECTURE.md`
   - `docs/MVP_APP.md`
   - `docs/PLUGIN_API.md`
   - `docs/plugins/LOCAL_AI_ASSISTANT_PLUGIN.md`
   - `docs/plugins/SEMANTIC_LINKS_PLUGIN.md`
   - `docs/BUILD_PLAN.md` (this file)

2. Ask Jules to implement Milestone 0 → 4 incrementally:

   - Start with Tauri scaffold.
   - Implement vault picker + file tree.
   - Add editor/preview.
   - Add wikilinks/backlinks.
   - Add search.

3. Later, instruct Jules to:

   - Implement the minimal plugin host (Milestone 6).
   - Flesh out the AI Assistant plugin using the transformers.js design (Milestone 7).

This keeps the scope sane while still aiming directly at the experience you want: **notes on desktop and phone**, AI helper later, and a clean architecture that doesn’t box you in.
