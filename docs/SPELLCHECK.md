# Spellcheck

## Purpose

Provide **offline, deterministic** spellchecking in Liminal Notes that behaves consistently across desktop (Tauri) and future mobile clients.

Goals:

* Same results across platforms (no OS/WebView dependence).
* Canadian English (**en-CA**) as the default language.
* Responsive editor experience (no typing lag).

## Scope

### In-scope

* Spellcheck underlines in the main editor.
* Suggestions for misspelled words.
* “Add to dictionary” and “Ignore word”.
* Settings to enable/disable spellcheck and choose a language.
* Per-vault persistence for user dictionaries and ignores.

### Out-of-scope (initial)

* Grammar checking.
* Mixed-language detection within a single note.
* Perfect Markdown parsing/tokenisation (we start with practical skipping rules and iterate).

## Design principles

* **Local-first:** no network calls required.
* **Deterministic:** bundled dictionaries produce consistent results.
* **Incremental:** process visible ranges first; avoid scanning the whole doc on every keystroke.
* **Extensible:** engine and UI are modular; support more languages later.

## User experience

### Underlines

* Misspellings are shown with a subtle wavy underline.
* Underlines should be viewport-scoped (only render what the user can see).

### Suggestions

* On misspelled word:

  * Context menu shows top suggestions (e.g., up to 5).
  * Options:

    * Replace with suggestion
    * Add to personal dictionary
    * Ignore word

### Behaviour rules

Defaults (configurable later):

* Ignore ALL CAPS words.
* Ignore words containing numbers.
* Ignore single-letter “words” (except `a`, `I` if language rules allow).

## Settings

Located in Settings Modal → **Editor → Spellcheck**.

### Fields

* **Enable spellcheck** (boolean)
* **Language** (dropdown)

  * Default: `en-CA`
  * Future: `en-US`, `en-GB`, etc.
* **Personal dictionary management**

  * Add/remove words
  * Optional: import/export as plain text

### Storage

Per-vault, to ensure portability/sync with vault contents.

Recommended layout:

* `.liminal/spellcheck/`

  * `personal.en-CA.txt`
  * `ignore.en-CA.txt`

Notes:

* Store one word per line.
* Normalise to Unicode NFC.
* Case handling:

  * Store canonical lower-case form by default.
  * Preserve exact entry as typed for display (optional).

## Technical architecture

### Components

1. **Spellcheck engine**

   * Runs fully offline.
   * Default approach: Hunspell-compatible engine (JS) using bundled dictionaries.

2. **Spellcheck worker**

   * Runs spell operations off the main UI thread.
   * Receives:

     * document version
     * visible text ranges
     * settings (language, ignore rules)
     * personal dictionary and ignore sets
   * Returns:

     * misspelling ranges + suggestions

3. **Editor integration (CodeMirror 6)**

   * CM6 extension renders misspellings via decorations.
   * Listens to viewport and document changes.
   * Debounces updates during typing.

### Worker message protocol

Requests (main → worker):

* `init` (load language, load dictionaries)
* `checkRanges`

  * `{ docVersion, ranges: [{from,to,text}], language, config }`
* `addPersonalWord` `{ word, language }`
* `removePersonalWord` `{ word, language }`
* `ignoreWord` `{ word, language }`
* `unignoreWord` `{ word, language }`

Responses (worker → main):

* `ready` `{ language }`
* `results` `{ docVersion, misspellings: [{from,to,word,suggestions}] }`
* `error` `{ message, details? }`

### Performance strategy

* Only check **visible ranges** (plus a small buffer above/below the viewport).
* Debounce checks after edits (e.g., 150–300ms), with cancellation on new edits.
* Cache results per document version to avoid redundant re-checks.
* Avoid re-loading dictionaries frequently; keep them resident in the worker.

## Text masking and tokenisation

We should avoid spellchecking:

* fenced code blocks
* inline code
* URLs
* wikilinks / note link syntax
* frontmatter keys

Initial implementation can use heuristic masking; later improvements can become syntax-tree-aware.

## Dictionary strategy

### Bundled dictionaries

* Bundle `en-CA` as the default.
* Ship dictionaries with the app; do not depend on OS dictionaries.

### Adding languages (future)

* Make languages pluggable:

  * each language = `{ aff, dic, metadata }`
* Consider lazy-loading dictionaries as needed.

## Licensing and attribution

* Ensure dictionary licensing requirements are met.
* Include required notices in the repository and distributed app artifacts.

## Acceptance criteria

* Spellcheck can be enabled/disabled via settings.
* With spellcheck enabled, misspellings in visible text are underlined.
* Context menu provides suggestions and add/ignore actions.
* Personal dictionary persists per vault and affects results immediately.
* No noticeable typing lag on typical note sizes.

## Open questions

* How should spellcheck behave inside titles vs body text?
* Should ignore/personal dictionaries be per-language and/or global per-vault?
* Should we support per-note language override in frontmatter?
