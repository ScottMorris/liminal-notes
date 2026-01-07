import { LiminalPlugin, PluginContext } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { resolveAudioSrc } from './audio';

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

      if (actionId === 'tts-preview') {
          const voice = settings['tts.defaultVoice'] || 'af_sky';
          const speed = settings['tts.defaultSpeed'] || 1.0;
          try {
              await setStatus('Preparing voice preview...');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'synthesize',
                  requestId: Math.random().toString(),
                  payload: { text: "This is a preview of the selected voice.", voice, speed }
              });

              if (res.ok && res.result) {
                  const resolved = await resolveAudioSrc(res.result.path);
                  const audio = new Audio(resolved.url);
                  audio.onended = () => {
                      if (resolved.revoke) {
                          resolved.revoke();
                      }
                  };
                  audio.play();
                  await setStatus('Voice preview started.', 'success');
              } else if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Preview failed');
              }
          } catch (e) {
              console.error("Failed to play preview", e);
              await setStatus('Voice preview failed. Check the console for details.', 'error');
          }
          return;
      }

      if (actionId === 'tts-install') {
          try {
              await setStatus('Installing TTS model... this may take a few minutes.');
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'install',
                  requestId: Math.random().toString(),
                  payload: {}
              });
              if (res?.ok === false) {
                  throw new Error(res.error?.message || 'Installation failed');
              }
              await setStatus('TTS model installed.', 'success');
          } catch (e) {
              console.error('TTS installation failed', e);
              await setStatus('Install failed. Check the console for details.', 'error');
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
                  await setStatus(`Model location: ${path}. Copy kokoro-v1.0.int8.onnx and voices.bin here.`, 'success');
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
