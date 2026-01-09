import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';

const PLUGIN_ID = 'core.tts';

export interface TtsStatus {
  installed: boolean;
  loaded: boolean;
}

export interface TtsSegment {
  startChar: number;
  endChar: number;
  startMs: number;
  endMs: number;
}

export interface TtsResult {
  path: string;
  duration_ms: number;
  segments: TtsSegment[];
}

export const useTts = () => {
  const [status, setStatus] = useState<TtsStatus>({ installed: false, loaded: false });
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [segments, setSegments] = useState<TtsSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<TtsSegment | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await invoke<any>('native_plugin_invoke', {
        pluginId: PLUGIN_ID,
        method: 'status',
        requestId: Math.random().toString(),
        payload: {}
      });
      if (res.ok) {
        setStatus(res.result);
      }
    } catch (e) {
      console.error('TTS status check failed', e);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const installModel = async () => {
    setIsSynthesizing(true);
    setError(null);
    try {
      await invoke('native_plugin_invoke', {
        pluginId: PLUGIN_ID,
        method: 'install',
        requestId: Math.random().toString(),
        payload: {}
      });
      await checkStatus();
    } catch (e: any) {
      setError(e.message || 'Installation failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const speak = async (text: string, voice: string = 'af_sky', speed: number = 1.0) => {
    if (!text) return;

    // Stop previous
    stop();

    setIsSynthesizing(true);
    setError(null);
    setSegments([]);
    setCurrentSegment(null);

    try {
      const res = await invoke<any>('native_plugin_invoke', {
        pluginId: PLUGIN_ID,
        method: 'synthesize',
        requestId: Math.random().toString(),
        payload: { text, voice, speed }
      });

      if (!res.ok) {
        throw new Error(res.error?.message || 'Synthesis failed');
      }

      const { path, segments: resSegments } = res.result as TtsResult;
      setSegments(resSegments || []);

      const assetUrl = convertFileSrc(path);

      const audio = new Audio(assetUrl);
      audio.playbackRate = 1.0;

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentAudio(null);
        setCurrentSegment(null);
      };

      audio.ontimeupdate = () => {
          const currentTimeMs = audio.currentTime * 1000;
          // Find segment
          const seg = resSegments?.find(s => currentTimeMs >= s.startMs && currentTimeMs < s.endMs);
          setCurrentSegment(seg || null);
      };

      audio.play();
      setCurrentAudio(audio);
      setIsPlaying(true);

    } catch (e: any) {
      setError(e.message || 'Synthesis failed');
    } finally {
      setIsSynthesizing(false);
    }
  };

  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setCurrentAudio(null);
      setIsPlaying(false);
      setCurrentSegment(null);
    }
  }, [currentAudio]);

  const pause = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  }, [currentAudio]);

  const resume = useCallback(() => {
    if (currentAudio) {
      currentAudio.play();
      setIsPlaying(true);
    }
  }, [currentAudio]);

  return {
    status,
    isSynthesizing,
    isPlaying,
    error,
    currentSegment,
    checkStatus,
    installModel,
    speak,
    stop,
    pause,
    resume
  };
};
