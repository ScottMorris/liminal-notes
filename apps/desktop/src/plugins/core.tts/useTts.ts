import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useSettings } from '../../contexts/SettingsContext';
import { synthesiseChunk } from './ttsEngines';
import { TtsSegment } from './types';

const PLUGIN_ID = 'core.tts';
const DEFAULT_CHUNK_SIZE = 1200;

interface TtsChunk {
  text: string;
  startChar: number;
  endChar: number;
}

export interface TtsStatus {
  installed: boolean;
  loaded: boolean;
}

const buildChunks = (text: string, maxChars: number = DEFAULT_CHUNK_SIZE): TtsChunk[] => {
  if (!text) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    const chunks: TtsChunk[] = [];
    let chunkStart = 0;
    let chunkLength = 0;
    let lastEnd = 0;

    for (const { segment, index } of segmenter.segment(text)) {
      const segStart = index;
      const segEnd = index + segment.length;
      const segLength = segEnd - segStart;
      lastEnd = segEnd;

      if (chunkLength > 0 && chunkLength + segLength > maxChars) {
        chunks.push({
          text: text.slice(chunkStart, segStart),
          startChar: chunkStart,
          endChar: segStart
        });
        chunkStart = segStart;
        chunkLength = segLength;
      } else {
        chunkLength += segLength;
      }
    }

    if (chunkLength > 0) {
      chunks.push({
        text: text.slice(chunkStart, lastEnd),
        startChar: chunkStart,
        endChar: lastEnd
      });
    }

    return chunks;
  }

  const chunks: TtsChunk[] = [];
  for (let start = 0; start < text.length; start += maxChars) {
    const end = Math.min(text.length, start + maxChars);
    chunks.push({ text: text.slice(start, end), startChar: start, endChar: end });
  }
  return chunks;
};

export const useTts = () => {
  const { settings } = useSettings();
  const [status, setStatus] = useState<TtsStatus>({ installed: false, loaded: false });
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [revokeAudioUrl, setRevokeAudioUrl] = useState<(() => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synthProgress, setSynthProgress] = useState<{ current: number; total: number } | null>(null);

  const [segments, setSegments] = useState<TtsSegment[]>([]);
  const [currentSegment, setCurrentSegment] = useState<TtsSegment | null>(null);
  const runIdRef = useRef(0);
  const cancelRequestedRef = useRef(false);
  const cancelResolversRef = useRef<Set<() => void>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      const res = await invoke<any>('native_plugin_invoke', {
        pluginId: PLUGIN_ID,
        method: 'install',
        requestId: Math.random().toString(),
        payload: {}
      });
      if (res?.ok === false) {
        throw new Error(res.error?.message || 'Installation failed');
      }
      await checkStatus();
    } catch (e: any) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : e?.message || 'Installation failed';
      console.error('TTS installation failed', e);
      if (message.includes('Model files appear corrupt')) {
        setStatus({ installed: false, loaded: false });
        setError('Something went wrong. Open Settings → Read Aloud.');
      } else {
        setError('Something went wrong. Check the console for details.');
      }
    } finally {
      setIsSynthesizing(false);
    }
  };

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      audio.load();
    }
    if (revokeAudioUrl) {
      revokeAudioUrl();
    }
    setCurrentAudio(null);
    setRevokeAudioUrl(null);
    setIsPlaying(false);
    setCurrentSegment(null);
  }, [revokeAudioUrl]);

  const cancelSynthesis = useCallback(async () => {
    cancelRequestedRef.current = true;
    runIdRef.current += 1;
    cancelResolversRef.current.forEach(resolve => resolve());
    cancelResolversRef.current.clear();
    stopAudio();
    setIsSynthesizing(false);
    setSynthProgress(null);
    setSegments([]);
    try {
      await invoke<any>('native_plugin_invoke', {
        pluginId: PLUGIN_ID,
        method: 'cancel',
        requestId: Math.random().toString(),
        payload: {}
      });
    } catch (e) {
      console.error('TTS cancel failed', e);
    }
  }, [stopAudio]);

  const speak = async (text: string, voice: string = 'af_sky', speed: number = 1.0) => {
    if (!text) return;

    // Stop previous
    await cancelSynthesis();
    cancelRequestedRef.current = false;
    const runId = runIdRef.current;

    setIsSynthesizing(true);
    setError(null);
    setSegments([]);
    setCurrentSegment(null);

    try {
      const chunks = buildChunks(text);
      if (chunks.length === 0) {
        setIsSynthesizing(false);
        return;
      }

      setSynthProgress({ current: 0, total: chunks.length });

      if (!audioRef.current) {
        const audio = document.createElement('audio');
        audio.preload = 'auto';
        audio.style.display = 'none';
        document.body.appendChild(audio);
        audioRef.current = audio;
      }

      for (let index = 0; index < chunks.length; index += 1) {
        if (cancelRequestedRef.current || runIdRef.current !== runId) {
          return;
        }

        const chunk = chunks[index];
        setSynthProgress({ current: index + 1, total: chunks.length });
        setIsSynthesizing(true);

        const { url, revoke, segments: resSegments } = await synthesiseChunk(chunk.text, voice, speed);

        if (runIdRef.current !== runId) {
          if (revoke) {
            revoke();
          }
          return;
        }

        const adjustedSegments = (resSegments || []).map(segment => ({
          ...segment,
          startChar: segment.startChar + chunk.startChar,
          endChar: segment.endChar + chunk.startChar
        }));
        setSegments(adjustedSegments);

        if (runIdRef.current !== runId) {
          if (revoke) {
            revoke();
          }
          return;
        }

        await new Promise<void>((resolve, reject) => {
          const audio = audioRef.current!;
          audio.pause();
          audio.currentTime = 0;
          audio.playbackRate = 1.0;
          audio.src = url;
          audio.load();

          const cancelResolver = () => {
            cleanup();
            resolve();
          };

          const cleanup = () => {
            cancelResolversRef.current.delete(cancelResolver);
            audio.onended = null;
            audio.onerror = null;
            audio.ontimeupdate = null;
          };

          cancelResolversRef.current.add(cancelResolver);

          audio.onended = () => {
            cleanup();
            if (runIdRef.current === runId) {
              setIsPlaying(false);
              setCurrentAudio(null);
              setCurrentSegment(null);
              if (revoke) {
                revoke();
              }
              setRevokeAudioUrl(null);
            }
            resolve();
          };

          audio.onerror = () => {
            cleanup();
            reject(new Error('Audio playback failed'));
          };

          audio.ontimeupdate = () => {
            if (runIdRef.current !== runId) {
              return;
            }
            const currentTimeMs = audio.currentTime * 1000;
            const seg = adjustedSegments.find(s => currentTimeMs >= s.startMs && currentTimeMs < s.endMs);
            setCurrentSegment(seg || null);
          };

          audio
            .play()
            .then(() => {
              setCurrentAudio(audio);
              setRevokeAudioUrl(revoke || null);
              setIsPlaying(true);
              setIsSynthesizing(false);
            })
            .catch(reject);
        });
      }
    } catch (e: any) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === 'string'
            ? e
            : e?.message || 'Synthesis failed';
      console.error('TTS synthesis failed', e);
      if (message.toLowerCase().includes('cancelled')) {
        setError(null);
      } else if (message.includes('Model files appear corrupt')) {
        setStatus({ installed: false, loaded: false });
        setError('Something went wrong. Open Settings → Read Aloud.');
      } else {
        setError('Something went wrong. Check the console for details.');
      }
    } finally {
      setIsSynthesizing(false);
      setSynthProgress(null);
    }
  };

  const stop = useCallback(() => {
    void cancelSynthesis();
  }, [cancelSynthesis]);

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
    synthProgress,
    checkStatus,
    installModel,
    speak,
    stop,
    pause,
    resume
  };
};
