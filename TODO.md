# TODO

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

- Investigate setting up cross-compilation for Windows/macOS from Linux, or configuring GitHub Actions for multi-platform builds.
- Current Linux builds produce `.deb` and `.AppImage`.

## UI/UX Ideas

- Folders as implicit tags: Display folders in the UI with distinct colors and treat them as tags for the notes they contain.
- Tabs for multiple open notes: Implement a tabbed interface to allow users to switch between multiple open notes easily.
- Format inline but don't hide the markdown syntax in the editor view (e.g., bold, italics). Eg. _rendered_ **markdown** `syntax` should still be visible in the editor, like VSCode.
- Replace native `<select>` with a custom dropdown component to ensure consistent theming across platforms, as native controls on Linux/Tauri often ignore CSS for dropdown menus.

## Theming

- Consolidate all themes to use HSL color values for consistency and easier programmatic manipulation.
