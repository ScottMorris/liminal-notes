# AGENTS.md – Liminal Notes

This file is for human contributors _and_ code agents (like AI coding tools) working on **Liminal Notes**.

It defines commit practices, working tips, and project-specific notes so changes stay coherent and easy to reason about over time.

---

## Commit Guidelines

- Use the **Conventional Commits** spec for all commits.
- Write commit messages in the **imperative mood**:

  - ✅ `feat: add vault picker dialog`
  - ✅ `fix: handle missing note file gracefully`
  - ❌ `fixed bug with vault picker`
  - ❌ `adds new feature`

- Make commit subjects **clear and descriptive** of the actual change.
- Include a commit body when:

  - There is non-obvious reasoning or trade-offs.
  - You are touching multiple areas that need extra context.

- Keep commits **atomic**:

  - Each commit should represent one logical change or a tightly related cluster of changes.
  - Avoid mixing refactors, new features, and unrelated fixes in one commit.

Examples:

- `feat: add markdown preview pane`
- `fix: prevent crash when vault path is missing`
- `refactor: extract note loading into hook`
- `chore: bump tauri and typescript versions`
- `docs: document plugin permissions model`

---

## Tips for Agents & Contributors

- **Sync docs with behaviour**:

  - When you change how something works, update the relevant docs in the same PR/commit set.
  - Do not leave `SPEC.md` and implementation out of sync.

- **Prefer small, focused PRs/branches**:

  - Implement one milestone slice at a time (e.g., “vault picker and file tree” before “search”).

- **TypeScript everywhere on the frontend**:

  - No loose `any` unless explicitly justified.
  - Keep strict mode on and satisfy the compiler instead of suppressing warnings.

- **Rust in the backend**:

  - Encapsulate filesystem access, vault management, and Tauri commands in clear modules.
  - Aim for small, composable functions and descriptive types.

- **Tests & checks** (to be fleshed out later, but aim towards):

  - `pnpm lint` – static checks for TS/React (when configured).
  - `pnpm test` – unit/integration tests.
  - `cargo test` in `src-tauri` when Rust code becomes more substantial.

- **Run the app frequently**:

  - `pnpm tauri dev` (or equivalent) should be used often while iterating.

- Avoid over-engineering in MVP stages:

  - Follow `MVP_APP.md` and `BUILD_PLAN.md` — favour getting a thin, working slice before introducing the full core engine or plugin host.

---

## Project Notes

### Core Intent

Liminal Notes is:

- A **local-first**, Markdown-only note app.
- Focused on:

  - a single vault folder on disk
  - `[[wikilinks]]` + backlinks
  - fast editing and simple search.

- Designed from the start to grow into:

  - a plugin-enabled PKM platform
  - with an optional local AI assistant (via transformers.js).

### Current Constraints (MVP Phase)

- **Single active vault**:

  - There is only one configured vault at a time in early milestones.

- **Simple indexing**:

  - Link and search indexes are in-memory and straightforward.
  - Optimised Rust-based indexing can come later.

- **No plugin host yet**:

  - Until Milestone 6, all behaviour is core logic.

- **No AI behaviour yet**:

  - AI assistant is designed, but the first implementation should land _after_ MVP is stable.

### Docs to Keep Aligned

When changing core behaviour, check whether any of these need updates:

- `README.md`
- `docs/SPEC.md`
- `docs/ARCHITECTURE.md`
- `docs/MVP_APP.md`
- `docs/PLUGIN_API.md`
- `docs/AI_PLUGIN_DESIGN.md`
- `docs/BUILD_PLAN.md`

When plugin or AI behaviour changes, also review:

- `plugins/core.ai-assistant/manifest.json`
- `plugins/core.ai-assistant/main.ts` (backend)
- `plugins/core.ai-assistant/ui.tsx` (frontend)

(Names above represent the _intended_ TS-based layout for the AI plugin once it exists.)

---

## Agent Workflows

### For Repo-Setup / Scaffold Tasks

When creating or modifying project scaffolding (Tauri, React, Rust crates, workspace config):

- Respect the layout described in `docs/BUILD_PLAN.md`.
- Keep all JavaScript/TypeScript code strictly typed.
- Prefer generating React + TS components under `apps/desktop/src/`.
- Ensure Tauri commands are defined in Rust and exposed with clear, typed wrappers in TS.

### For Feature Work

When working on a feature (e.g., vault picker, file tree, editor, search):

1. Read the relevant section in:

   - `docs/MVP_APP.md`
   - and/or `docs/SPEC.md` / `docs/ARCHITECTURE.md`.

2. Make a small plan in the PR/branch description (bullets are enough).
3. Implement changes in small, coherent commits.
4. Add or update tests when possible.
5. Update docs that describe the behaviour.

### For AI / Plugin Work

When touching anything related to plugins or AI:

- Treat `docs/PLUGIN_API.md` and `docs/AI_PLUGIN_DESIGN.md` as the source of truth.
- Keep the plugin API surface **minimal and stable**; prefer adding new methods over changing existing signatures.
- Any AI-related network use must be **explicitly configurable** and off by default.

---

## Canadian English Spelling

Documentation, code comments, commit messages, and variable names should use Canadian English spelling where natural in prose:

- colour
- centre
- licence (noun)
- organise
- behaviour
- favour

Code identifiers should still respect platform and ecosystem conventions:

- CSS uses `color`, `center`.
- Web APIs and libraries are not renamed.

When in doubt, follow the existing local patterns in the file you are editing.
