import { LiminalPlugin, PluginContext } from '../types';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';

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
        }
    ]
  },
  onSettingsAction: async (ctx: PluginContext, actionId: string, settings: Record<string, any>) => {
      if (actionId === 'tts-preview') {
          const voice = settings['tts.defaultVoice'] || 'af_sky';
          const speed = settings['tts.defaultSpeed'] || 1.0;
          try {
              const res = await invoke<any>('native_plugin_invoke', {
                  pluginId: 'core.tts',
                  method: 'synthesize',
                  requestId: Math.random().toString(),
                  payload: { text: "This is a preview of the selected voice.", voice, speed }
              });

              if (res.ok && res.result) {
                  const assetUrl = convertFileSrc(res.result.path);
                  const audio = new Audio(assetUrl);
                  audio.play();
              }
          } catch (e) {
              console.error("Failed to play preview", e);
          }
      }
  },
  onActivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin activated');
  },
  onDeactivate: (ctx: PluginContext) => {
    ctx.log('TTS plugin deactivated');
  },
};
