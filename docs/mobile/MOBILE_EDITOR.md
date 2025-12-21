# MOBILE_EDITOR — Mobile Editor Specification

This document specifies the mobile editor subsystem for Liminal Notes. It defines how CodeMirror 6 is hosted inside a WebView, how it communicates with the React Native application, and how editor state, persistence, and navigation are coordinated.

This spec is intentionally narrow in scope. It does not describe the full mobile application, only the editor and its integration contract.

This document lives under `docs/mobile/` and is referenced by `MOBILE_SPEC.md`.

---

## 1. Goals

The mobile editor must:

* Provide editing behaviour equivalent to the desktop editor where possible
* Share the same conceptual editor model as desktop (CM6)
* Be deterministic, debuggable, and testable in headless environments
* Support incremental parity growth without breaking compatibility

The editor is not responsible for file I/O, indexing, or navigation logic.

---

## 2. Non‑Goals (v0.x)

The following are explicitly out of scope for the initial mobile editor:

* Public plugin APIs
* Third‑party editor extensions
* Rich preview / WYSIWYG Markdown rendering
* Collaborative editing
* Advanced IME tuning beyond platform defaults

---

## 3. High‑Level Architecture

The editor subsystem is split into three components:

1. **Editor Host (React Native)**

* Owns note identity and lifecycle
* Owns persistence and dirty‑state policy
* Owns navigation and link resolution

2. **Editor Guest (WebView)**

* Owns CodeMirror 6 instance
* Owns cursor, selection, decorations, and transactions
* Emits deterministic editor events

3. **Editor Bridge**

* Typed message protocol over `postMessage`
* Versioned and schema‑validated

The editor guest never directly accesses the filesystem or application state.

---

## 4. Packaging Model

The editor guest is packaged as a static web bundle.

Directory layout:

```
apps/mobile/editor-web/
  src/
  build/
  index.html
```

Build output:

* A single HTML entry point
* Bundled JS/CSS assets

The React Native app loads the bundle locally via WebView (Expo-compatible asset URI).

---

## 5. Lifecycle

### 5.1 Initialization Sequence

1. WebView loads editor bundle
2. WebView sends `editor/ready`
3. React Native responds with `editor/init`
4. React Native sends `doc/set`

Editor must not accept document mutations before initialization completes.

### 5.2 Document Switching

When switching notes:

* RN sends `doc/set` with a new `docId` and text
* Editor resets revision counter
* Editor emits subsequent `doc/changed` events for the new doc

---

## 6. Message Protocol

### 6.1 Envelope

All messages use the same JSON envelope:

```json
{
  "v": 1,
  "id": "uuid",
  "kind": "cmd | evt | ack | err",
  "type": "namespace/action",
  "payload": {}
}
```

Unknown message types must be ignored and logged.

---

## 7. Commands (RN → WebView)

### 7.1 editor/init

Initializes the editor environment.

Payload:

```json
{
  "platform": "android | ios",
  "readOnly": false,
  "theme": { "name": "default", "vars": {} },
  "featureFlags": { "links": true }
}
```

---

### 7.2 doc/set

Loads a document into the editor.

Payload:

```json
{
  "docId": "string",
  "text": "string",
  "selection": { "anchor": 0, "head": 0 }
}
```

---

### 7.3 request/state

Requests editor state from the WebView.

Payload:

```json
{
  "requestId": "string",
  "include": ["text", "selection", "scroll"]
}
```

---

## 8. Events (WebView → RN)

### 8.1 editor/ready

Signals that the editor bundle is loaded.

Payload:

```json
{
  "protocolVersion": 1,
  "capabilities": {
    "links": true,
    "selection": true
  }
}
```

---

### 8.2 doc/changed

Signals a document mutation.

Payload:

```json
{
  "docId": "string",
  "revision": 42,
  "change": {
    "from": 10,
    "to": 10,
    "insertedText": "abc"
  }
}
```

The editor increments `revision` monotonically per document.

---

### 8.3 link/clicked

Emitted when a link is activated.

Payload:

```json
{
  "docId": "string",
  "kind": "wikilink | url | file",
  "href": "string",
  "text": "string"
}
```

---

### 8.4 request/response

Response to a `request/state` command.

Payload:

```json
{
  "requestId": "string",
  "state": {
    "text": "string"
  }
}
```

---

## 9. Dirty State & Saving

The editor itself is stateless with respect to saving.

Rules:

* WebView maintains only `revision`
* RN tracks `lastSavedRevision`
* Dirty = `revision > lastSavedRevision`

Saving flow:

1. RN requests current text
2. RN writes to vault
3. RN updates `lastSavedRevision`

Autosave is implemented in the RN host.

---

## 10. Error Handling

* Protocol errors must emit `err/*` messages
* Invalid commands must be ignored safely
* Editor crashes should not corrupt persisted state

---

## 11. Testing Strategy

* Schema validation for all messages
* Unit tests for bridge encoding/decoding
* Mocked WebView tests for editor host logic

Manual device testing is required for:

* Keyboard behaviour
* Selection and scrolling fidelity

---

## 12. Evolution Rules

* Message protocol changes must be versioned
* Backward compatibility should be preserved where reasonable
* All breaking changes must be documented here

---

End of document.
