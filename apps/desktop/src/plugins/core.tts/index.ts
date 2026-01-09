import { LiminalPlugin, PluginContext } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { synthesiseChunk } from './ttsEngines';

const voiceOptions = [
    { value: 'af_sky', label: 'Sky (American Female)' },
    { value: 'af_bella', label: 'Bella (American Female)' },
    { value: 'af_nicole', label: 'Nicole (American Female)' },
    { value: 'af_sarah', label: 'Sarah (American Female)' },
    { value: 'am_adam', label: 'Adam (American Male)' },
    { value: 'am_michael', label: 'Michael (American Male)' },
    { value: 'bf_emma', label: 'Emma (British Female)' },
    { value: 'bf_isabella', label: 'Isabella (British Female)' },
    { value: 'bm_george', label: 'George (British Male)' },
    { value: 'bm_lewis', label: 'Lewis (British Male)' },
];

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

const refreshCacheStats = async (ctx: PluginContext) => {
    const res = await invoke<any>('native_plugin_invoke', {
        pluginId: 'core.tts',
        method: 'cache_stats',
        requestId: Math.random().toString(),
        payload: {}
    });
    if (res?.ok === false) {
        throw new Error(res.error?.message || 'Failed to fetch cache stats');
    }
    const rust = res?.result as {
        model_bytes: number;
        model_files: number;
        cache_bytes: number;
        cache_files: number;
        model_dir: string;
        cache_dir: string;
    };
    const rustSummary = `Model: ${formatBytes(rust.model_bytes)} (${rust.model_files} files). Cache: ${formatBytes(rust.cache_bytes)} (${rust.cache_files} files).`;
    await ctx.updateSetting?.('tts.cacheRust', rustSummary);
};

export const ttsPlugin: LiminalPlugin = {
  meta: {
    id: 'core.tts',
    name: 'Read Aloud (TTS)',
    description: 'Offline text-to-speech with playback controls and highlighting.',
    version: '0.1.0',
    enabledByDefault: false,
  },
  settings: {
    id: 'read-aloud',
    title: 'Read Aloud',
    groups: [
        {
            id: 'tts-settings',
            title: 'Voice',
            rows: [
                {
                    id: 'tts-voice',
                    label: 'Default Voice',
                    controls: [{
                        kind: 'select',
                        key: 'tts.defaultVoice',
                        options: voiceOptions
                    }]
                },
                {
                    id: 'tts-speed',
                    label: 'Default Speed',
                    controls: [{
                        kind: 'slider',
                        key: 'tts.defaultSpeed',
                        min: 0.5,
                        max: 2.0,
                        step: 0.1
                    }]
                },
                {
                    id: 'tts-preview',
                    label: 'Voice Preview',
                    description: 'Play a short sample of the selected voice.',
                    controls: [{ kind: 'action', label: 'Play Sample', actionId: 'tts-preview' }]
                }
            ]
        },
        {
            id: 'tts-maintenance',
            title: 'Setup and Maintenance',
            rows: [
                {
                    id: 'tts-status',
                    label: 'Status',
                    description: 'Latest setup activity and outcome.',
                    controls: [{ kind: 'computed', key: 'tts.statusMessage', label: 'No recent activity.' }]
                },
                {
                    id: 'tts-cache-metadata',
                    label: 'Cache metadata',
                    description: 'Show model and cache usage for the Rust engine.',
                    controls: [{ kind: 'action', label: 'Refresh Cache Stats', actionId: 'tts-refresh-cache' }]
                },
                {
                    id: 'tts-rust-cache',
                    label: 'Rust cache usage',
                    description: 'Model and audio cache stored by the Rust backend.',
                    controls: [{ kind: 'computed', key: 'tts.cacheRust', label: 'Not available yet.' }]
                },
                {
                    id: 'tts-progress',
                    label: 'Download progress',
                    description: 'Tracks model download progress during installation.',
                    controls: [{ kind: 'progress', key: 'tts.installProgress', label: 'Download progress' }]
                },
                {
                    id: 'tts-model-path',
                    label: 'Model location',
                    description: 'Where the model files are stored on disk.',
                    controls: [{ kind: 'computed', key: 'tts.modelPath', label: 'Not available yet.' }]
                },
                {
                    id: 'tts-reveal-path',
                    label: 'Reveal model folder',
                    description: 'Show the model storage path so you can copy files manually.',
                    controls: [{ kind: 'action', label: 'Show Path', actionId: 'tts-show-path' }]
                },
                {
                    id: 'tts-import-local',
                    label: 'Import local files',
                    description: 'Import model files from the workspace folder (dev container only).',
                    controls: [{ kind: 'action', label: 'Import from Workspace', actionId: 'tts-import-local' }]
                },
                {
                    id: 'tts-install',
                    label: 'TTS Model',
                    description: 'Install or repair the local TTS model files.',
                    controls: [{ kind: 'action', label: 'Install or Repair', actionId: 'tts-install' }]
                },
                {
                    id: 'tts-remove',
                    label: 'Remove Model',
                    description: 'Remove the local model files to free storage.',
                    controls: [{ kind: 'action', label: 'Remove Model', actionId: 'tts-remove' }]
                },
                {
                    id: 'tts-clear-cache',
                    label: 'Clear Cache',
                    description: 'Remove cached audio generated during playback.',
                    controls: [{ kind: 'action', label: 'Clear Cache', actionId: 'tts-clear-cache' }]
                }
            ]
        }
    ]
  },
  onSettingsAction: async (ctx: PluginContext, actionId: string, settings: Record<string, any>) => {
      const setStatus = async (message: string, type: 'info' | 'success' | 'error' = 'info') => {
          await ctx.updateSetting?.('tts.statusMessage', message);
          ctx.notify?.(message, type);
      };
      const setStatusMessage = async (message: string) => {
          await ctx.updateSetting?.('tts.statusMessage', message);
      };

      if (actionId === 'tts-preview') {
          const voice = settings['tts.defaultVoice'] || 'af_sky';
          const speed = settings['tts.defaultSpeed'] || 1.0;
          try {
              await setStatus('Preparing voice preview...');
              const { url, revoke } = await synthesiseChunk(
                  "This is a preview of the selected voice.",
                  voice,
                  speed
              );
              const audio = new Audio(url);
              audio.onended = () => {
                  if (revoke) {
                      revoke();
                  }
              };
              await audio.play();
              await setStatus('Voice preview started.', 'success');
          } catch (e) {
              console.error("Failed to play preview", e);
              await setStatus('Voice preview failed. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-install') {
          let intervalId: number | null = null;
          let lastPercent = -1;
          try {
              await ctx.updateSetting?.('tts.installProgress', 0);
              await setStatus('Installing TTS model... this may take a few minutes.');

              const pollProgress = async () => {
                  try {
                      const progressRes = await invoke<any>('native_plugin_invoke', {
                          pluginId: 'core.tts',
                          method: 'install_progress',
                          requestId: Math.random().toString(),
                          payload: {}
                      });
                      if (!progressRes?.ok) {
                          return;
                      }
                      const result = progressRes.result as {
                          status?: string;
                          phase?: string;
                          downloaded_bytes?: number;
                          total_bytes?: number;
                      };
                      const downloaded = result?.downloaded_bytes || 0;
                      const total = result?.total_bytes || 0;
                      const percent = total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : 0;
                      if (percent !== lastPercent) {
                          lastPercent = percent;
                          await ctx.updateSetting?.('tts.installProgress', percent);
                          const phase = result?.phase ? ` (${result.phase})` : '';
                          if (total > 0) {
                          await setStatusMessage(`Downloading model${phase}: ${percent}%`);
                      } else {
                              await setStatusMessage(`Downloading model${phase}...`);
                      }
                      }
                  } catch (e) {
                      console.warn('Failed to fetch TTS install progress', e);
                  }
              };

              await pollProgress();
              intervalId = window.setInterval(pollProgress, 500);

              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'install',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Installation failed');
              }
              await ctx.updateSetting?.('tts.installProgress', 100);
              await refreshCacheStats(ctx);
              await setStatus('TTS model installed.', 'success');
          } catch (e) {
              console.error('TTS installation failed', e);
              await ctx.updateSetting?.('tts.installProgress', 0);
              await setStatus('Install failed. Check the console for details.', 'error');
          } finally {
              if (intervalId !== null) {
                  window.clearInterval(intervalId);
              }
          }
          return;
      }

      if (actionId === 'tts-refresh-cache') {
          try {
              await setStatus('Refreshing cache metadata...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'cache_stats',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Failed to fetch Rust cache stats');
              }
              const rust = res?.result as {
                  model_bytes: number;
                  model_files: number;
                  cache_bytes: number;
                  cache_files: number;
                  model_dir: string;
                  cache_dir: string;
              };
              const rustSummary = `Model: ${formatBytes(rust.model_bytes)} (${rust.model_files} files). Cache: ${formatBytes(rust.cache_bytes)} (${rust.cache_files} files).`;
              await ctx.updateSetting?.('tts.cacheRust', rustSummary);
              await setStatus('Cache metadata updated.', 'success');
          } catch (e) {
              console.error('Cache metadata refresh failed', e);
              await setStatus('Cache metadata refresh failed. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-show-path') {
          try {
              await setStatus('Fetching model location...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'model_dir',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Failed to fetch model path');
              }
              const path = res?.result?.path as string | undefined;
              if (path) {
                  await ctx.updateSetting?.('tts.modelPath', path);
                  await setStatus(`Model location: ${path}. Copy kokoro-v1.0.onnx and voices.bin here.`, 'success');
              } else {
                  await setStatus('Model location not available.', 'error');
              }
          } catch (e) {
              console.error('TTS model path lookup failed', e);
              await setStatus('Failed to fetch model location. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-import-local') {
          try {
              await setStatus('Importing local model files...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'import_local',
                  requestId: Math.random().toString(),
                  payload: { path: '/workspaces/liminal-notes' }
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Import failed');
              }
              await refreshCacheStats(ctx);
              await setStatus('Local model files imported.', 'success');
          } catch (e) {
              console.error('TTS local import failed', e);
              await setStatus('Local import failed. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-remove') {
          try {
              await setStatus('Removing TTS model files...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'remove_model',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Remove model failed');
              }
              await refreshCacheStats(ctx);
              await setStatus('TTS model removed.', 'success');
          } catch (e) {
              console.error('TTS remove model failed', e);
              await setStatus('Remove model failed. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-clear-cache') {
          try {
              await setStatus('Clearing TTS cache...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'clear_cache',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Clear cache failed');
              }
              await refreshCacheStats(ctx);
              await setStatus('TTS cache cleared.', 'success');
          } catch (e) {
              console.error('TTS clear cache failed', e);
              await setStatus('Clear cache failed. Check the console for details.', 'error');
          }
          return;
      }
  },
  onActivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin activated');
  },
  onDeactivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin deactivated');
  },
};
