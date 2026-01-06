use super::traits::{NativeBackendPlugin, NativePluginContext, ActivePlugin, Invocable};
use serde_json::Value;
use std::sync::Arc;
use tokio::sync::Mutex;
use std::future::Future;
use std::pin::Pin;
use tauri::{Runtime, Manager};
use std::path::{Path, PathBuf};
use kokoro_tts::{KokoroTts, Voice};
use hound::{WavSpec, WavWriter};
use sha2::{Sha256, Digest};
use unicode_segmentation::UnicodeSegmentation;

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
}

impl TtsInstance {
    pub fn new(tts_dir: PathBuf) -> Self {
        Self {
            tts_dir,
            engine: Arc::new(Mutex::new(None)),
        }
    }

    // Helper to run installation logic (async)
    async fn install_logic(tts_dir: PathBuf, engine: Arc<Mutex<Option<KokoroTts>>>) -> Result<Value, String> {
        let model_dir = tts_dir.join("models");
        std::fs::create_dir_all(&model_dir).map_err(|e| e.to_string())?;

        let model_url = "https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/kokoro-v1.0.onnx";
        let voices_url = "https://huggingface.co/fastrtc/kokoro-onnx/resolve/main/voices-v1.0.bin";

        let model_path = model_dir.join("kokoro-v1.0.onnx");
        let voices_path = model_dir.join("voices-v1.0.bin");

        download_file(model_url, &model_path).await?;
        download_file(voices_url, &voices_path).await?;

        // Initialize engine
        {
            let mut engine_guard = engine.lock().await;
            let tts = KokoroTts::new(
                model_path.to_str().ok_or("Invalid model path")?,
                voices_path.to_str().ok_or("Invalid voices path")?,
            ).await.map_err(|e| format!("Failed to load Kokoro: {}", e))?;
            *engine_guard = Some(tts);
        }

        Ok(serde_json::json!({ "status": "installed" }))
    }

    async fn synthesize_logic(tts_dir: PathBuf, engine: Arc<Mutex<Option<KokoroTts>>>, text: String, voice: String, speed: f32) -> Result<Value, String> {
        // Ensure loaded
        {
            let mut guard = engine.lock().await;
            if guard.is_none() {
                 let model_path = tts_dir.join("models").join("kokoro-v1.0.onnx");
                 let voices_path = tts_dir.join("models").join("voices-v1.0.bin");
                 if !model_path.exists() { return Err("Model not installed".to_string()); }

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
        let sentence_bounds = text.split_sentence_bound_indices();

        // We need the engine lock for the duration of synthesis
        let guard = engine.lock().await;
        let tts = guard.as_ref().unwrap();

        for (byte_start, sentence) in sentence_bounds {
            let sentence_trimmed = sentence.trim();
            if sentence_trimmed.is_empty() {
                continue;
            }

            // Synthesize segment
            let (samples, _) = tts.synth(sentence_trimmed, selected_voice).await
                .map_err(|e| format!("Synthesis failed for segment '{}': {}", sentence_trimmed, e))?;

            let segment_duration_ms = (samples.len() as f64 / 24000.0) * 1000.0;

            all_samples.extend(samples);

            // Add small silence (0.1s) between sentences
            let silence_samples = (24000.0 * 0.1) as usize;
            all_samples.extend(std::iter::repeat(0.0).take(silence_samples));
            let silence_ms = 100.0;

            // Record segment info
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
            bits_per_sample: 32,
            sample_format: hound::SampleFormat::Float,
        };

        let mut writer = WavWriter::create(&output_path, spec).map_err(|e| e.to_string())?;
        for sample in all_samples {
            writer.write_sample(sample).map_err(|e| e.to_string())?;
        }
        writer.finalize().map_err(|e| e.to_string())?;

        Ok(serde_json::json!({
            "path": output_path,
            "duration_ms": current_ms,
            "segments": segments
        }))
    }
}

async fn download_file(url: &str, path: &Path) -> Result<(), String> {
    use std::io::Write;
    let response = reqwest::get(url).await.map_err(|e| e.to_string())?;
    let mut file = std::fs::File::create(path).map_err(|e| e.to_string())?;
    let content = response.bytes().await.map_err(|e| e.to_string())?;
    file.write_all(&content).map_err(|e| e.to_string())?;
    Ok(())
}

impl Invocable for TtsInstance {
    fn invoke(&self, method: &str, payload: Value) -> Pin<Box<dyn Future<Output = Result<Value, String>> + Send>> {
        let method = method.to_string();
        let tts_dir = self.tts_dir.clone();
        let engine = self.engine.clone();

        Box::pin(async move {
            match method.as_str() {
                "status" => {
                    let model_path = tts_dir.join("models").join("kokoro-v1.0.onnx");
                    let installed = model_path.exists();
                    let loaded = engine.lock().await.is_some();
                    Ok(serde_json::json!({
                        "installed": installed,
                        "loaded": loaded
                    }))
                }
                "install" => {
                    TtsInstance::install_logic(tts_dir, engine).await
                }
                "synthesize" => {
                    let text = payload["text"].as_str().ok_or("Missing text")?.to_string();
                    let voice = payload.get("voice").and_then(|v| v.as_str()).unwrap_or("af_sky").to_string();
                    let speed = payload.get("speed").and_then(|v| v.as_f64()).unwrap_or(1.0) as f32;
                    TtsInstance::synthesize_logic(tts_dir, engine, text, voice, speed).await
                }
                _ => Err(format!("Method {} not found", method)),
            }
        })
    }
}
