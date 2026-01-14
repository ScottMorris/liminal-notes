# Platform Support

Comparison of the desktop (Tauri) and mobile (Expo/React Native) apps. ✅ means shipped, ❌ means missing, and ⚠️ marks partial support with a note.

| Feature                | Desktop (Tauri)                                                                | Mobile (Expo)                                          | Notes                                                                            |
| ---------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Platform availability  | ✅ Windows and Linux bundles; macOS not supported                              | ⚠️ Android dev client; iOS not supported               | Desktop ships on Windows/Linux; mobile is Android-only.                          |
| Vault access           | ✅ User-picked vault folder remembered across sessions                         | ⚠️ Sandbox vault only; external folder via SAF planned | Desktop can open any local folder; mobile limits storage to its sandbox for now. |
| Markdown editor (CM6)  | ✅ Rich editor with preview toggle and keyboard shortcuts                      | ✅ WebView-based CM6 editor with toolbar               | Shared editor model; mobile omits split preview.                                 |
| Wikilinks & backlinks  | ✅ Link extraction with backlinks panel and graph integration                  | ⚠️ Links parsed and indexed; no backlinks UI yet       | Both index links; only desktop surfaces backlinks.                               |
| Search / quick open    | ✅ Global search modal with scoring                                            | ✅ Search screen backed by SQLite index                | Mobile search covers the active sandbox vault.                                   |
| File browsing          | ✅ File tree, tabs, create/rename/move                                         | ✅ Explorer plus Home (pinned, recents, folders)       | Both create notes/folders; desktop also supports multi-tab editing.              |
| Tags                   | ✅ Tag browser and tag-aware editing (frontmatter)                             | ✅ Tag chips, catalogue, and folder-derived tags       | Both persist tags in `.liminal/tags.json` and frontmatter.                       |
| Graph view             | ✅ Interactive graph of vault links                                            | ❌ Not implemented                                     | Planned later for mobile after core parity.                                      |
| Reminders              | ✅ Reminder panel, scheduling, snooze/done flows                               | ❌ Not available                                       | Desktop uses local notifications; mobile has no reminder surface yet.            |
| Spellcheck             | ✅ en-CA dictionary with per-vault custom words                                | ❌ Not available                                       | Spellcheck extension is desktop-only.                                            |
| AI assistant / plugins | ⚠️ Optional AI sidebar behind plugin flag; plugin host closed to third parties | ❌ Not present                                         | AI runs locally on desktop when enabled; mobile defers AI and plugins.           |
| Theming                | ✅ Light/dark, font size, native titlebar toggle                               | ✅ Paper-based theming aligned to shared variables     | Both honour shared theme variables; desktop adds titlebar/decoration controls.   |

## Desktop (Tauri)

- ✅ Local-first vault picker for any folder, with file tree navigation, tabs, create/rename/move, and Markdown preview.
- ✅ CodeMirror editor with wikilinks, backlinks panel, search modal, graph view, tag browser, reminders, spellcheck, and theming controls.
- ⚠️ Optional AI assistant sidebar (experimental) available when the ai-assistant plugin is enabled; external plugin host is not open yet.

## Mobile (React Native / Expo)

- ✅ Android development build with sandboxed vault, Home view (pinned, recents, folders), explorer, note/folder creation, and WebView-backed CodeMirror editor plus formatting toolbar.
- ✅ SQLite-backed search, wikilink parsing, tag chips and catalogue, and tag-aware saves that mirror desktop frontmatter behaviour.
- ⚠️ Links are indexed but there is no backlinks or graph surface yet.
- ⚠️ External folder access (SAF) is planned; iOS builds are deferred indefinitely and storage stays in the sandbox.
- ❌ Reminders, spellcheck, AI assistant, and graph view are not implemented on mobile.

## Parity Plan (usable mobile slice)

- **Vault access parity:** Ship Android SAF external-vault adapter, persist vault choice; revisit iOS Files-picker only if the platform resumes; backfill tests that mirror desktop vault operations (list/read/write/rename, nested folders).
- **Links surfaces:** Add mobile backlinks panel powered by the existing link index and a lightweight link graph view; share link resolution utilities with desktop to keep behaviour aligned.
- **Search & quick open:** Keep SQLite search but add quick-open entry points (home shortcut and header action), reusing desktop scoring defaults; harden indexing with schema tests.
- **Navigation & editing polish:** Support multi-note navigation affordances (recent list entries and deep links), add rename-safe route updates (already sketched) plus undoable deletes; keep editor protocol in sync with desktop CM6 options.
- **Reminders:** Port reminders core to React Native with local notifications, reuse reminder schema and storage layout, and gate behind a feature flag until stable.
- **Spellcheck (optional):** Evaluate embedding the en-CA dictionary with a per-vault custom list; if too heavy, expose a “no spellcheck” disclaimer in settings to keep user expectations explicit.
- **AI assistant & plugins (later):** Once the desktop AI sidebar stabilises, scope a mobile-local model runner; keep plugin host closed until a minimal, tested API surface exists.
