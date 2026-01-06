# LOCAL_TTS_PLUGIN.md – Core TTS “Read Aloud” Plugin (Kokoro)

## 1. Purpose & Scope

This document specifies a **first-party core plugin** for **Liminal Notes** that provides **local/offline Text-to-Speech (TTS)** for reading notes aloud.

The plugin provides:

* A **player UI** (play/pause/stop/seek, voice, speed)
* **Segment-level highlighting** of the currently spoken text in the editor/reader
* **Local model management** (install/remove/update)
* **Caching** of generated audio and metadata to make repeat playback cheap

The feature is **optional** and can be enabled/disabled from **Settings → Core plugins**.

This spec also defines a minimal **native Rust backend plugin format** required to ship TTS inference as a core plugin without running heavy inference in the WebView.

---

## 2. Goals

1. **Local-first**

   * No note text leaves the machine.
   * Works offline after model installation.

2. **Smooth UI**

   * TTS inference must not block the WebView.
   * Long notes must not freeze the app.

3. **Good reading experience**

   * Playback controls and scrubbing.
   * Visual tracking via highlighting.

4. **Practical performance**

   * Chunked synthesis.
   * Cache artefacts for fast replay.

5. **Plugin-shaped**

   * Toggleable, lifecycle-managed, with clear boundaries.

---

## 3. Non-goals (v0.1)

* Word-by-word timestamps / karaoke highlighting.
* SSML support.
* Multi-language beyond what the selected model supports by default.
* Mobile support.

---

## 4. UX Overview

### 4.1 Entry points

* Command Palette:

  * `Read Aloud: Play/Pause`
  * `Read Aloud: Stop`
  * `Read Aloud: Read Note`
  * `Read Aloud: Read Selection`
* Optional toolbar button in the editor header.

### 4.2 Player UI

A compact player bar (dockable at the bottom of the editor pane):

* Play/Pause
* Stop
* Seek bar (scrubbable)
* Time: `elapsed / total`
* Voice selector
* Speed control
* Status (installing/model missing/loading)

### 4.3 Highlighting behaviour

* While playing, highlight the currently spoken **segment**.
* On seek, highlight updates immediately.
* On stop/end, highlight clears.

---

## 5. Plugin Shape

The TTS plugin is a **hybrid core plugin**:

* **Frontend plugin** (WebView/React)

  * UI, playback, highlighting, commands, settings panel
* **Native backend plugin** (Rust)

  * model install, inference, chunking, caching, job control

Rationale: TTS inference is CPU-heavy and should run in Rust background workers rather than in the WebView.

---

## 6. Native Rust Backend Plugin Format (Core Plugins)

### 6.1 Motivation

The current plugin system supports:

* Frontend plugins in the WebView
* Backend plugins in a sandboxed JS runtime

For TTS we need a third option for **first-party, audited plugins**: a native Rust backend module that is still **toggleable** and **lifecycle-managed** like a plugin.

### 6.2 Manifest extension

Extend `manifest.json` `entrypoints` with an optional key:

* `backendNative`: string identifier for a registered Rust plugin implementation

Example:

```json
{
  "id": "core.tts",
  "name": "Read Aloud (TTS)",
  "version": "0.1.0",
  "minAppVersion": "0.1.0",
  "description": "Offline text-to-speech with playback controls and highlighting.",
  "author": "Core Team",
  "permissions": {
    "vault": true,
    "index": false,
    "graph": false,
    "filesystem": { "read": ["."], "write": [] },
    "network": { "allowed": false, "domains": [] }
  },
  "entrypoints": {
    "backendNative": "tts",
    "frontend": "ui.js"
  }
}
```

### 6.3 Rust lifecycle API

Define an internal trait used by **core** plugins:

* `id(): &'static str`
* `activate(ctx) -> ActiveHandle`
* `deactivate(handle)`

Activation occurs when:

* plugin is enabled in Settings
* app starts and plugin was enabled

Deactivation occurs when:

* plugin is disabled
* app shuts down

### 6.4 Command/event routing

Native plugins must be able to expose a small RPC surface to the frontend.

Two acceptable approaches:

A) **Scoped Tauri commands**

* Commands are registered under a plugin prefix (e.g., `plugin:core.tts/tts_start`).

B) **Command router**

* A single global Tauri command routes to plugins by `{ pluginId, method, payload }`.

Events:

* Plugins emit events namespaced by plugin ID (e.g., `plugin:core.tts/job_progress`).

### 6.5 Security model

* `backendNative` is **core-only** in v0.1 (not third-party).
* The only native plugins are those compiled into the app and registered in a static registry.
* Manifest permissions still apply to UI surfaces, and can be displayed to the user, but enforcement is primarily a code-level guarantee for core plugins.

---

## 7. TTS Plugin: Model, Voices, and Storage

### 7.1 Model format

* Kokoro ONNX model (or equivalent local model format).
* Voices file(s) providing speaker/style embeddings.

### 7.2 Storage locations

All plugin artefacts live under app data dir (cross-platform):

* `.../tts/models/` – model + voices + manifest/version
* `.../tts/cache/` – cached `wav` + segment metadata `json`
* `.../tts/tmp/` – temporary files during synthesis

### 7.3 Installation behaviour

* If the model is missing, the UI prompts: “Install speech model”.
* Install is a background job with progress.
* After install, plugin works offline.

---

## 8. Text Segmentation & Offset Preservation

### 8.1 Requirements

* Highlight ranges must map to the editor buffer exactly.
* TTS text should avoid reading Markdown punctuation.

### 8.2 Masking strategy

Given the editor buffer `text` (Markdown), produce `masked` of the **same length**:

* Replace Markdown syntax characters with spaces **without changing string length**.
* Keep the readable characters in place.

Then:

* Segment `masked` into speakable units (paragraphs/sentences).
* Each segment yields:

  * `startChar` / `endChar` offsets into the original buffer
  * `ttsText` = masked slice, whitespace-normalised

### 8.3 Long segments

* Enforce a max segment size (character-based guard; token-based optional).
* If a segment exceeds the limit, sub-split it while preserving offsets.

---

## 9. Audio Generation, Concatenation, and Timing

### 9.1 Generation

* Synthesis runs on background threads/tasks.
* Each segment produces a PCM buffer or a small WAV.

### 9.2 Concatenation

* Concatenate segments into a single WAV.
* Optionally insert a short silence gap between segments.

### 9.3 Timing metadata

Compute cumulative segment timings in the concatenated audio:

* `startMs`, `endMs` per segment

These are used by the frontend to map playback time → highlight range.

---

## 10. Caching

### 10.1 Cache key

Cache per:

* `textHash` (full note text or selected slice)
* `voiceId`
* `speed`
* `modelVersion`
* `pluginVersion`

### 10.2 Cache artefacts

* `${cacheKey}.wav`
* `${cacheKey}.json`

Metadata JSON includes:

```ts
{
  durationMs: number,
  voiceId: string,
  speed: number,
  modelVersion: string,
  segments: Array<{ startChar: number, endChar: number, startMs: number, endMs: number }>
}
```

### 10.3 Cache lifecycle

* Cache is reused if the key matches.
* UI offers “Clear TTS cache”.

---

## 11. Backend API Surface (for the frontend plugin)

All methods are namespaced under the plugin (exact routing depends on the chosen command routing approach).

### 11.1 Commands

* `getStatus() -> { installed: boolean, modelVersion?: string }`
* `installModel() -> { jobId }`
* `listVoices() -> Array<{ id: string, label: string }>`
* `start({ text, selection?, voiceId, speed }) -> { jobId }`
* `cancel({ jobId })`
* `clearCache()`

### 11.2 Events

* `job_progress`: `{ jobId, stage: 'download'|'segment'|'synth'|'concat'|'cache', progress01?: number }`
* `job_done`: `{ jobId, audioPath, durationMs, segments: [...] }`
* `job_error`: `{ jobId, message }`

---

## 12. Frontend Implementation Details

### 12.1 Playback

* Use a single `<audio>` element to play the concatenated WAV.
* Resolve `audioPath` to a playable URL via the Tauri file URL helper.

### 12.2 Highlight mapping

* On `timeupdate`, compute `currentMs` and find the segment whose `[startMs, endMs)` contains it.
* Apply an editor decoration for `[startChar, endChar)`.

### 12.3 Seeking

* When user scrubs, set `audio.currentTime`.
* Update highlight immediately based on new time.

### 12.4 Disable behaviour

When plugin is disabled:

* UI unregisters commands and hides the player.
* Backend cancels active jobs.
* Any active highlight is cleared.

---

## 13. Settings

Plugin settings section:

* Default voice
* Default speed
* Install/remove model (or “installed” state)
* Clear cache

---

## 14. Error Handling

* Model missing → prompt install.
* Install failure → show error + retry.
* Synthesis failure → surface a readable error, keep app responsive.
* Cancellation → no partial cache files.

---

## 15. Testing

### 15.1 Rust unit tests

* Segmentation produces valid, increasing offsets.
* Masking preserves length invariants.
* Cache key stability.
* Cancellation stops within bounded time.

### 15.2 Manual QA

* Short note; long note.
* Selection-only read.
* Rapid play/pause/seek.
* Disable plugin mid-generation.
* Restart app and verify cache replay.

---

## 16. Future Enhancements

* Word-level highlighting (forced alignment).
* Background pre-generation for the current note (opt-in).
* Pronunciation overrides and per-note voice settings.
