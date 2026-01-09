Liminal Notes – TTS Follow-up Notes (current session)

State
- JS/worker TTS path removed: SharedArrayBuffer/crossOriginIsolation blockers made onnxruntime-web unusable in the WebView. All UI now targets the Rust Kokoro engine only.
- Rust engine uses kokoro-v1.0.onnx (full precision) + voices.bin (validated size checks). WAV output stays 16-bit PCM.
- Added Rust-side text sanitisation (normalize quotes, dashes, ellipses, CJK punctuation) before synthesis to reduce odd phoneme artefacts. The “while/wild” artefact still reproduces on some samples; root cause unresolved.
- Settings hide plugin sections when a plugin is disabled. Speed defaults to 1.0 if unset.
- Maintenance actions (install, remove, clear cache, import local) now refresh cache stats automatically after completion.

What to try next on the Rust engine
- Gather a minimal offending sample that still injects “while”-like artefacts and compare raw phoneme output; consider tightening sanitisation (e.g., collapsing double spaces, stripping bracketed metadata).
- Add a short silence or punctuation normalization per sentence to see if artefacts are alignment-related.
- If artefacts persist, consider testing kokoro-v1.0.int8.onnx (lower quality but different quantization) to see if the issue is model-dependent.

Model/cache locations (desktop)
- Model dir: ~/.local/share/ca.liminal-notes.desktop/tts/models (contains kokoro-v1.0.onnx and voices.bin).
- Cache dir: ~/.local/share/ca.liminal-notes.desktop/tts/cache

Recently changed files
- apps/desktop/src-tauri/src/plugins/tts/mod.rs (sanitisation, model handling)
- apps/desktop/src/plugins/core.tts/index.ts (settings/actions, cache refresh, defaults)
- apps/desktop/src/plugins/core.tts/useTts.ts, ttsEngines.ts, types.ts (Rust-only flow)
- apps/desktop/src/components/Settings/schemas.ts, SettingsModal.tsx (hide settings when plugin disabled)

Deferred/removed
- JS Kokoro/Transformers path and worker assets/deps removed due to SAB/COOP-COEP limits in the WebView.

Next revisit checklist
- Reproduce artefact with a minimal text sample and log the exact spoken output.
- Inspect sentence segmentation and sanitised text per chunk.
- Decide whether to try an alternative engine build (non-threaded ORT or different Kokoro quantization) if sanitisation doesn’t solve it.
