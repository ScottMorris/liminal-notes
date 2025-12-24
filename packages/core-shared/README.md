# @liminal-notes/core-shared

Shared logic and types for Liminal Notes (Desktop & Mobile).

## Usage

This package uses direct imports to avoid barrel files.

```ts
import { parseWikilinks } from '@liminal-notes/core-shared/wikilinks';
import { parseFrontmatter } from '@liminal-notes/core-shared/frontmatter';
import type { NoteId } from '@liminal-notes/core-shared/types';
```

## Requirements

### Buffer Polyfill

The frontmatter helpers (`src/frontmatter.ts`) rely on `gray-matter`, which uses `Buffer`.
Consumers running in environments without a native `Buffer` (like React Native or the Browser) **must provide a global polyfill** before importing these helpers.

Example (React Native / Browser):
```ts
import { Buffer } from 'buffer';
global.Buffer = global.Buffer || Buffer;
```
