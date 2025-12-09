# SPEC.md – Liminal Notes

## 1. Purpose & Scope

This document defines the feature set and high-level architecture for **Liminal Notes**, a local-first **personal knowledge management (PKM)** application inspired by tools like Obsidian. The goal is to:

- Preserve the **local-first, Markdown-based, graph-oriented** strengths of tools like Obsidian while remaining implementation-agnostic.
- Provide a clear separation between **core engine**, **UX surfaces**, and **extensibility**.
- Make it easy for power users (developers, researchers, homelab people) to own and move their data.

---

## 2. Core Principles

1. **Local-first, offline-by-default**

   - All primary data lives in a user-accessible folder on disk.
   - No account required; no mandatory cloud services.

2. **Plain-text Markdown storage**

   - Notes are stored as `.md` files with optional YAML frontmatter.
   - Files must be readable and editable in any external text editor.

3. **Composable features**

   - Core concepts (vault, notes, links, graph, properties) are small, composable building blocks.
   - Higher-level features (graph view, Bases-like views, Canvas-like views) are **projections** over these primitives.

4. **Extensibility by design**

   - Plugin API for community extensions.
   - The app’s own “core plugins” use the same public APIs where possible.

5. **User control, minimal lock-in**

   - The user chooses sync strategies (self-hosted, built-in sync, manual Git, etc.).
   - The app never depends on proprietary formats for core data.

---

## 3. Domain Model

### 3.1 Vault

**Definition:** A Vault is a directory containing notes and supporting files.

- `Vault`

  - `id`: stable identifier (derived from path + config file).
  - `rootPath`: absolute path to vault on disk.
  - `config`: JSON or YAML config for this vault.
  - `files[]`: collection of `FileItem`.
  - `settings`: per-vault UI + behaviour options.

### 3.2 FileItem

Represents any file in the vault.

- `FileItem`

  - `path`: relative path from `rootPath`.
  - `type`: `markdown | attachment | base | canvas | other`.
  - `mtime`, `ctime`, `size`.

### 3.3 Note (Markdown file)

Specialisation of `FileItem` with Markdown content.

- `Note`

  - `id`: canonical ID (derived from path + filename).
  - `title`: H1 heading or filename.
  - `body`: markdown string.
  - `frontmatter`: parsed YAML map.
  - `linksOut[]`: list of `Link` (wikilinks or markdown links).
  - `backlinks[]`: computed index (not stored in file).
  - `tags[]`: extracted from frontmatter and inline `#tags`.
  - `properties`: normalised view over frontmatter + inferred metadata.

### 3.4 Link

Internal links between notes (plus optional external links).

- `Link`

  - `sourceNoteId`
  - `target`: `noteId | filePath | externalUrl`.
  - `type`: `wikilink | md-link | embed`.
  - `displayText`.
  - `position`: byte offset or AST position in source note.

### 3.5 Attachments

Non-Markdown files (images, PDFs, audio, etc.).

- Stored in user-defined folders (e.g., `/attachments`, `/assets`).
- Referenced from notes via markdown links.

### 3.6 Derived Structures

Derived from notes + links:

- **Graph**: nodes = notes, edges = internal links.
- **Index**: full-text search index over notes + properties.
- **Property schema**: optional, inferred or user-defined typing for frontmatter properties.
- **Views (Bases/Databases)**: filtered sets of notes rendered in table, card, list forms.

---

## 4. Core Features (Obsidian-Parity)

This section outlines major Obsidian-equivalent features, how they behave, and how they compose with the domain model.

### 4.1 Vault Management

**User-facing behaviour**

- Open, close, and switch between multiple vaults.
- Each vault has independent plugins, themes, and settings.

**Composition**

- Vaults wrap a directory + config file (`vault.config.json` or similar).
- All feature engines (graph, search, bases, etc.) are instantiated per-vault.

---

### 4.2 Markdown Editing

**Modes** (parity with Obsidian’s Source/Live Preview/Reading):

- **Source Mode**: plain Markdown with syntax markers visible.
- **Live Preview**: in-place rendering of Markdown while editing.
- **Reading View**: fully rendered Markdown, read-only.

**Composition**

- Single source-of-truth: Markdown string stored in `Note.body`.
- Rendering pipeline:

  1. Parse Markdown → AST (with custom nodes for wikilinks, embeds, callouts).
  2. Enhance AST with

     - link resolution (internal notes/files)
     - property references
     - plugin-injected syntax.

  3. Render AST → HTML/DOM.

Plugins can:

- Extend syntax via custom fences or inline syntaxes.
- Add post-processing passes on the AST.

---

### 4.3 Linking & Backlinks

**User-facing behaviour**

- Create links using `[[Note Title]]` or `[label](path-or-url)`.
- Auto-complete for existing notes.
- Backlinks pane shows all notes that link to current note.
- “Unlinked mentions” (optional): notes that mention the title without explicit link.

**Composition**

- On save / idle:

  - Parse note content and extract `linksOut[]`.
  - Update global link index for the vault.

- Backlinks are computed as reverse lookups in the link index.
- Graph view, local graph, and page preview all use the same link index.

---

### 4.4 Graph View (Global & Local)

**User-facing behaviour**

- **Global graph**: shows all notes as nodes; links as edges.
- **Local graph**: focused note + its neighbours (backlinks + outlinks) within N hops.
- Filters for:

  - Tags
  - Folders
  - File properties (e.g., `type: note`, `status: draft`)
  - Link types

- Visual customisation (colour, size, physics parameters).

**Composition**

- Graph is generated from the link index:

  - nodes: all `Note.id`.
  - edges: all `Link` where `target` is internal.

- Filters are expressions over note properties + tags.
- Local graph: run BFS/DFS from current `Note.id` with depth limit.
- Graph view is a view-layer plugin on top of the core graph data structure.

---

### 4.5 Tags & Properties

**User-facing behaviour**

- Inline tags: `#tag`, `#tag/subtag`.
- Frontmatter properties:

  ```yaml
  ---
  type: note
  status: draft
  tags: [pkm, obsidian]
  ---
  ```

- Dedicated **Properties panel** for editing frontmatter via UI.
- Filter notes by tags/properties.

**Composition**

- Tags extracted from:

  - frontmatter `tags` field
  - inline tag tokens in the Markdown.

- Properties normalised into a `properties` map on `Note`.
- Property typing is inferred (string, number, boolean, date, array) with optional schema definitions.
- Bases/Databases, graph filters, and search queries all use properties.

---

### 4.6 Search

**User-facing behaviour**

- Global search across:

  - Note body
  - Title
  - Tags
  - Properties.

- Support for:

  - phrase search
  - regex
  - boolean operators
  - saved searches.

**Composition**

- Background indexer builds an inverted index over:

  - tokens in `Note.body`
  - tokens in title
  - tags
  - properties.

- Search queries parsed into an AST and evaluated against this index.
- Plugin API to:

  - add custom fields to index
  - provide saved search definitions.

---

### 4.7 Core Views & Workflows

#### 4.7.1 File Explorer

- Tree or flat list of `FileItem`s scoped to current vault.
- Supports favourites, pinned notes, hidden folders.
- Composition: thin wrapper over the OS filesystem watcher.

#### 4.7.2 Panes & Layout

- Multiple panes (tabs) with:

  - note editors
  - graph views
  - bases
  - canvases
  - search results.

- Layout persisted per-vault.
- Composition: a `LayoutManager` that instantiates view components bound to data sources (note IDs, query definitions, file paths).

#### 4.7.3 Daily Notes

- Configurable daily note template and folder.
- Single “today” note per date.
- Composition: date-based file generator, uses template plugin.

#### 4.7.4 Templates

- Named templates stored as Markdown files.
- Insertion of template into current note at cursor or as new note.
- Template variables (date, time, file name, vault, etc.).

---

### 4.8 Canvas (Infinite Whiteboard)

Parallels Obsidian Canvas.

**User-facing behaviour**

- Infinite canvas with cards representing:

  - notes
  - text snippets
  - links
  - images
  - external URLs.

- Connect cards with edges.
- Group cards, colour-code them, zoom and pan.

**Data model**

- Stored as `.canvas` JSON file in the vault.
- References notes by their `Note.id` or file path.

**Composition**

- Canvas doesn’t own content; it references existing notes/attachments.
- Graph engine can optionally include canvas relationships as separate edge types.
- JSON format is stable and documented for third-party tools.

---

### 4.9 Bases / Database-Like Views

Obsidian’s Bases-like feature.

**User-facing behaviour**

- Define a **Base**:

  - underlying collection: folder, tag, search query, or property filter.
  - views: table, cards, list, (future: calendar, Kanban).

- Columns/fields map to note properties (frontmatter + derived).
- Inline editing of properties from the Base view.

**Data model**

- `.base` file describing:

  - source query (e.g., `tag:project status!=archived`).
  - column definitions (property, label, type, sorting).
  - view presets (table, card, list).

**Composition**

- Bases engine is a projection engine over the note + property index.
- CRUD operations on properties are reflected back into the underlying Markdown files.
- Bases can be embedded into Markdown notes via fenced code blocks:

  ````
  ```base
  source: tag:project
  view: table
  ````

  ```

  ```

---

### 4.10 Theming & Appearance

**User-facing behaviour**

- Theme gallery per vault.
- Toggle between light/dark modes.
- Custom CSS snippets.

**Composition**

- Theme definition as JSON + CSS.
- View layer exposes stable CSS variables/tokens for:

  - colours
  - fonts
  - spacing
  - component states.

- Plugins can declare theme hooks or ship CSS snippets.

---

### 4.11 Sync (Optional Add-On)

Obsidian Sync equivalent.

**User-facing behaviour**

- Optional cloud sync for vaults.
- End-to-end encryption.
- Version history per file.
- Optional shared vaults (collaboration).

**Composition**

- Sync is a separate service/module:

  - File watcher observes vault changes.
  - Encrypted delta sync with remote service.

- Sync metadata stored in a `.sync` subfolder, separate from user files.
- Users can disable sync per vault without altering local data.

The spec should not assume a particular provider; just define the integration points.

---

### 4.12 Publish (Optional Add-On)

Obsidian Publish equivalent.

**User-facing behaviour**

- Publish selected notes as a static or dynamic website.
- Optional features:

  - Graph view
  - Search
  - Custom domain
  - Theming.

**Composition**

- Publisher consumes:

  - rendered HTML of notes
  - resolved internal links
  - site config (navigation, excluded files, theme).

- Output options:

  - static site bundle (files to host anywhere)
  - direct deploy to a managed hosting provider.

---

## 5. Extensibility Model

### 5.1 Plugin Types

The app exposes a plugin API with the following extension points:

1. **View Plugins**

   - Custom panes (e.g., Kanban, Mind Map, Pomodoro timer).
   - Custom renderers for specific file types.

2. **Command Plugins**

   - Commands accessible via command palette + keybindings.

3. **Editor Plugins**

   - Syntax extensions (new fenced code blocks, inline syntaxes).
   - Decorations, autocomplete providers.

4. **Index Plugins**

   - Add custom fields to the global index.
   - React to note changes.

5. **Workflow Plugins**

   - Daily note automation, task extraction, integrations (e.g., Git, Zotero).

### 5.2 Plugin Packaging

- Each plugin has:

  - `manifest.json` (id, name, version, min app version, permissions).
  - main script (JS/TS) executed in plugin sandbox.
  - optional UI assets (CSS, icons).

### 5.3 Permissions

- Plugins declare:

  - file system access scope (read/write paths, if any).
  - network access (yes/no, optional domains).
  - access to vault metadata (index, graph data, properties).

---

## 6. Composition Map (How Features Build on Each Other)

This section summarises how major features compose:

- **Vault**

  - wraps the filesystem
  - is the root context for all operations.

- **Notes (Markdown)**

  - are the atomic knowledge units
  - feed into:

    - search index
    - link index
    - tags/properties index
    - bases.

- **Links**

  - connect notes → power backlinks & graph view.
  - feed into local + global graph views.

- **Graph**

  - visual layer over link index
  - filters intersect with tag/property index.

- **Properties/Tags**

  - surface structure for bases/databases
  - used by graph filters and search queries.

- **Bases**

  - are query-driven projections over note + property index.
  - allow editing of properties, which updates notes.

- **Canvas**

  - is a visual spatial projection referencing notes/attachments.
  - uses note IDs + file paths.

- **Sync & Publish**

  - operate strictly as consumers/producers over the vault filesystem
  - **must not** introduce proprietary formats for core notes.

---

## 7. Non-Goals (Deliberate Omissions)

- No requirement for central user accounts for basic usage.
- No proprietary binary format for core notes.
- No mandatory cloud dependency for basic features.
- No complex "workspace" abstraction beyond vaults and layouts.

---

## 8. Future Directions

Potential future enhancements beyond Obsidian parity:

- Built-in support for Git-backed versioning per vault.
- First-class support for homelab sync patterns (Syncthing profiles, self-hosted sync).
- Native PWA-like mode for desktop (if using Tauri or similar).
- Optional local LLM integration (semantic search, summarisation, link suggestions) that indexes notes locally.

These are out of scope for the first implementation, but the architecture above should make them straightforward to add as plugins or optional modules.
