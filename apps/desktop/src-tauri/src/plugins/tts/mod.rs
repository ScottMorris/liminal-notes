use super::traits::{NativeBackendPlugin, NativePluginContext, ActivePlugin, Invocable};
use serde_json::Value;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::Mutex;
use std::future::Future;
use std::pin::Pin;
use tauri::{Runtime, Manager};
use std::path::{Path, PathBuf};
use kokoro_tts::{KokoroTts, Voice};
use hound::{WavSpec, WavWriter};
use sha2::{Sha256, Digest};
use unicode_segmentation::UnicodeSegmentation;
use futures::StreamExt;
use tokio::io::AsyncWriteExt;
use base64::Engine;

pub struct TtsPlugin;

impl<R: Runtime> NativeBackendPlugin<R> for TtsPlugin {
    fn id(&self) -> &'static str {
        "core.tts"
    }

    fn activate(&self, ctx: NativePluginContext<R>) -> Result<ActivePlugin, String> {
        let app_data_dir = ctx.app_handle.path().app_data_dir().map_err(|e| e.to_string())?;
        let tts_dir = app_data_dir.join("tts");
        std::fs::create_dir_all(&tts_dir).map_err(|e| e.to_string())?;

        Ok(ActivePlugin {
            instance: Arc::new(TtsInstance::new(tts_dir)),
        })
    }

    fn deactivate(&self, _handle: ActivePlugin) -> Result<(), String> {
        Ok(())
    }
}

pub struct TtsInstance {
    tts_dir: PathBuf,
    engine: Arc<Mutex<Option<KokoroTts>>>,
    cancel_flag: Arc<AtomicBool>,
    install_progress: Arc<Mutex<InstallProgress>>,
}

const MODEL_FILENAME: &str = "kokoro-v1.0.onnx";
const VOICES_FILENAME: &str = "voices.bin";

#[derive(Clone, Default)]
struct InstallProgress {
    status: String,
    phase: String,
    downloaded_bytes: u64,
    total_bytes: u64,
}

async fn set_install_progress(
    progress: &Arc<Mutex<InstallProgress>>,
    status: &str,
    phase: &str,
    downloaded_bytes: u64,
    total_bytes: u64,
) {
    let mut guard = progress.lock().await;
    guard.status = status.to_string();
    guard.phase = phase.to_string();
    guard.downloaded_bytes = downloaded_bytes;
    guard.total_bytes = total_bytes;
}

fn check_model_files(tts_dir: &Path) -> Result<(), String> {
    let model_path = tts_dir.join("models").join(MODEL_FILENAME);
    let voices_path = tts_dir.join("models").join(VOICES_FILENAME);
    let model_meta = std::fs::metadata(&model_path)
        .map_err(|_| "Model file missing".to_string())?;
    let voices_meta = std::fs::metadata(&voices_path)
        .map_err(|_| "Voices file missing".to_string())?;

    // Guard against partial or HTML downloads.
    if model_meta.len() < 200_000_000 {
        return Err("Model file looks incomplete; please reinstall the TTS model.".to_string());
    }
    if voices_meta.len() < 20_000_000 {
        return Err("Voices file looks incomplete; please reinstall the TTS model.".to_string());
    }

    Ok(())
}

fn clear_cache_files(tts_dir: &Path) -> Result<Value, String> {
    let cache_dir = tts_dir.join("cache");
    if cache_dir.exists() {
        std::fs::remove_dir_all(&cache_dir).map_err(|e| e.to_string())?;
    }
    Ok(serde_json::json!({ "status": "cache_cleared" }))
}

fn remove_model_files(tts_dir: &Path) -> Result<Value, String> {
    let model_dir = tts_dir.join("models");
    if model_dir.exists() {
        std::fs::remove_dir_all(&model_dir).map_err(|e| e.to_string())?;
    }
    Ok(serde_json::json!({ "status": "model_removed" }))
}

fn import_local_files(tts_dir: &Path, source_dir: &Path) -> Result<Value, String> {
    let model_dir = tts_dir.join("models");
    std::fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;

    let source_model = source_dir.join(MODEL_FILENAME);
    let source_voices = source_dir.join(VOICES_FILENAME);
    let fallback_model = source_dir.join("kokoro-v1.0.int8.onnx");
    let fallback_voices = source_dir.join("voices-v1.0.bin");

    let model_source = if source_model.exists() {
        source_model
    } else if fallback_model.exists() {
        return Err("Found kokoro-v1.0.int8.onnx, but this build requires kokoro-v1.0.onnx for higher quality speech.".to_string());
    } else {
        return Err("Local model file not found in the provided folder.".to_string());
    };

    let voices_source = if source_voices.exists() {
        source_voices
    } else if fallback_voices.exists() {
        fallback_voices
    } else {
        return Err("Local voices file not found in the provided folder.".to_string());
    };

    let target_model = model_dir.join(MODEL_FILENAME);
    let target_voices = model_dir.join(VOICES_FILENAME);
    std::fs::copy(&model_source, &target_model).map_err(|e| e.to_string())?;
    std::fs::copy(&voices_source, &target_voices).map_err(|e| e.to_string())?;
    check_model_files(tts_dir)?;

    Ok(serde_json::json!({ "status": "imported" }))
}

fn read_audio_file(tts_dir: &Path, path: &Path) -> Result<Value, String> {
    let cache_dir = tts_dir.join("cache");
    let cache_dir = cache_dir.canonicalize().map_err(|e| e.to_string())?;
    let target = path.canonicalize().map_err(|e| e.to_string())?;

    if !target.starts_with(&cache_dir) {
        return Err("Invalid audio path.".to_string());
    }

    let bytes = std::fs::read(&target).map_err(|e| e.to_string())?;
    let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
    Ok(serde_json::json!({ "base64": encoded }))
}

fn dir_stats(path: &Path) -> Result<(u64, u64), String> {
    if !path.exists() {
        return Ok((0, 0));
    }

    let mut total_bytes = 0u64;
    let mut total_files = 0u64;
    let mut stack = vec![path.to_path_buf()];

    while let Some(current) = stack.pop() {
        let entries = std::fs::read_dir(&current).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let meta = entry.metadata().map_err(|e| e.to_string())?;
            if meta.is_dir() {
                stack.push(entry.path());
            } else if meta.is_file() {
                total_files += 1;
                total_bytes += meta.len();
            }
        }
    }

    Ok((total_bytes, total_files))
}

fn cache_stats(tts_dir: &Path) -> Result<Value, String> {
    let model_dir = tts_dir.join("models");
    let cache_dir = tts_dir.join("cache");
    let (model_bytes, model_files) = dir_stats(&model_dir)?;
    let (cache_bytes, cache_files) = dir_stats(&cache_dir)?;

    Ok(serde_json::json!({
        "model_bytes": model_bytes,
        "model_files": model_files,
        "cache_bytes": cache_bytes,
        "cache_files": cache_files,
        "model_dir": model_dir.to_string_lossy(),
        "cache_dir": cache_dir.to_string_lossy()
    }))
}

impl TtsInstance {
    pub fn new(tts_dir: PathBuf) -> Self {
        Self {
            tts_dir,
            engine: Arc::new(Mutex::new(None)),
            cancel_flag: Arc::new(AtomicBool::new(false)),
            install_progress: Arc::new(Mutex::new(InstallProgress::default())),
        }
    }

    // Helper to run installation logic (async)
    async fn install_logic(
        tts_dir: PathBuf,
        engine: Arc<Mutex<Option<KokoroTts>>>,
        install_progress: Arc<Mutex<InstallProgress>>,
    ) -> Result<Value, String> {
        let model_dir = tts_dir.join("models");
        if model_dir.exists() {
            std::fs::remove_dir_all(&model_dir).map_err(|e| e.to_string())?;
        }
        std::fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;

        let model_url = "https://github.com/mzdk100/kokoro/releases/download/V1.0/kokoro-v1.0.onnx";
        let voices_url = "https://github.com/mzdk100/kokoro/releases/download/V1.0/voices.bin";

        let model_path = model_dir.join(MODEL_FILENAME);
        let voices_path = model_dir.join(VOICES_FILENAME);

        set_install_progress(&install_progress, "downloading", "Model", 0, 0).await;
        let model_size = download_file(model_url, &model_path, install_progress.clone(), 0, "Model").await?;
        set_install_progress(&install_progress, "downloading", "Voices", model_size, model_size).await;
        let voices_size = download_file(voices_url, &voices_path, install_progress.clone(), model_size, "Voices").await?;
        let total_size = model_size + voices_size;
        set_install_progress(&install_progress, "verifying", "Checking files", total_size, total_size).await;
        check_model_files(&tts_dir)?;

        // Initialise engine
        {
            let mut engine_guard = engine.lock().await;
            let tts = KokoroTts::new(
                model_path.to_str().ok_or("Invalid model path")?,
                voices_path.to_str().ok_or("Invalid voices path")?,
            ).await.map_err(|e| {
                let message = e.to_string();
                let _ = std::fs::remove_dir_all(&model_dir);
                if message.contains("Utf8") {
                    "Failed to load Kokoro. The download looks corrupted; please retry the install.".to_string()
                } else {
                    format!("Failed to load Kokoro: {}", e)
                }
            })?;
            *engine_guard = Some(tts);
        }

        let total_size = model_size + voices_size;
        set_install_progress(&install_progress, "complete", "Done", total_size, total_size).await;
        Ok(serde_json::json!({ "status": "installed" }))
    }

    fn sanitise_sentence(sentence: &str) -> String {
        sentence
            .replace('‘', "'")
            .replace('’', "'")
            .replace('“', "\"")
            .replace('”', "\"")
            .replace('—', "-")
            .replace('–', "-")
            .replace("…", "...")
            .replace('«', "(")
            .replace('»', ")")
            .replace('，', ",")
            .replace('。', ".")
            .replace('！', "!")
            .replace('？', "?")
            .replace('：', ":")
            .replace('；', ";")
            .trim()
            .to_string()
    }

    async fn synthesize_logic(tts_dir: PathBuf, engine: Arc<Mutex<Option<KokoroTts>>>, cancel_flag: Arc<AtomicBool>, text: String, voice: String, speed: f32) -> Result<Value, String> {
        cancel_flag.store(false, Ordering::SeqCst);
        // Ensure loaded
        {
            let mut guard = engine.lock().await;
            if guard.is_none() {
                 let model_path = tts_dir.join("models").join(MODEL_FILENAME);
                 let voices_path = tts_dir.join("models").join(VOICES_FILENAME);
                 check_model_files(&tts_dir)?;

                 let tts = KokoroTts::new(
                    model_path.to_str().ok_or("Invalid path")?,
                    voices_path.to_str().ok_or("Invalid path")?
                ).await.map_err(|e| e.to_string())?;
                *guard = Some(tts);
            }
        }

        let selected_voice = match voice.as_str() {
            "af_sky" => Voice::AfSky(speed),
            "af_bella" => Voice::AfBella(speed),
            "af_nicole" => Voice::AfNicole(speed),
            "af_sarah" => Voice::AfSarah(speed),
            "am_adam" => Voice::AmAdam(speed),
            "am_michael" => Voice::AmMichael(speed),
            "bf_emma" => Voice::BfEmma(speed),
            "bf_isabella" => Voice::BfIsabella(speed),
            "bm_george" => Voice::BmGeorge(speed),
            "bm_lewis" => Voice::BmLewis(speed),
            _ => Voice::AfSky(speed),
        };

        // Segmentation and Synthesis
        let mut all_samples: Vec<f32> = Vec::new();
        let mut segments: Vec<Value> = Vec::new();
        let mut current_ms = 0.0;

        // Use unicode segmentation to find sentences
        // Note: sentence indices are byte indices, we need char indices for frontend?
        // Frontend uses CodeMirror which counts chars (UTF-16 code units usually in JS, but CM handles it).
        // Rust string indices are bytes.
        // We need to map byte offsets to char offsets if we want char precision.
        // But for simplicity, we can just assume 1-1 mapping for ASCII, but we should do it right.
        //
        // We'll iterate by sentences.
        let sentence_bounds = text.split_sentence_bound_indices();

        // We need the engine lock for the duration of synthesis
        let guard = engine.lock().await;
        let tts = guard.as_ref().unwrap();

        for (byte_start, sentence) in sentence_bounds {
            if cancel_flag.load(Ordering::SeqCst) {
                return Err("Synthesis cancelled.".to_string());
            }

            let sentence_trimmed = sentence.trim();
            if sentence_trimmed.is_empty() {
                continue;
            }

            let cleaned = Self::sanitise_sentence(sentence_trimmed);

            // Synthesize segment
            let (samples, _) = tts.synth(&cleaned, selected_voice).await
                .map_err(|e| {
                    let message = e.to_string();
                    if message.contains("Utf8") {
                        "Model files appear corrupt. Reinstall the TTS model.".to_string()
                    } else {
                        format!("Synthesis failed for segment '{}': {}", sentence_trimmed, e)
                    }
                })?;

            let segment_duration_ms = (samples.len() as f64 / 24000.0) * 1000.0;

            all_samples.extend(samples);

            // Add small silence (0.1s) between sentences
            let silence_samples = (24000.0 * 0.1) as usize;
            all_samples.extend(std::iter::repeat(0.0).take(silence_samples));
            let silence_ms = 100.0;

            // Record segment info
            // Calculate char offsets
            // We need start/end in CHARS (Unicode Scalar Values) for frontend consistency if using string.length?
            // JS string.length counts UTF-16 code units.
            // Rust String chars().count() counts Unicode Scalar Values.
            // CodeMirror usually works with char offsets (UTF-16).
            // For MVP, assume mostly BMP.
            // Correct approach: Count chars up to byte_start.
            // Calculate char offsets using byte_start to map back to text
            let start_char = text[0..byte_start].chars().count();
            let end_char = start_char + sentence.chars().count();

            segments.push(serde_json::json!({
                "startChar": start_char,
                "endChar": end_char,
                "startMs": current_ms,
                "endMs": current_ms + segment_duration_ms
            }));

            current_ms += segment_duration_ms + silence_ms;
        }

         // Write to WAV
        let cache_dir = tts_dir.join("cache");
        std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

        let mut hasher = Sha256::new();
        hasher.update(format!("{}-{}-{}", text, voice, speed));
        let hash = hex::encode(hasher.finalize());
        let output_path = cache_dir.join(format!("{}.wav", hash));

        let spec = WavSpec {
            channels: 1,
            sample_rate: 24000,
            bits_per_sample: 16,
            sample_format: hound::SampleFormat::Int,
        };

        let mut writer = WavWriter::create(&output_path, spec).map_err(|e| e.to_string())?;
        for sample in all_samples {
            let clamped = sample.clamp(-1.0, 1.0);
            let scaled = (clamped * i16::MAX as f32) as i16;
            writer.write_sample(scaled).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;

        Ok(serde_json::json!({
            "path": output_path,
            "duration_ms": current_ms,
            "segments": segments
        }))
    }
}

async fn download_file(
    url: &str,
    path: &Path,
    install_progress: Arc<Mutex<InstallProgress>>,
    base_downloaded: u64,
    phase: &str,
) -> Result<u64, String> {
    let client = reqwest::Client::builder()
        .user_agent("Liminal Notes TTS Installer")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let snippet: String = body.chars().take(200).collect();
        return Err(format!("Download failed ({}): {}", status, snippet));
    }

    let total_bytes = response.content_length().unwrap_or(0);
    set_install_progress(
        &install_progress,
        "downloading",
        phase,
        base_downloaded,
        base_downloaded + total_bytes,
    ).await;

    let tmp_path = path.with_extension("download");
    let mut file = tokio::fs::File::create(&tmp_path).await.map_err(|e| e.to_string())?;
    let mut stream = response.bytes_stream();
    let mut downloaded = 0u64;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| e.to_string())?;
        file.write_all(&chunk).await.map_err(|e| e.to_string())?;
        downloaded += chunk.len() as u64;
        if total_bytes > 0 {
            set_install_progress(
                &install_progress,
                "downloading",
                phase,
                base_downloaded + downloaded,
                base_downloaded + total_bytes,
            ).await;
        }
    }
    file.flush().await.map_err(|e| e.to_string())?;
    tokio::fs::rename(&tmp_path, path).await.map_err(|e| e.to_string())?;
    Ok(downloaded)
}

impl Invocable for TtsInstance {
    fn invoke(&self, method: &str, payload: Value) -> Pin<Box<dyn Future<Output = Result<Value, String>> + Send>> {
        let method = method.to_string();
        let tts_dir = self.tts_dir.clone();
        let engine = self.engine.clone();
        let cancel_flag = self.cancel_flag.clone();
        let install_progress = self.install_progress.clone();

        Box::pin(async move {
            match method.as_str() {
                "status" => {
                    let installed = check_model_files(&tts_dir).is_ok();
                    let loaded = engine.lock().await.is_some();
                    Ok(serde_json::json!({
                        "installed": installed,
                        "loaded": loaded
                    }))
                }
                "install" => {
                    TtsInstance::install_logic(tts_dir, engine, install_progress).await
                }
                "install_progress" => {
                    let progress = install_progress.lock().await.clone();
                    Ok(serde_json::json!({
                        "status": progress.status,
                        "phase": progress.phase,
                        "downloaded_bytes": progress.downloaded_bytes,
                        "total_bytes": progress.total_bytes,
                    }))
                }
                "cache_stats" => {
                    cache_stats(&tts_dir)
                }
                "clear_cache" => {
                    clear_cache_files(&tts_dir)
                }
                "remove_model" => {
                    remove_model_files(&tts_dir)
                }
                "import_local" => {
                    let source = payload["path"].as_str().ok_or("Missing path")?;
                    let source_dir = PathBuf::from(source);
                    import_local_files(&tts_dir, &source_dir)
                }
                "read_audio" => {
                    let path = payload["path"].as_str().ok_or("Missing path")?;
                    let audio_path = PathBuf::from(path);
                    read_audio_file(&tts_dir, &audio_path)
                }
                "model_dir" => {
                    let model_dir = tts_dir.join("models");
                    Ok(serde_json::json!({
                        "path": model_dir.to_string_lossy()
                    }))
                }
                "synthesize" => {
                    let text = payload["text"].as_str().ok_or("Missing text")?.to_string();
                    let voice = payload.get("voice").and_then(|v| v.as_str()).unwrap_or("af_sky").to_string();
                    let speed = payload.get("speed").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
                    TtsInstance::synthesize_logic(tts_dir, engine, cancel_flag, text, voice, speed).await
                }
                "cancel" => {
                    cancel_flag.store(true, Ordering::SeqCst);
                    Ok(serde_json::json!({
                        "status": "cancelled"
                    }))
                }
                _ => Err(format!("Method {} not found", method)),
            }
        })
    }
}
