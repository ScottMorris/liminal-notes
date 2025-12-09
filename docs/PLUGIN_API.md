# PLUGIN_API.md – Liminal Notes

## 1. Goals & Philosophy

This document defines the **public plugin API** for **Liminal Notes**.

Goals:

- Enable rich extensions (views, workflows, integrations) without compromising **local-first** design.
- Keep the API **stable, documented, and versioned**.
- Make plugins **easy to write in TypeScript/JavaScript**.
- Provide **fine-grained permissions** so users stay in control of what plugins can do.

Non-goals:

- Arbitrary system-wide automation (this is not a general scripting host).
- Allowing plugins to bypass core security or read arbitrary files without consent.

The plugin API should feel familiar to folks who know Obsidian, VS Code, or browser extensions.

---

## 2. Plugin Types & Lifecycle

### 2.1 Plugin Types

There are two primary kinds of plugins:

1. **Backend plugins**

   - Run in a sandboxed JS runtime inside the Rust core.
   - Focus on data, workflows, and integration logic.
   - Can respond to vault events (note changes, search index updates, etc.).

2. **Frontend plugins**

   - Run in the React/WebView environment.
   - Contribute UI (panes, views, buttons, context menu items, decorations).

A single plugin can have **both** backend and frontend parts.

---

### 2.2 Manifest

Each plugin ships with a `manifest.json` at its root:

```json
{
  "id": "author.plugin-name",
  "name": "Plugin Name",
  "version": "0.1.0",
  "minAppVersion": "0.1.0",
  "description": "Short description of what this plugin does.",
  "author": "You",
  "homepage": "https://example.com",
  "permissions": {
    "vault": true,
    "index": true,
    "graph": false,
    "filesystem": {
      "read": ["attachments/"],
      "write": []
    },
    "network": {
      "allowed": false,
      "domains": []
    }
  },
  "entrypoints": {
    "backend": "main.js",
    "frontend": "ui.js"
  }
}
```

The app validates manifest fields and presents the requested permissions to the user.

---

### 2.3 Lifecycle

Backend plugins implement and export lifecycle hooks in `main.js`:

```ts
import type { App, PluginContext } from "@pkm/plugin-api";

export async function activate(app: App, ctx: PluginContext) {
  // Called when plugin is enabled.
}

export async function deactivate() {
  // Called when plugin is disabled/uninstalled.
}
```

Frontend plugins use a similar pattern in `ui.js`:

```ts
import type { UiApp, UiPluginContext } from "@pkm/plugin-api/ui";

export function activateUi(app: UiApp, ctx: UiPluginContext) {
  // Register views, commands, decorations, etc.
}

export function deactivateUi() {}
```

The app guarantees:

- `activate` is called once when plugin is enabled.
- `deactivate` is called before the plugin is disabled or the app shuts down.

---

## 3. Backend Plugin API Surface

Backend plugins receive an `App` and `PluginContext` instance.

### 3.1 Core Types

```ts
interface App {
  vaults: VaultService;
  notes: NoteService;
  search: SearchService;
  graph: GraphService;
  properties: PropertyService;
  bases: BaseService;
  canvas: CanvasService;
  commands: CommandService;
  events: EventBus;
  settings: SettingsService;
  logger: Logger;
}

interface PluginContext {
  id: string;
  storage: PluginStorage; // per-plugin key-value store
  subscriptions: SubscriptionManager;
}
```

---

### 3.2 Vault & File Access

`VaultService` exposes high-level operations within the **active vault** by default, with optional vault IDs for multi-vault setups.

```ts
interface VaultService {
  getActiveVault(): Promise<VaultInfo | null>;
  listVaults(): Promise<VaultInfo[]>;
  openVault(id: string): Promise<void>;
}

interface VaultInfo {
  id: string;
  name: string;
  rootPath: string; // path is informational; not a raw fs handle
}
```

`NoteService` and related APIs give access to notes and files:

```ts
interface NoteService {
  getNote(id: NoteId): Promise<Note | null>;
  getNoteByPath(path: string): Promise<Note | null>;
  listNotes(filter?: NoteFilter): Promise<NoteSummary[]>;

  createNote(input: CreateNoteInput): Promise<Note>;
  updateNote(id: NoteId, update: UpdateNoteInput): Promise<Note>;
  deleteNote(id: NoteId): Promise<void>;
}

interface Note {
  id: string;
  path: string;
  title: string;
  body: string;
  frontmatter: Record<string, unknown>;
  tags: string[];
  properties: Record<string, unknown>;
  linksOut: Link[];
}
```

Plugins can:

- Read and modify notes within the vault.
- Create notes (e.g., daily notes, summary notes).
- Use filters (tags, folder, properties) to operate on subsets.

Access to **raw filesystem paths outside the vault** is not allowed without explicit `filesystem` permissions.

---

### 3.3 Search & Queries

`SearchService` gives programmatic access to the search index.

```ts
interface SearchService {
  query(expression: string, options?: SearchOptions): Promise<SearchResult[]>;
}

interface SearchResult {
  noteId: string;
  score: number;
  matches: MatchSpan[];
}
```

Plugins can:

- Reuse the same query language as the UI (e.g., `tag:project status:active`).
- Implement custom workflows (e.g., “archive all completed tasks older than 30 days”).

---

### 3.4 Graph & Links

`GraphService` provides access to the link graph.

```ts
interface GraphService {
  getLocalGraph(
    noteId: string,
    depth?: number,
    filter?: GraphFilter
  ): Promise<GraphSnapshot>;
  getGlobalGraph(filter?: GraphFilter): Promise<GraphSnapshot>;
}

interface GraphSnapshot {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
```

Plugins can:

- Analyse the structure of the knowledge graph.
- Build custom algorithms (clusters, centrality scores, etc.).
- Add metadata back to notes (e.g., `hubScore`, `orphan: true`).

---

### 3.5 Properties & Bases

`PropertyService` and `BaseService` expose structured metadata.

```ts
interface PropertyService {
  getProperties(noteId: string): Promise<Record<string, unknown>>;
  setProperties(noteId: string, props: Record<string, unknown>): Promise<void>;
}

interface BaseService {
  listBases(): Promise<BaseDefinition[]>;
  evaluateBase(id: string): Promise<BaseRow[]>;
}
```

Plugins can:

- Enforce property schemas.
- Auto-populate or update properties (e.g., `lastReviewed` dates).

---

### 3.6 Canvas

`CanvasService` gives access to `.canvas` files.

```ts
interface CanvasService {
  listCanvases(): Promise<CanvasSummary[]>;
  getCanvas(id: string): Promise<Canvas | null>;
  saveCanvas(canvas: Canvas): Promise<void>;
}
```

Plugins can:

- Generate or transform canvases.
- Maintain map-style or dashboard canvases dynamically.

---

### 3.7 Commands

Plugins can register commands that appear in the command palette and can be bound to keybindings.

```ts
interface CommandService {
  registerCommand(def: CommandDefinition): Disposable;
}

interface CommandDefinition {
  id: string;
  title: string;
  run: (ctx: CommandRunContext) => Promise<void> | void;
}
```

Examples:

- “Convert current note to daily log format.”
- “Summarise current selection.”

---

### 3.8 Events

`EventBus` lets plugins subscribe to app events.

```ts
interface EventBus {
  onNoteChanged(handler: (event: NoteChangedEvent) => void): Disposable;
  onVaultOpened(handler: (event: VaultOpenedEvent) => void): Disposable;
  onIndexUpdated(handler: (event: IndexUpdatedEvent) => void): Disposable;
}
```

Plugins use `PluginContext.subscriptions` to automatically clean up handlers on deactivation.

---

### 3.9 Settings & Storage

Plugins can persist their own configuration.

```ts
interface SettingsService {
  getPluginSettings<T = unknown>(pluginId: string): Promise<T | null>;
  setPluginSettings<T = unknown>(pluginId: string, value: T): Promise<void>;
}

interface PluginStorage {
  getItem<T = unknown>(key: string): Promise<T | null>;
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  removeItem(key: string): Promise<void>;
}
```

---

## 4. Frontend Plugin API Surface

Frontend plugins work with `UiApp` and `UiPluginContext`.

### 4.1 Core Types

```ts
interface UiApp {
  views: ViewService;
  editor: EditorService;
  uiCommands: UiCommandService;
  statusBar: StatusBarService;
  menus: MenuService;
  themes: ThemeService;
}

interface UiPluginContext {
  id: string;
}
```

---

### 4.2 Views & Panes

Plugins can register custom views:

```ts
interface ViewService {
  registerView(def: ViewDefinition): Disposable;
}

interface ViewDefinition {
  id: string;
  title: string;
  icon?: string;
  location: "left" | "right" | "bottom" | "center";
  render: (container: HTMLElement, api: ViewApi) => ViewInstance;
}

interface ViewInstance {
  onOpen?(): void;
  onClose?(): void;
  onResize?(width: number, height: number): void;
  dispose(): void;
}
```

Examples:

- Task dashboard
- Custom graph visualiser
- Integrated terminal-like panel

---

### 4.3 Editor Integration

`EditorService` lets plugins interact with the active editor(s).

```ts
interface EditorService {
  getActiveEditor(): Editor | null;
  onDidChangeActiveEditor(handler: (editor: Editor | null) => void): Disposable;
}

interface Editor {
  getText(): string;
  setText(value: string): void;

  getSelection(): SelectionRange;
  replaceSelection(text: string): void;

  insertTextAtCursor(text: string): void;

  addDecoration(decoration: EditorDecoration): Disposable;
}
```

Examples:

- Highlighting TODOs
- Inserting templates
- Showing inline annotations

---

### 4.4 UI Commands & Menus

Frontend commands appear in the command palette and can be bound to shortcuts.

```ts
interface UiCommandService {
  register(def: UiCommandDefinition): Disposable;
}

interface UiCommandDefinition {
  id: string;
  title: string;
  run: () => void | Promise<void>;
}
```

`MenuService` lets plugins add context menu items:

```ts
interface MenuService {
  registerContextMenuContributor(
    contributor: (ctx: MenuContext) => MenuItemDefinition[]
  ): Disposable;
}
```

---

### 4.5 Status Bar & Theming

Plugins can add status bar widgets:

```ts
interface StatusBarService {
  addItem(options: StatusBarItemOptions): StatusBarItem;
}

interface StatusBarItem {
  setText(text: string): void;
  setTooltip(text: string): void;
  onClick(handler: () => void): void;
  dispose(): void;
}
```

`ThemeService` exposes theme tokens (CSS variables) so plugin UI can match the app look.

---

## 5. Permissions Model

Plugins are sandboxed and must declare what they need.

### 5.1 Permission Categories

- `vault`: access to vault metadata and note content.
- `index`: access to search/index/graph data.
- `graph`: heavy graph operations.
- `filesystem`: scoped read/write access within the vault (or subfolders).
- `network`: HTTP requests to declared domains.

The app:

- Shows a permission prompt when enabling a plugin.
- Allows users to review and revoke permissions.

---

## 6. Versioning & Compatibility

### 6.1 API Versioning

- Plugin API version is tracked separately from app version.
- `minAppVersion` and optional `maxAppVersion` in `manifest.json` gate compatibility.
- Breaking changes:

  - Only allowed in major API versions.
  - Documented migration guides for plugin authors.

### 6.2 Feature Detection

Plugins can check for features at runtime:

```ts
if (app.graph) {
  // safe to use graph service
}
```

---

## 7. Developer Experience

### 7.1 Tooling

- `@pkm/plugin-api` npm package with:

  - TypeScript types for backend + frontend APIs.
  - Helper utilities (logging, disposables, schema validation).

- `pkm-plugin-cli`:

  - `pkm-plugin init` – scaffold a new plugin.
  - `pkm-plugin build` – bundle backend/frontend scripts.
  - `pkm-plugin validate` – validate manifest + permissions.

### 7.2 Debugging

- Backend logs appear in a dedicated “Plugin Logs” pane.
- Frontend plugins can use devtools (Tauri/Chromium devtools).

---

## 8. Example Plugin Sketches

### 8.1 Simple Command Plugin (Backend Only)

- Registers a command that turns the current note into uppercase.
- Uses `notes` service and `commands` service.

### 8.2 Daily Review Dashboard (Backend + Frontend)

- Backend:

  - Queries notes with `tag:review` updated in the last 7 days.
  - Exposes a small API to the frontend via commands/events.

- Frontend:

  - Custom view in the right sidebar.
  - Renders a list of notes and opens them on click.

### 8.3 Canvas Overview Generator

- Backend:

  - Scans all canvases and computes stats.

- Frontend:

  - View showing a grid of canvases with metadata (node counts, last updated).

These examples will be expanded into full code samples in a `/examples/plugins` directory in the repo.

---

## 9. Future Extensions

Potential future plugin APIs:

- Task/checkbox model exposed as a first-class service.
- Calendar/time-blocking service for date-based operations.
- Local LLM service for semantic search and summarisation.

The current spec is intentionally small, focusing on core capabilities: notes, search, graph, properties, canvases, and UI integration.
