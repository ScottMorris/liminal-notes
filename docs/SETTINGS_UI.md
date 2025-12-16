## Goal

Implement the **Desktop Settings Modal (MVP slice)** for Liminal Notes.

### Scope

This document **is** the authoritative specification for the Desktop Settings Modal (MVP).

It defines:

* layout and navigation
* supported control types
* data model and schema
* MVP scope and explicit non-goals
* acceptance criteria

Desktop-only. Mobile renderer is out of scope.

---

## UX Overview

### Settings Modal Shell

* Modal (or dedicated window) with:

  * **Left navigation sidebar** (fixed width)
  * **Right content pane** (scrollable)
* Close affordance in the top-right (X)
* `Esc` closes the modal
* Content pane scrolls independently of nav

### Navigation

* Left sidebar contains **grouped sections**:

  * Group header: `Options`

    * `General`, `Editor`, `Files and links`, `Appearance`, `Hotkeys`
  * Group header: `Core plugins`

    * `Backlinks`, `Canvas`, `Command palette`, `Daily notes`, `File recovery`, `Note composer`, `Page preview`, `Quick switcher`, …
  * Group header: `Community plugins`
* Active section is highlighted
* Clicking a section swaps the right pane content

---

## Right Pane: Content Model

The right pane is composed of **groups** and **rows**.

### Group

* Optional title (e.g., `Display`, `Font`, `Interface`)
* Divider line above/below group
* Contains one or more setting rows

### Row (SettingRow)

**Invariant structure**:

* Left column: label + optional description
* Right column: one or more controls (right-aligned)

Row must support **multiple controls** (e.g., dropdown + button; toggle + icon buttons)

---

## Supported Control Types (Desktop)

Implement these as reusable components used by the settings renderer.

1. **ToggleSwitch** (boolean)

* Right-aligned
* Immediate apply

2. **SelectDropdown** (enum)

* Compact dropdown button style
* Immediate apply

3. **TextInput** (string)

* Right-aligned text field
* Supports placeholder (e.g., `Example: folder/note`)
* Apply on blur + Enter

4. **NumberInput** (number)

* Right-aligned numeric field
* Supports min/max/step
* Apply on blur + Enter

5. **Slider** (number)

* Used for font size
* Applies live while dragging

6. **ActionButton**

* Right-aligned button
* Triggers a secondary modal or action
* Two intents:

  * normal (e.g., `View`, `Manage`)
  * destructive (e.g., `Clear`) with confirmation

7. **IconButton**

* Used in rows like plugin list: gear/settings, plus/add
* Tooltip on hover

8. **ComputedText** (read-only)

* Inline, muted, derived from setting value (e.g., date preview)

9. **SearchFilterInput** (section-level)

* Used above collections (plugins list, hotkeys list)
* Filters list items by text

10. **CollectionList** (managed entity list)

* Special-case renderer for:

  * core plugins list
  * hotkeys list
* Each row is an entity with embedded controls

---

## Scope (In Scope)

This section matches the MVP slice tracked by the GitHub issue.

### 1) Modal Shell

* Two-pane layout (nav + scrollable content)
* Close via X and Esc

### 2) Declarative Settings Renderer

* Settings UI is rendered from a schema (no per-section bespoke layout)
* Supports:

  * section groups
  * setting groups
  * rows
  * **composite rows** (multiple controls on one row)

### 3) Core Control Components (Desktop)

Implement reusable components:

* ToggleSwitch (boolean)
* SelectDropdown (enum)
* TextInput (string)
* NumberInput (number)
* Slider (number)
* ActionButton (normal + destructive)
* IconButton
* ComputedText (read-only)
* SearchFilterInput (section-level)
* CollectionList (plugins, hotkeys)

### 4) Initial Sections (Validation Set)

Implement enough sections to exercise the system end-to-end:

#### A) Editor

Example rows:

* `Always focus new tabs` (toggle)
* `Default view for new tabs` (select)
* `Default editing mode` (select)
* `Readable line length` (toggle)
* `Show line numbers` (toggle)

#### B) Appearance

Must include at least one example of each:

* `Base colour scheme` (select)
* `Accent colour` (colour picker OR placeholder ActionButton)
* `Font size` (slider)
* `Quick font size adjustment` (toggle)

#### C) Core plugins

Collection list with:

* Search input
* Rows: plugin name + description + controls
* Controls per plugin row:

  * Toggle enable/disable
  * Optional gear (open plugin settings section)
  * Optional plus (plugin-specific add action; can be stubbed)

#### D) Hotkeys

Collection list with:

* Search input
* Rows: command name + current binding pill + add button
* Binding editor can be stubbed (open placeholder modal)

---

## Out of Scope (Explicit)

* Mobile layout or renderer
* Plugin marketplace / downloads
* Full hotkey recording UX (advanced recorder)
* Multi-vault or per-editor scope
* Permission prompts
* Theme editor UI (settings UI should *consume* theme tokens only)

---

## Data + Persistence

### Settings store

* Use a single settings store interface with:

  * `get(key)`
  * `set(key, value)`
  * `subscribe(key | prefix, callback)`

### Scope

For desktop MVP, implement **global scope only**.

* (Vault/editor scopes can come later)

### Storage

* Persist in app config (Tauri) or a JSON file under app data.
* Ensure settings load at app start and settings UI reflects current values.

---

## Declarative Schema (Recommended)

Implement settings UI from a schema so it is easy to extend and plugin-friendly later.

```ts
type SettingKind =
  | "boolean"
  | "select"
  | "string"
  | "number"
  | "slider"
  | "action"
  | "computed"
  | "collection";

interface SettingRowDef {
  key: string;
  kind: SettingKind;
  label: string;
  description?: string;

  // kind-specific fields
  options?: { value: string; label: string }[];
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  intent?: "normal" | "danger";
  controls?: SettingControlDef[]; // for composite rows
}

interface SettingsGroupDef {
  id: string;
  title?: string;
  rows: SettingRowDef[];
}

interface SettingsSectionDef {
  id: string;
  title: string;
  groups: SettingsGroupDef[];
}
```

Renderer:

* `SettingsModal` renders nav + section content
* `SettingsSection` renders groups
* `SettingRow` renders label/description + one or more controls

---

## Behaviour Rules

* Toggles/selects: apply immediately
* Text/number inputs: apply on blur and Enter
* Slider: apply live while dragging
* Destructive actions:

  * always confirm
  * use a separate confirmation modal

---

## Acceptance Criteria

* Settings modal opens and closes reliably
* Navigation switches sections without reload
* All listed control types render and function
* Settings apply immediately where specified
* Settings persist across app restarts
* Core plugins and hotkeys render via CollectionList views
* UI uses theme tokens (no hard-coded colours)
* Adding a new setting requires **schema changes only**, not layout code

---

## Styling + Theming (Desktop)

* Respect theme tokens (no hard-coded colours):

  * background, border, text, muted, accent
* Consistent spacing scale
* Row height should accommodate label + description
* Right controls aligned; allow multiple controls without wrapping if possible

---

## Implementation Notes / Suggested Tasks

1. Build `SettingsModalShell` (nav + scroll pane)
2. Build schema + renderer pipeline
3. Implement core control components
4. Implement the validation set sections (Editor, Appearance, Core plugins, Hotkeys)
5. Wire persistence into app config
6. Add keyboard support:

   * `Esc` closes modal
   * `Cmd/Ctrl+F` focuses filter when in a collection section

---

## Implementation Notes / Suggested Tasks

1. Build `SettingsModalShell` (nav + scroll pane)
2. Build schema + renderer pipeline
3. Implement core control components
4. Implement the validation set sections (Editor, Appearance, Core plugins, Hotkeys)
5. Wire persistence into app config
6. Add keyboard support:

   * `Esc` closes modal
   * `Cmd/Ctrl+F` focuses filter when in a collection section

---

## Non-goals (for this slice)

(Kept in sync with Out of Scope above.)

* Mobile renderer
* Plugin marketplace
* Full hotkey recorder UX
* Multi-vault/per-editor scope
* Permission prompts
