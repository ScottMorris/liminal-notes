# Contributing to Liminal Notes

Thanks for your interest in contributing to **Liminal Notes** 💚
This document is a quick guide for humans *and* code agents (AI tools) on how to work in this repo. For more detailed norms and project context, see **AGENTS.md** and the files in the `docs/` directory.

---

## 1. Project Overview

Liminal Notes is a **local-first, Markdown-based** note-taking app with:

* Plain `.md` files in a vault folder.
* `[[wikilinks]]` and backlinks between notes.
* A cross-platform desktop app built with **Tauri (Rust + TypeScript/React)**.
* A planned **plugin system** and optional **local AI assistants** (via `transformers.js`).

Early milestones focus on:

* Single vault.
* File tree sidebar.
* Markdown editing + preview.
* Wikilinks + backlinks.
* Simple search.

Future work adds plugins, AI assistant, and semantic links.

For a deeper overview, see:

* `docs/SPEC.md`
* `docs/ARCHITECTURE.md`
* `docs/MVP_APP.md`
* `docs/BUILD_PLAN.md`

---

## 2. Ground Rules

### 2.1 Code Style & Languages

* **Frontend:** TypeScript + React.

  * Use strict TypeScript; avoid `any` unless there is a clear reason.
* **Backend:** Rust (Tauri backend).

  * Encapsulate filesystem access, vault management, and Tauri commands in focused modules.

### 2.2 Commits

We use **Conventional Commits**. Examples:

* `feat: add vault picker dialog`
* `fix: handle empty vault config gracefully`
* `refactor: extract note loading hook`
* `chore: bump tauri and typescript`
* `docs: describe plugin permissions`

Commit subjects should be:

* **Imperative** ("add X", "fix Y").
* **Clear** and **atomic** (one logical change per commit).

For more detail, see `AGENTS.md` → *Commit Guidelines*.

### 2.3 Canadian English

Documentation, comments, and commit messages should follow **Canadian English** spelling where natural:

* colour, centre, licence (noun), organise, behaviour, favour, etc.

Code identifiers still follow platform conventions (`color` in CSS, etc.).
See `AGENTS.md` → *Canadian English Spelling*.

---

## 3. Getting Started

### 3.1 Prerequisites

You’ll likely need:

* Node.js (LTS)
* `pnpm`
* Rust toolchain (for Tauri)
* Tauri system dependencies (platform-specific)

Follow Tauri’s docs for platform setup if needed.

### 3.2 Installing & Running

From the repo root:

```bash
pnpm install
pnpm tauri dev
```

(If the Tauri app has not been scaffolded yet, see `docs/BUILD_PLAN.md` for the expected structure and tasks.)

### 3.3 Dev Container (VS Code)

If you use VS Code and Docker, you can open the repo in VS Code and use "Reopen in Container" to get a preconfigured environment with Node.js, pnpm, Rust, and Tauri dependencies. See `.devcontainer/devcontainer.json` for details.

Once the container is running, you can use the standard commands (e.g., `pnpm tauri dev`) from the integrated terminal.

---

## 4. Development Workflow

### 4.1 Where to Start

If you’re implementing core app features:

1. Read the relevant sections of:

   * `docs/MVP_APP.md`
   * `docs/ARCHITECTURE.md`
   * `docs/SPEC.md`
2. Check `docs/BUILD_PLAN.md` to see which milestone your work belongs to.
3. Open a branch named after the feature, e.g.:

   * `feat/vault-picker`
   * `feat/wikilinks-backlinks`
   * `feat/search-modal`

If you’re working on plugins or AI features:

* Start with:

  * `docs/PLUGIN_API.md`
  * `docs/plugins/LOCAL_AI_ASSISTANT_PLUGIN.md`
  * `docs/plugins/SEMANTIC_LINKS_PLUGIN.md`

### 4.2 Typical Flow

1. Create a feature branch.
2. Make small, focused commits.
3. Run the app regularly (`pnpm tauri dev`).
4. Keep docs aligned with behaviour:

   * If you change how something works, update the relevant doc in `docs/` in the same PR.
5. Open a PR with:

   * A short description of the change.
   * Any notable trade-offs or follow-up tasks.

---

## 5. Tests & Checks

Testing and linting will evolve, but the general expectations are:

* `pnpm lint` – static checks for frontend code (once configured).
* `pnpm test` – frontend tests (once configured).
* `cargo test` – Rust unit tests (as backend logic grows).

Please run whatever checks exist before opening a PR.

---

## 6. Documentation

The `docs/` directory is the backbone of the project:

* **Specs & architecture**

  * `docs/SPEC.md`
  * `docs/ARCHITECTURE.md`
  * `docs/MVP_APP.md`
  * `docs/BUILD_PLAN.md`
* **Extensibility**

  * `docs/PLUGIN_API.md`
  * `docs/plugins/LOCAL_AI_ASSISTANT_PLUGIN.md`
  * `docs/plugins/SEMANTIC_LINKS_PLUGIN.md`

When you change behaviour, it’s better to **adjust the spec** than let docs drift.

`AGENTS.md` gives extra detail on which docs to update for which kind of change.

---

## 7. Using AI / Code Agents

AI tools (like automated coding agents) are welcome, but:

* They should follow `AGENTS.md` and this `CONTRIBUTING.md`.
* Generated code should be:

  * Readable and idiomatic.
  * Strict TypeScript- and Rust-compatible.
* Please review AI-generated changes as if they came from a junior contributor:

  * Check types, error handling, comments, and alignment with the spec.

---

## 8. Issues & Feature Requests

If you’re opening an issue or proposing a feature:

* Describe the **problem** first, not just the solution.
* Reference relevant docs where possible (e.g., section in `MVP_APP.md` or `SPEC.md`).
* If it’s a larger feature, outline:

  * What milestone/phase it might belong to.
  * Any interactions with plugins or AI.

---

Thanks again for helping build Liminal Notes.
The goal is a notes system that feels like it’s working **with** you — contributors included. 🍁
