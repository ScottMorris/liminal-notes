# Tags

## Purpose

Tags provide a lightweight, user-controlled way to organize and retrieve notes across folders, search, and future graph-like views. Tags are designed to be:

* **Fast** to apply and remove
* **Portable** (stored in note files)
* **Extensible** (folder auto-tagging, AI suggestions, plugins)
* **Consistent** across desktop and mobile

---

## Goals

* Make tags easy to add/remove per note.
* Support **folder-derived auto-tags** that behave like helpful defaults (auto-add) without being destructive (no auto-remove).
* Support **AI tag suggestions** with explicit user approval, and optional per-tag auto-approval that can be revoked.
* Provide a **Tag Browser** view (alongside File Browser) for discovery and bulk operations.
* Keep tag assignments portable via frontmatter while maintaining fast UI via a rebuildable cache.

## Non-goals (MVP)

* Tag hierarchy via `/` (explicitly disallowed).
* Tag pages with long-form descriptions.
* Complex rule engines (e.g., “apply tag if note contains …”).
* Multi-vault/global tag syncing.

---

## Terminology

* **Tag ID**: canonical identifier used for storage and matching (lowercase kebab-case).
* **Display Name**: user-facing label for a tag (may contain spaces/case).
* **Tag Assignment**: a tag applied to a specific note.
* **Provenance**: metadata about how/why a tag was assigned (human/folder/AI).

---

## Tag Identity & Normalization

### Tag IDs

* Tag IDs are **lowercase kebab-case** (e.g., `winter-painting`).
* Tag matching is **case-insensitive**.
* `/` is **not allowed** in user-entered tags.

### Display Names

* Display names may include spaces and casing (e.g., `Winter Painting`).
* Display name defaults to a humanized form of the tag ID or the original folder segment casing.

### Input rules

* When a user types a new tag:

  * Normalize to Tag ID (kebab-case)
  * If the ID already exists, apply the existing tag
  * Otherwise create a new tag definition with defaults

---

## Tag Sources

Tags can be applied from multiple sources, but they all unify into the same tag identity (same Tag ID).

### Source types

* **Human**: user explicitly adds/removes tags.
* **Folder (implicit)**: derived from folder structure and auto-added to notes.
* **AI**: suggested based on title + content, applied only after approval (unless auto-approved).

### Unified projection

Folder-derived tags and manually created tags are not separate “namespaces”.

* If a folder segment derives the tag `dance`, and the user also manually adds `dance`, it is the same tag.
* This implies there are no collisions: there is one tag per Tag ID.

---

## Folder Auto-Tagging

Folder structure acts as an automatic tagging mechanism.

### Derivation rule

For a note located at:

* `root/A/B/C/note.md`

The note receives implicit tags for **all folder segments**:

* `A`, `B`, `C` (each normalized to Tag IDs)

### Nested folders

Nested folders always contribute tags all the way down from the vault root.

### Move/rename semantics

When a note path changes:

* The app **auto-adds** tags for the new folder segments.
* The app **does not auto-remove** tags from the old path.

Rationale: folder tags are intended as helpful auto-tagging, not a destructive mirror of the file tree.

### Explicit removal

Removing a tag from a note is always explicit:

* via the tag “x” in the note header
* via the per-note tag UI
* via bulk actions in Tag Browser

---

## AI Tagging

AI tags are optional and only available when the AI plugin is enabled.

### AI suggestions

* AI suggestions are derived from note **title + content**.
* Suggestions are shown to the user first; nothing is applied automatically without permission.

### Approval model

Two layers of approval exist:

1. **Per-note approval (required):** user chooses which suggested tags to apply to this note.
2. **Per-tag auto-approval (optional):** user can allow a specific tag to be auto-applied in the future when suggested.

### Revocation

Auto-approval can be revoked via Tag Management (Settings) and/or the Tag side panel.

Revocation stops future auto-applies. Optionally, user may also bulk-remove previously AI-applied instances.

### Triggering AI calculation

* AI suggestion calculation is triggered **on-demand** (e.g., when opening the Add Tag popover) and must not block UI.
* If enabled, suggestions stream in asynchronously (AI runs in a worker).
* Suggestions are cached per note revision to keep repeat opens fast.

---

## Desktop UI

### Tag bubbles beside the note title

* Tags render as **bubbles** to the right of the note title.
* Bubbles can be coloured (configured per tag).

Interaction:

* **Click bubble body:** navigate to Tag Browser filtered to that tag.
* **Click “x” on bubble:** remove tag from this note.

### Add Tag affordance

* If the note has tags: show a small **“+”** after the tag bubbles.
* If the note has no tags: show **“+ Add tag”** beside the title.

### Add Tag popover

The Add Tag popover is the primary per-note tag UI.

Requirements:

* Opens instantly and focuses an input field.
* Allows quick typing and adding with **Enter** (no extra dialogs).
* Shows filtered results while typing.

Sections:

* **Assigned** (current tags)
* **All tags** (filtered)
* **Suggested by AI** *(only if AI plugin enabled)*

  * Shows a loading state while suggestions compute
  * Shows confidence (optional UI)
  * Allows one-click apply

### Side panel: deeper operations

A side panel can provide richer per-note controls.

Proposed sections:

* **Tags on this note**

  * list tags
  * remove actions
  * optional provenance display

* **AI tagging** *(only if AI plugin enabled)*

  * suggestions list
  * apply buttons
  * per-tag auto-approval toggle
  * revoke auto-approval
  * optional bulk remove of AI-applied tags

---

## Tag Browser (Left Pane)

Tags are browsed from a dedicated view located where the File Browser lives.

### Navigation

* Left pane provides a toggle/tab: **Files | Tags**.

### MVP features

* Search input

* Tag list showing:

  * colour dot
  * display name
  * note count

* Clicking a tag shows matching notes (either in the left pane list or the main area’s results view, depending on layout).

### Tag actions (MVP)

* Rename display name
* Change colour
* Bulk remove tag from selected notes
* Remove tag from all notes
* Delete tag (with confirm)

---

## Settings: Tag Management

Tag Management lives in Settings.

### Tag list

* Shows all known tags
* Allows editing:

  * display name
  * colour
  * (future) aliases/synonyms

### AI controls

If AI plugin enabled:

* Per-tag auto-approval toggle
* Revocation controls
* Optional bulk remove of AI-applied instances

---

## Data Storage

Tags are stored in two layers: authoritative per-note storage and a rebuildable cache.

### Per-note (authoritative)

Store the canonical list of assigned tags in frontmatter:

* `tags:` is the authoritative list of Tag IDs assigned to the note.

Frontmatter is hidden from the editor surface (kept in the file).

### Provenance (durable, per-note)

Store provenance alongside tags under a namespaced key (shape may evolve):

* `liminal.tagMeta` maps `tagId -> { source, ... }`

Sources:

* `human`
* `folder`
* `ai`

Keep this minimal in MVP (timestamps/confidence optional).

### Tag catalogue (authoritative, vault-level)

A vault artefact stores tag definitions:

* `.liminal/tags.json`

  * `tagId -> { displayName, colour, createdAt, ... }`
  * AI auto-approval rules stored here (per-tag)

If a note references an unknown tag ID, the app treats it as “discovered” and creates a default definition.

### Index cache (non-authoritative, rebuildable)

A vault cache accelerates UI:

* `.liminal/tag-index.json`

  * tag -> note references and counts
  * note -> tag list (redundant)
  * fingerprints (mtime/size/hash) so only changed notes are re-parsed

Rules:

* Note files always win; cache is discarded/rebuilt per-note when fingerprints differ.
* Cache may include richer, temporary fields without affecting portability.

---

## Behavioural Rules

### Canonical truth

* A note’s frontmatter `tags:` is the source of truth for what tags are assigned.

### Writes

* `tags:` should be written in a stable order (sorted by tagId) to reduce diffs.
* `tagMeta` entries should be stable and minimal.

### Folder tagging updates

* On path change, folder-derived tags are added to `tags:` and recorded as `source: folder`.
* Old folder-derived tags remain until explicitly removed.

---

## Mobile

* Tag assignments must be compatible with mobile.
* UI will evolve, but the same core model applies:

  * per-note add/remove
  * tag browser view (later)
  * optional AI suggestions (later)

---

## Search and Filtering (MVP integration)

* Tags must be filterable in search queries (exact syntax TBD).
* Tag Browser provides a primary discovery mechanism independent of search.

---

## Acceptance Criteria (MVP)

* User can add/remove tags on a note quickly from the note header UI.
* Tags appear as coloured bubbles beside the note title.
* Clicking a tag navigates to Tag Browser filtered to that tag.
* Folder auto-tagging adds tags for all folder segments.
* Moving a note adds new folder tags and does not remove previous folder tags.
* Tag IDs are kebab-case; display names support spaces; `/` is rejected.
* Tags are stored in note frontmatter under `tags:`.
* Tag definitions (colour/display name) are stored in `.liminal/tags.json`.
* A rebuildable index exists at `.liminal/tag-index.json` for fast browsing.
* If AI plugin is enabled, the Add Tag popover shows an async “Suggested by AI” section.
* AI suggestions are never applied without approval (unless explicitly auto-approved per-tag).
* Auto-approval can be revoked.

---

## Future Ideas

* Tag aliases/synonyms and merge tools
* Tag pages (description, pinned notes)
* Saved searches / smart tag views
* Tag-based graph filters
* “Convert folder segment to preferred display name” tools
* Per-tag icons
