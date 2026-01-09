import { invoke, convertFileSrc } from '@tauri-apps/api/core';

const PLUGIN_ID = 'core.tts';

export interface ResolvedAudio {
  url: string;
  revoke?: () => void;
}

export const resolveAudioSrc = async (path: string): Promise<ResolvedAudio> => {
  try {
    const res = await invoke<any>('native_plugin_invoke', {
      pluginId: PLUGIN_ID,
      method: 'read_audio',
      requestId: Math.random().toString(),
      payload: { path }
    });
    if (res?.ok === false) {
      throw new Error(res.error?.message || 'Failed to load audio');
    }
    const base64 = res?.result?.base64 as string | undefined;
    if (!base64) {
      throw new Error('Missing audio data');
    }
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
    return { url: blobUrl, revoke: () => URL.revokeObjectURL(blobUrl) };
  } catch (error) {
    console.warn('Falling back to asset URL for audio', error);
    const assetUrl = convertFileSrc(path);
    if (!assetUrl || assetUrl === path) {
      throw error instanceof Error ? error : new Error('Failed to load audio');
    }
    return { url: assetUrl };
  }
};
