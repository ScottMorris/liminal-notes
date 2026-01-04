# TODO

## Future Improvements

### Mobile
- [ ] Add 'Enable Debug Logging' setting to Mobile app to control verbose Bridge and Vault logs.
- [ ] Jules: Update app to use _Paper_ for native-like UI elements. (Remove this item when done).
- [ ] Fix capitalization of entered text in editor (Android keyboard treating it as code/lowercase).

### Pinning
- [ ] Support manual reordering of pinned items.
- [ ] Add pin/unpin affordances inside note and folder views (not only on Home).
- [ ] Consider visual distinction between pinned notes vs pinned folders.

### Reminders
- [ ] Integrate `reminders-core` into mobile home “Focused” section.
- [ ] Define reminder → note navigation behaviour on mobile.
- [ ] Decide ordering rules when reminders and pinned items coexist.

### Performance & Data
- [ ] Cache derived folder activity to reduce repeated aggregation work.
- [ ] Add richer activity signals (e.g., unread, reminder inside folder).

## Font Management

- Replace build-time font download with a checked-in asset or a more robust font management strategy. The current implementation downloads `Noto Color Emoji` during the `postinstall` phase to avoid committing a large binary (~24MB) to the repository.

## Thoughts on Printing

We should consider adding a printing feature for notes.

### Potential Implementation

- Using `window.print()` might be the simplest first step, but it would need specific print CSS to hide the sidebar, header, and other UI elements, showing only the preview pane content.
- Alternatively, we could generate a PDF from the markdown content using a library like `jspdf` or by converting markdown to HTML and then to PDF in the backend (Rust).
- A specialized "Export to PDF" feature might be more valuable than raw printing.

### User Experience

- Shortcut: `Ctrl+P` is a standard convention for print, but in developer tools it is often "Quick Open". Since we freed up `Ctrl+P`, it is available for Print in the future.
- Users might expect to print just the rendered markdown, not the editor view.

### Next Steps

- Investigate Tauri's printing capabilities or recommended patterns.
- Draft a print stylesheet.

## Release & Packaging

- **Research Code Signing and Notarization requirements for Windows and macOS distribution.**
  - **macOS:** Research Apple Developer ID Application certificate costs ($99/year), notarization process using `xcrun notarytool`, and integration with Tauri action.
  - **Windows:** Research EV vs. Standard Code Signing certificates (DigiCert, Sectigo), costs (~$400/year for OV), and setting up Azure Key Vault for signing in CI.
- **Investigate automating version bumps and git tagging.**
  - Consider tools like `changesets` or `standard-version` to manage changelogs and automatic version bumping based on commit messages.
  - Explore building a release management TUI (e.g., using Ink) to simplify the interactive process of selecting versions and triggering builds.
  - Investigate using AI to generate release notes from commit messages or PR descriptions.
- Investigate setting up cross-compilation for Windows/macOS from Linux, or configuring GitHub Actions for multi-platform builds.
- Current Linux builds produce `.deb` and `.AppImage`.

## UI/UX Ideas

- Folders as implicit tags: Display folders in the UI with distinct colors and treat them as tags for the notes they contain.
- Format inline but don't hide the markdown syntax in the editor view (e.g., bold, italics). Eg. _rendered_ **markdown** `syntax` should still be visible in the editor, like VSCode.
- Replace native `<select>` with a custom dropdown component to ensure consistent theming across platforms, as native controls on Linux/Tauri often ignore CSS for dropdown menus.
- **Integrate Prettier:** Add support for Prettier, either auto or manual. Maybe it should be a plugin with a formatter hook.
- **Link preview pop-up:** Add a pop-up preview for WikiLinks on hover.

## Theming

- Consolidate all themes to use HSL color values for consistency and easier programmatic manipulation.
- **Shared Theme Definitions:** Refactor `apps/desktop/src/theme/themes.ts` into a shared package (`@liminal-notes/core-shared`) or a similar common location so that theme definitions can be consumed by both the desktop app and the mobile editor web bundle.

## Editor

- Verify if explicit theme reconfiguration is needed for CodeMirror when complex theme changes occur (currently relies on CSS variables updating automatically).
- Implement undo history reset when switching notes to prevent undoing into a previous note's content state.
- Refactor legacy `saveUnsavedTab` helper in `EditorPane.tsx`. It is currently kept for confirmClose logic but ideally should be routed through the command registry or a dedicated context to support non-active tabs.
- **CodeMirror WikiLinks:** Refactor WikiLink parsing to use a custom CodeMirror Markdown language extension instead of manual regex scanning for better performance and robustness.
- **Shared Editor Decorations:** Refactor desktop editor decorations (e.g., `markdownDecorations`, `frontmatterHider`) into `@liminal-notes/core-shared` or a similar shared location and integrate them into the mobile editor to achieve visual parity.

## Tab Persistence in Vault

Currently, unsaved tabs are stored in `localStorage` which means:
- They don't sync across devices
- They're browser-specific
- They're lost if localStorage is cleared

**Future improvement:**
- Store unsaved tabs in `.liminal/unsaved-tabs.json` within the vault
- This enables:
  - Cross-device sync (when sync is implemented)
  - Cross-platform access (desktop/mobile)
  - Backup via vault backup
  - Version control if vault is in Git

**Implementation notes:**
- Unsaved tabs should be in vault's `.liminal/` directory (gitignored by default)
- Format: JSON array of `{ id, title, content, createdAt, modifiedAt }`
- Load on vault open, save on change (debounced)
- Merge strategy for conflicts (last-write-wins for MVP)

## Editor Enhancements

- **Specialized Clipboard Support:** Add support for specialized clipboard formats (HTML, Image) via `clipboard-manager:allow-write-html`, `clipboard-manager:allow-write-image`, etc. Currently only plain text is supported.
- **Advanced Editing Commands:** Expose native CodeMirror commands in the Command Registry/Palette ([Reference](https://codemirror.net/docs/ref/#commands)):
  - Undo / Redo
  - Move Line Up / Down
  - Indentation commands (Tab / Shift+Tab) - [Details](https://codemirror.net/examples/tab/)
  - Toggle Comment (Ctrl+/) - Add to Context Menu
- **Editor Enhancements:**
  - **Multiple Selections:** Enable [`allowMultipleSelections`](https://codemirror.net/docs/ref/#state.EditorState^allowMultipleSelections).
  - **Tab Size:** specific config via [`tabSize`](https://codemirror.net/docs/ref/#state.EditorState^tabSize).
- **AI Features:**
  - **Thought Summarizer:** Highlight text and have AI summarize and insert it.
  - **Model Management:** Add settings UI to configure/manage downloaded AI models (view size, delete, etc).
  - **Embedding Optimization:** Implement caching (via local vector DB or file) for embedding generation to avoid re-calculating for unchanged notes.
  - **Dynamic Tag Generation:** Explore better AI models for open-ended tag generation.
    - **Xenova/t5-small (quantized)** (~95 MB): Text-to-text generative model (promptable).
    - **Xenova/flan-t5-small**: Instruction tuned.
    - **Keyphrase Extraction models** (DistilBERT-based).
    - Currently using Zero-Shot Classification (fast, restricted candidates).
- **Advanced Editing Commands:** Expose native CodeMirror commands in the Command Registry/Palette:
  - Undo / Redo
  - Move Line Up / Down
  - Add Cursor Above / Below (Multi-cursor)
  - Delete Line
  - Select Line
  - Duplicate Line

## File Explorer & Context Menu

- **Split View:** "Open to the right" support (requires window management architecture changes).
- **Multi-window:** "Open in new window" support (requires state sync across windows).
- **Bookmarks:** File bookmarking system.
- **Merging:** "Merge entire file with..." feature.
- **Version History:** Git-based or local history support.
- **Deep Links:** Support for `liminal://` protocol links to open specific notes/files.

## Known Issues

- **Window Buttons on Linux/GTK:** Window buttons (Minimize, Maximize, Close) are not clickable on initial launch when using `visible: false` in Tauri configuration. They become clickable after resizing the window. This is likely related to the interaction between the window state plugin's restoration logic and GTK window visibility.

## Reminders & Notifications

- **Quiet Hours Settings UI:** Implement a UI in the Settings modal to configure quiet hours (start/end times). Currently logic exists in planner but configuration is manual/JSON only.
- **Command Palette Entry Point:** Add a "Remind me..." command to the command palette (once implemented) or context menu.
- **Native Notification Actions:** Investigate supporting native desktop notification buttons (Snooze, Done) to avoid opening the app for quick actions.
- **Deep Linking:** Implement `liminal://` protocol support to allow external notifications/apps to open specific notes properly. Reference: https://v2.tauri.app/plugin/deep-linking/
- **Custom Controls:** Replace native date/time pickers with custom styled components for consistent behaviour and theming.

## Platform Integration

- **Linux Accent Color (Pro Mode):** The "Pro Mode" accent colour detection using `libadwaita` crate features (`v1_6`) requires system libraries (`libadwaita-1 >= 1.6`) which are not available in Ubuntu 24.04 (Noble). Currently, we use a `gsettings` CLI fallback.
  - **Task:** Upgrade the dev container and CI environment to a newer base image (e.g., Ubuntu 24.10+) once stable/available, or install updated libraries, to enable the `libadwaita` crate dependency for robust, native accent colour detection.
