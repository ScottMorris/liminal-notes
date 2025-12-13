# MVP_APP.md – Liminal Notes

## 1. MVP Goal

Build the **smallest usable slice** of the app that lets a real user:

> Take notes on their desktop in Markdown, link them together, and browse/edit them comfortably — with a clear path to mobile access via a shared vault folder.

No plugins, no canvas, no bases, no sync UI, no graph visualiser required for the _first_ shippable version.

Focus: **fast local editing + basic linking + simple search**.

---

## 2. User Stories (MVP 0.1)

1. **Create, Edit & Rename Notes**

   - As a user, I can create a new note in my vault and edit it in a Markdown editor.
   - As a user, I can rename an existing note or folder.
   - As a user, I can see my note rendered in a basic reading view.

2. **Browse Notes via File Tree**

   - As a user, I can see a file tree of my vault and open notes by clicking on them.

3. **Link Notes with Wikilinks**

   - As a user, I can insert `[[Other Note]]` in a note and the app will:

     - auto-complete existing notes as I type
     - treat that as a link between notes.

4. **Backlinks Panel**

   - As a user, when I open a note, I can see a list of other notes that link to it.

5. **Simple Search**

   - As a user, I can hit a search shortcut, type a query, and see a list of matching notes by title/body.

6. **Single Vault Configuration**

   - As a user, I can pick a folder on disk as my vault and the app remembers it.

Stretch (nice-to-have for 0.1, but not mandatory):

- Light/dark theme toggle.
- Command palette for core commands (open file, search, create note).

---

## 3. Scope vs Non-Scope (MVP 0.1)

### In Scope

- Desktop app (Linux/Windows/macOS) via **Tauri**.
- Single active vault.
- File tree sidebar.
- Markdown editor with:

  - Source mode
  - Basic reading view (rendered Markdown)

- Wikilinks + backlinks (computed in memory).
- Simple global search (title + body, no fancy filters).

### Explicitly Out of Scope (Later Phases)

- Multi-vault management UI (more than “pick a folder”).
- Sync service and UI.
- Canvas / whiteboard.
- Bases / database views.
- Plugin host.
- Graph visualiser.
- AI features (transformers.js) — except for **design hooks**, see below.

---

## 4. Tech Stack (MVP)

- **Shell:** Tauri
- **Backend/Core (minimal):** Rust

  - Vault discovery & config
  - Filesystem operations (read/write Markdown files)
  - Basic Markdown parsing for links

- **Frontend:** React + TypeScript (single-page app inside Tauri)

We do **not** implement the full core engine yet. Only what’s needed for:

- opening a vault
- listing files
- reading/writing notes
- extracting wikilinks
- computing backlinks
- simple search.

---

## 5. Data Model (MVP Subset)

### 5.1 Vault

- `vault.config.json` in the vault root (or in app config) storing:

  - `vaultId`
  - `name`
  - `rootPath`

MVP: support **one active vault** selected via `rootPath`.

### 5.2 Notes

- Files with `.md` extension.
- Optional YAML frontmatter, but MVP does **not** need to interpret properties.

In-memory type (frontend):

```ts
interface Note {
  id: string; // derived from path
  path: string; // relative to vault root
  title: string; // H1 or filename
  body: string; // full Markdown content
}
```

### 5.3 Links & Backlinks

Link extraction (MVP):

- Only support `[[Note Title]]` style for internal links.
- Resolve link target by:

  1. Exact match on note title, else
  2. Fallback to filename match.

In-memory index:

```ts
interface LinkIndex {
  out: Map<string /*sourceNoteId*/, string[] /*targetNoteIds*/>;
  in: Map<string /*targetNoteId*/, string[] /*sourceNoteIds*/>;
}
```

Rebuild on:

- startup
- file save
- vault rescan (manual command in MVP).

### 5.4 Search Index (MVP)

Keep it extremely simple:

- Build an in-memory index on startup:

  - `Note.id`
  - `title`
  - `body` (full-text, naive)

- Search implementation:

  - Lowercase query.
  - Tokenise by spaces.
  - Filter notes where all tokens appear in `title` or `body`.

No need for fancy scoring yet; just return matches in a sane order (e.g., title matches first).

---

## 6. Architecture Slice (MVP)

### 6.1 Rust Backend (Tauri Commands)

Implement a small set of Tauri commands:

```rust
// Pseudocode signatures

fn get_vault_config() -> Option<VaultConfig>;
fn set_vault_root(path: String) -> Result<(), Error>;

fn list_files() -> Result<Vec<FileEntry>, Error>;
fn read_note(path: String) -> Result<NotePayload, Error>;
fn write_note(path: String, body: String) -> Result<(), Error>;
 fn rename_item(old_path: String, new_path: String) -> Result<(), Error>;
```

For MVP, **link extraction and search can run in the frontend** to keep the Rust side slim.

### 6.2 React Frontend

Key pieces:

- **App State Store** (Zustand/Redux):

  - `activeVault`
  - `fileTree` (list of notes + folders)
  - `openNoteId`
  - `notesCache` (Map<id, Note>)
  - `linkIndex`
  - `searchResults`

- **Views**:

  - **Vault Picker** (folder selection dialogue)
  - **File Explorer Sidebar**
  - **Main Editor Pane** (split into editor + preview toggle)
  - **Backlinks Panel** (below or to the side of editor)
  - **Search Modal**

- **Lifecycle**:

  1. On app start, ask Rust for `vault.config`.
  2. If no vault configured, show vault picker.
  3. Once vault is set:

     - fetch `list_files()`
     - load each `.md` lazily when opened OR read all upfront for simplicity.
     - build `linkIndex` + simple search index in JS.

---

## 7. Transformers.js & AI – How It Fits (Concept Only for MVP)

We **do not** ship AI in the first MVP build, but we design with it in mind.

### 7.1 Positioning

- AI lives as a **plugin**, not as core logic.
- It should depend on the same public plugin API as any other extension.
- It uses **`transformers.js`** in the frontend to run models locally (in the WebView) for classification / tagging / summarisation.

### 7.2 Example AI Plugin Capabilities (Post-MVP)

- **Note classification**

  - Command: “Classify current note” → assigns a `type` property (e.g., `idea`, `log`, `reference`).

- **Tag suggestion**

  - Reads note text and proposes a list of tags.

- **Summarisation / TL;DR**

  - Generate a short summary at the top of the note.

All of these would:

- Use the **plugin backend API** to read/write notes and properties.
- Use **transformers.js** in the UI plugin to load models (local model files or downloaded once into a cache).

### 7.3 Why Defer AI Past MVP

- MVP goal is: **note capture and navigation**.
- AI introduces:

  - model bundling
  - performance considerations
  - UI complexity

So we:

1. Ship MVP without AI.
2. Implement plugin host + permissions.
3. Ship a **first-party AI plugin** that uses transformers.js as a showcase.

---

## 8. Build Plan (Milestones)

### Milestone 0 – Skeleton

- Set up monorepo structure (or simple repo if preferred):

  - `apps/desktop` (Tauri + React)

- Wire up a minimal Tauri app that opens a window and renders `Hello, Vault`.

### Milestone 1 – Vault & File Tree

- Implement `get_vault_config` / `set_vault_root` in Rust.
- Implement folder picker on first run.
- List `.md` files under vault root as a simple tree.

### Milestone 2 – Editor & Preview

- Implement `read_note` / `write_note` commands.
- Add basic Markdown editor (e.g., textarea or simple code editor component).
- Add toggle for source vs reading view (use a Markdown renderer lib).

### Milestone 3 – Wikilinks & Backlinks

- Implement JS function to parse `[[...]]` wikilinks from note bodies.
- Build `linkIndex` in frontend when notes are loaded/updated.
- Add Backlinks panel to the editor view.

### Milestone 4 – Search

- Build simple in-memory search index in frontend.
- Add a search hotkey (e.g., Ctrl/Cmd+P or Ctrl/Cmd+Shift+F).
- Show list of matching notes; open note on selection.

### Milestone 5 – Polish & Packaging

- Add minimal settings UI (change vault folder, theme).
- Add keyboard shortcuts for core actions.
- Build distributables for Linux/Windows/macOS.

---

## 9. Future Phase Stub (Post-MVP)

After MVP is stable, next phase can introduce:

1. **Core Engine in Rust** (move indexing/links/search from frontend to Rust for performance).
2. **Plugin Host** with a narrowed-down version of `PLUGIN_API.md`.
3. **Official AI Plugin** using transformers.js for:

   - classification
   - tag suggestions
   - summarisation.

4. **Basic Graph View** built on the same link index.

MVP should be written so that:

- Data formats do not change.
- Introducing the Rust-based core engine and plugins is an internal refactor, not a UX-breaking rewrite.
