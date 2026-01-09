import { invoke } from '@tauri-apps/api/core';
import { resolveAudioSrc } from './audio';
import { TtsResult, TtsSegment } from './types';

const PLUGIN_ID = 'core.tts';

export interface EngineChunkResult {
  url: string;
  revoke?: () => void;
  segments: TtsSegment[];
}

export async function synthesiseChunk(text: string, voice: string, speed: number): Promise<EngineChunkResult> {
  const res = await invoke<any>('native_plugin_invoke', {
    pluginId: PLUGIN_ID,
    method: 'synthesize',
    requestId: Math.random().toString(),
    payload: { text, voice, speed }
  });

  if (!res.ok) {
    throw new Error(res.error?.message || 'Synthesis failed');
  }

  const { path, segments } = res.result as TtsResult;
  const resolved = await resolveAudioSrc(path);
  return {
    url: resolved.url,
    revoke: resolved.revoke,
    segments: segments || []
  };
}
