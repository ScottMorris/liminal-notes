# TODO

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
