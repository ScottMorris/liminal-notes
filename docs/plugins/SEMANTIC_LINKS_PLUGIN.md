# SEMANTIC_LINKS_PLUGIN.md – Semantic Links Plugin Design

## 1. Purpose & Scope

The **Semantic Links** plugin is a first-party extension for Liminal Notes that:

- Automatically builds a **semantic index** of notes using embeddings.
- Suggests **related notes** and potential links, so the system works _with_ the user.
- Can retroactively scan an existing vault (with explicit user consent).
- Never replaces or overrides manual `[[wikilinks]]`, but augments them.

This is **not** a day-one feature. It is designed to plug into the existing plugin system and AI infrastructure once the MVP and basic AI tooling (transformers.js integration) are in place.

---

## 2. High-Level Concept

Think of the Semantic Links plugin as a background librarian:

- It reads your notes.
- It maps them into a vector space using **embeddings**.
- It maintains a **semantic graph** over your notes.
- It suggests connections and clusters so you do not have to micro-manage all links.

It operates alongside manual links:

- Manual `[[wikilinks]]` remain authoritative connections.
- Semantic links are **suggestions**, visual overlays, and discovery aids.

---

## 3. Feature Set (v0.1)

### 3.1 Embedding & Indexing

- Build a **vector representation** (embedding) for each note.
- Store embeddings and metadata in a vault-local index (e.g., `.semantic/index.sqlite` or `.semantic/index.json`).
- Support **incremental updates**:

  - On note change, only re-embed that note.

### 3.2 Related Notes Suggestions

- For the current note, provide a list of **top-K similar notes**.
- Show similarity scores or qualitative labels (e.g., "highly related", "somewhat related").
- Offer UI actions:

  - Open related note.
  - Insert `[[wikilink]]` to related note at cursor.

### 3.3 Retroactive Vault Scan

- With explicit user action: `Semantic: Scan vault and build index`.
- Walk all notes, embed them, and build the semantic index.
- Show progress and allow cancellation.
- Store embeddings in `.semantic/` so the scan is not repeated from scratch.

### 3.4 Non-Destructive Behaviour

- Never auto-edit notes without the user’s direct confirmation.
- Only **suggest** links and clusters; user chooses what to apply.

---

## 4. Future Features (v0.2+)

- **Semantic search** across the vault using embeddings.
- **Duplicate / near-duplicate detection**.
- **Topical clusters** (group of notes about the same theme).
- **Semantic overlay on the graph view** (different edge types for manual vs semantic links).

---

## 5. Plugin Manifest

Example `manifest.json` for the Semantic Links plugin:

```json
{
  "id": "core.semantic-links",
  "name": "Semantic Links",
  "version": "0.1.0",
  "minAppVersion": "0.2.0",
  "description": "Suggest semantic links and related notes using local embeddings.",
  "author": "Core Team",
  "permissions": {
    "vault": true,
    "index": true,
    "filesystem": {
      "read": ["."],
      "write": [".semantic/"]
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

Notes:

- No network access by default.
- Embeddings and metadata live in `.semantic/` inside the vault.

---

## 6. Architecture & Data Flow

The plugin is a **hybrid** plugin with backend and frontend parts.

### 6.1 Backend Responsibilities

- Hook into core events via the plugin API:

  - `onVaultOpened`
  - `onNoteChanged`

- Maintain a **semantic index** structure:

  - Note identifier (path or noteId)
  - Embedding vector
  - Last embedded timestamp
  - Optional note metadata (title, tags, etc.)

- Provide commands (via plugin API) such as:

  - `semantic.getRelatedNotes(noteId, limit)`
  - `semantic.rebuildIndex()`
  - `semantic.getIndexStats()`

- Persist index to disk under `.semantic/`.

### 6.2 Frontend Responsibilities

- Integrate **transformers.js** to compute embeddings.
- Provide the UI for:

  - Related notes sidebar for the current note.
  - Manual actions (Scan vault, Rebuild index, Refresh current note).

- Coordinate embedding operations with the backend:

  - Fetch note text.
  - Compute embeddings in the WebView.
  - Send vectors + IDs to backend for storage.

### 6.3 Embedding Flow (Single Note)

1. User opens a note or saves changes.
2. Backend plugin receives `NoteChanged` event and determines if embedding is stale.
3. Frontend plugin:

   - Reads note body.
   - Uses transformers.js embedding pipeline.
   - Sends `{ noteId, embedding, meta }` to backend.

4. Backend stores embedding in semantic index.

### 6.4 Embedding Flow (Vault Scan)

1. User runs `Semantic: Scan vault and build index` from command palette or sidebar.
2. Backend:

   - Enumerates all notes.
   - Creates a queue of notes to embed.

3. Frontend:

   - Pulls notes from the queue in batches.
   - Computes embeddings via transformers.js.
   - Sends batch embeddings back to backend.

4. Backend:

   - Writes embeddings to `.semantic/index`.
   - Emits progress events for UI.

---

## 7. transformers.js Integration

The frontend (`ui.js` or `ui.tsx`) uses transformers.js to compute embeddings.

### 7.1 Model Choice

- Use a small, efficient sentence embedding model.
- Requirements:

  - Good enough for semantic similarity between notes.
  - Runs reasonably fast on common laptops.

### 7.2 Model Loading & Caching

- On first semantic operation, the plugin:

  - Checks for cached model weights (e.g., IndexedDB or plugin-specific storage).
  - If not present, loads from a local bundle or, if the user enables it, downloads from a configured source.

- Keep model instance in memory for the session.

### 7.3 Pseudocode Sketch

```ts
import { pipeline } from "@xenova/transformers";

let embedder: any | null = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline(
      "feature-extraction",
      "local-or-remote-embedding-model-id"
    );
  }
  return embedder;
}

export async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text);
  // Reduce output (e.g., mean-pool over tokens) to get a single vector
  return poolToVector(output);
}
```

The plugin can reuse embedding helpers shared with the AI Assistant plugin, if a shared AI utilities package exists.

---

## 8. UI Design

### 8.1 Semantic Links Sidebar

A dedicated sidebar view with:

- Section: **Related Notes**

  - List of top-K similar notes for the current note.
  - Each entry shows title, similarity score, maybe a short snippet.
  - Actions per entry:

    - `Open` (switch current note)
    - `Insert link` (`[[Title]]` at cursor)

- Section: **Index Status**

  - Total notes indexed.
  - Last full scan time.
  - Button: `Scan vault`.
  - Button: `Rebuild index`.

### 8.2 Commands

Exposed via command palette and keybindings:

- `Semantic: Scan vault and build index`
- `Semantic: Rebuild index`
- `Semantic: Refresh index for current note`
- `Semantic: Show related notes`

---

## 9. Modes & User Control

To ensure the plugin works _with_ the user:

### 9.1 Passive / On-Demand Mode (Default)

- No background indexing.
- Only runs when the user:

  - explicitly triggers a scan; or
  - asks for related notes on the current note.

### 9.2 Incremental Mode (Opt-In)

- After an initial scan, the plugin:

  - Listens for `NoteChanged` events.
  - Re-embeds only changed notes.

- Keeps the semantic index up to date quietly.

### 9.3 No Automatic Edits

- The plugin **never** edits note content on its own.
- All link insertion is user-confirmed.

---

## 10. Permissions & Safety

- Vault and index access are required.
- Filesystem write access is limited to the vault and `.semantic/`.
- Network access is disabled by default.
- Optional setting: "Allow model downloads" (opt-in, with domain restrictions) if remote model fetches ever become necessary.

---

## 11. Integration with the Graph

In later versions, the semantic index can inform the graph view:

- Semantic edges are visualised differently (e.g., dashed lines, different colour).
- Users can toggle semantic links on/off in graph filters.
- Manual links remain first-class; semantic links are an overlay.

The underlying graph data model should support **edge types**:

- `manual-link`
- `semantic-link`

---

## 12. Relationship to the AI Assistant Plugin

The Semantic Links plugin is intentionally **separate** from the AI Assistant plugin:

- AI Assistant focuses on:

  - summarisation
  - tag suggestions
  - type classification
  - local note-level actions.

- Semantic Links focuses on:

  - embeddings across the vault
  - related notes
  - semantic clusters and overlays.

They can share:

- Common AI utility code (model loading, embedding helpers).
- Some configuration (model selection, performance limits).

But they remain separate plugins so users can enable one without the other.

---

## 13. Implementation Order (Post-MVP)

A reasonable path to implement this plugin:

1. **After MVP & core plugin host are stable**:

   - Ensure `PLUGIN_API` can:

     - read notes
     - listen for note change events
     - read/write plugin-specific files under `.semantic/`.

2. **Phase 1 – Minimal Semantic Index**:

   - Build embeddings only via a manual `Scan vault` command.
   - Show related notes list in a sidebar.

3. **Phase 2 – Incremental Updates**:

   - Add `NoteChanged` listener and update embeddings incrementally.

4. **Phase 3 – Graph Overlay & Advanced Features**:

   - Expose semantic links to the graph view.
   - Add semantic search and duplicate detection.

This keeps the feature aligned with the rest of the system, without blocking day-one functionality.
