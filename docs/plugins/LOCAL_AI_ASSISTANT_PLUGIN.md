# LOCAL_AI_ASSISTANT_PLUGIN.md – Local AI Assistant Plugin (transformers.js)

## 1. Purpose & Scope

This document describes the design of a **first-party AI assistant plugin** for **Liminal Notes**.

The plugin aims to provide a "Jules-like" assistant that can:

* Help summarise notes.
* Suggest tags and properties.
* Classify note type or intent.
* Suggest related notes based on content.

All of this should be:

- **Local-first** – no note content is sent to remote servers by default.
- **Plugin-based** – shipped as a first-party plugin using the public plugin API.
- **Optional** – users can enable/disable it, and it should degrade gracefully.

The plugin uses **transformers.js** to run models locally in the WebView (desktop) and, eventually, on mobile.

---

## 2. High-Level Concept

The AI plugin is a **hybrid plugin**:

- **Backend part** (using the backend plugin API):

  - Reads/writes notes and properties.
  - Coordinates note selection, batch operations, and caching of AI-generated metadata.

- **Frontend part** (using the UI plugin API):

  - Integrates `transformers.js` to run models in the browser/WebView.
  - Provides UI: sidebar view, inline buttons, and command palette entries.
  - Renders AI suggestions and lets users apply or discard them.

Communication between frontend and backend plugin parts uses the app's plugin messaging/event system (or commands routed by plugin ID).

---

## 3. Feature Set

### 3.1 MVP Features (AI Plugin v0.1)

1. **Summarise Current Note**

   - Command: `AI: Summarise Current Note`.
   - Reads the full note text.
   - Produces a short summary (2–5 sentences).
   - User can:

     - Insert summary at cursor.
     - Insert summary at top of note.
     - Save summary into a frontmatter field (e.g., `summary`).

2. **Suggest Tags**

   - Command: `AI: Suggest Tags for Current Note`.
   - Uses classification/zero-shot models to propose candidate tags.
   - UI shows a list of suggested tags; user can accept/reject per tag.
   - On acceptance, tags are written to frontmatter `tags` array and/or inline `#tags`.

3. **Classify Note Type**

   - Command: `AI: Classify Note Type`.
   - Uses a classifier model with a small label set (e.g., `"idea"`, `"log"`, `"reference"`, `"task"`).
   - Writes result to a `type` property in frontmatter.

4. **Suggest Related Notes**

   - Command: `AI: Find Related Notes`.
   - Embeds the current note and a subset of other notes.
   - Returns a ranked list of related notes.
   - UI shows them in a panel; user can click to open or insert wikilinks.

### 3.2 Future Features (AI Plugin v0.2+)

- Semantic search across vault.
- Generate outlines from long notes.
- Rewrite text for clarity or tone.
- Conversational "chat with my notes" experience (requires more infra).

---

## 4. Plugin Manifest

Example `manifest.json` for the AI plugin:

```json
{
  "id": "core.ai-assistant",
  "name": "AI Assistant",
  "version": "0.1.0",
  "minAppVersion": "0.1.0",
  "description": "Local AI assistant for summarisation, classification, and tag suggestions using transformers.js.",
  "author": "Core Team",
  "homepage": "https://example.com",
  "permissions": {
    "vault": true,
    "index": true,
    "graph": false,
    "filesystem": {
      "read": ["."],
      "write": ["."]
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

- No network access by default. Models are bundled or cached locally.
- Vault + index access required to read notes and propose links.

---

## 5. Data Flow & Architecture

### 5.1 Summarise Current Note

**Flow:**

1. User triggers `AI: Summarise Current Note` via command palette or button.
2. Frontend plugin:

   - Fetches current note text via `EditorService` (UI API).
   - Sends note text to the `transformers.js` summarisation pipeline.

3. Transformers.js:

   - Loads (or reuses) summarisation model.
   - Runs inference on note text (may chunk long notes into segments).

4. Frontend plugin:

   - Receives summary text.
   - Shows it in a modal with options: Insert at top / Insert at cursor / Save as frontmatter.

5. If user chooses to persist summary:

   - Frontend calls a backend command exposed by `main.js` to update the note frontmatter.

No note content leaves the machine.

### 5.2 Suggest Tags

**Flow:**

1. User triggers `AI: Suggest Tags`.
2. Frontend plugin reads the note body.
3. Depending on approach:

   - Use a multi-label classification model.
   - Or use a zero-shot classifier with a configurable candidate tag list.

4. Model outputs labels + confidence scores.
5. Frontend UI shows suggested tags with checkboxes.
6. On apply, backend plugin updates note frontmatter `tags` and/or inline tags.

### 5.3 Classify Note Type

**Flow:**

1. User triggers `AI: Classify Note Type`.
2. Frontend plugin feeds text to a classifier model.
3. Model outputs one label from a fixed set.
4. Backend plugin writes `type: <label>` into frontmatter.
5. Frontend may show a small status badge and undo option.

### 5.4 Suggest Related Notes

**Flow:**

1. User triggers `AI: Find Related Notes`.
2. Backend plugin fetches:

   - current note text
   - candidate notes (e.g., last N modified, or a subset via `SearchService`).

3. Backend plugin computes or retrieves embeddings:

   - Option A (simple): embed on the frontend with transformers.js, requested by backend.
   - Option B (later): maintain a local embedding index in the backend.

4. Plugin computes similarity scores and picks top matches.
5. Frontend UI shows ranked list.
6. User can:

   - open related notes
   - insert wikilinks to them.

---

## 6. transformers.js Integration

The frontend plugin (`ui.js`) is responsible for **model loading and inference** using transformers.js.

### 6.1 Model Strategy

- Use small, efficient models suitable for on-device usage.
- Provide a default set of models:

  - summarisation
  - classification (for type and/or tags)
  - embedding model for related-note suggestions.

### 6.2 Model Loading & Caching

- On first use of a given feature, the plugin:

  - Checks for an existing cached model (e.g., IndexedDB or local plugin storage).
  - If not present, loads the model from a local bundle or an initial download (if network permission is granted by the user).

- Show a loading indicator while models are being loaded.
- Maintain a simple in-memory model registry per session so we do not reload models for each call.

### 6.3 Example Pseudocode

```ts
import { pipeline } from "@xenova/transformers"; // example import

let summariser: any | null = null;

async function getSummariser() {
  if (!summariser) {
    summariser = await pipeline("summarization", "local-or-remote-model-id");
  }
  return summariser;
}

export async function summariseText(text: string): Promise<string> {
  const summariser = await getSummariser();
  const result = await summariser(text, { max_length: 128 });
  return result[0].summary_text;
}
```

This helper can then be used by the UI commands.

---

## 7. UI Design

### 7.1 AI Sidebar View

A dedicated AI sidebar view provides:

- Buttons for:

  - Summarise current note
  - Suggest tags
  - Classify note type
  - Find related notes

- A log/history of AI actions taken on the current note.
- Settings link (to configure models, thresholds, and behaviour).

### 7.2 Inline Actions

- Small AI icon/button in the editor toolbar:

  - Quick actions (Summarise, Suggest Tags, Clean Up Text).

- Context menu entries when text is selected:

  - `AI: Summarise Selection`
  - `AI: Rewrite Selection`

### 7.3 Command Palette

Commands available via the command palette:

- `AI: Summarise Current Note`
- `AI: Summarise Selection`
- `AI: Suggest Tags`
- `AI: Classify Note Type`
- `AI: Find Related Notes`

---

## 8. Permissions & Safety

- By default, the AI plugin:

  - Has access to vault and index (same as other core plugins).
  - Has **no network access** – models must be bundled or previously cached.

- Optional setting: "Allow model downloads" which enables network access for specific domains (e.g., a model hosting location).
- Clear messaging in the UI:

  - That note content stays on-device by default.
  - When/if model downloads occur.

No telemetry about note content is collected by the plugin.

---

## 9. Performance & Resource Management

- Models are loaded lazily (on first use) and kept in memory while the app runs.
- Provide an in-plugin command: `AI: Unload Models` to free memory.
- Consider model size and device constraints (e.g., choose small models that run acceptably on lower-end laptops).

For long notes:

- Chunk text into segments below the model's max token length.
- Summarise each chunk, then summarise the summaries.

---

## 10. Configuration

The AI plugin exposes a settings panel with:

- Toggle per feature:

  - [x] Summarisation
  - [x] Tag suggestions
  - [x] Classification
  - [x] Related notes

- Model selection (where multiple options exist).
- Maximum note length for AI operations.
- Confidence thresholds for tag/type suggestions.
- "Allow network model downloads" (off by default).

Settings are stored using the plugin settings API and can be backed up along with the vault.

---

## 11. Future Extensions

- **Conversation Mode**: a chat-like interface anchored to the current note or vault region.
- **Task Extraction**: parse checkboxes and convert to a structured task list.
- **Semantic Graph Augmentation**: generate semantic links ("similar to") in addition to manual wikilinks.
- **LLM Bridge**: optional integration with larger remote LLMs using the same UI, with explicit consent.

These features build on the same foundation of transformers.js-based local models and the plugin API; they can be layered on once the basic AI assistant is stable.
