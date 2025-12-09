# Liminal Notes

Liminal Notes is a local-first, Markdown-based note-taking app inspired by tools like Obsidian.

It aims to:

- Store notes as plain `.md` files in a folder (a “vault”).
- Support `[[wikilinks]]` and backlinks between notes.
- Run as a desktop app on Linux, Windows, and macOS using **Tauri**.
- Use **TypeScript** for all application code on the frontend and plugin side.
- Use **Rust** for the backend core (vault access, indexing, etc.).
- Eventually support an extensible plugin system and a local AI assistant powered by **transformers.js**.

The first milestones focus on:

- Single-vault support.
- File tree sidebar.
- Markdown editing + preview.
- Wikilinks + backlinks.
- Simple search.

Future milestones add:

- Plugin host.
- Local AI assistant plugin (summaries, tag suggestions, classification, related notes).

See the `docs/` folder for architecture and build plans.
