import React, { useState, useEffect } from 'react';
import { useTts } from './useTts';
import { ThemeContext } from '../../theme/ThemeContext';

interface TtsPlayerProps {
    onHighlight?: (range: { from: number; to: number } | null) => void;
    getData: () => { text: string };
}

export const TtsPlayer: React.FC<TtsPlayerProps> = ({ onHighlight, getData }) => {
  const { status, isSynthesizing, isPlaying, error, currentSegment, installModel, speak, stop, pause, resume } = useTts();
  const [voice, setVoice] = useState('af_sky');
  const [speed, setSpeed] = useState(1.0);

  const voices = [
    'af_sky', 'af_bella', 'af_nicole', 'af_sarah',
    'am_adam', 'am_michael',
    'bf_emma', 'bf_isabella',
    'bm_george', 'bm_lewis'
  ];

  // Sync highlighting
  useEffect(() => {
      if (onHighlight) {
          if (currentSegment) {
              onHighlight({ from: currentSegment.startChar, to: currentSegment.endChar });
          } else {
              onHighlight(null);
          }
      }
  }, [currentSegment, onHighlight]);

  const handlePlay = () => {
      const { text } = getData();
      if (text) {
          speak(text, voice, speed);
      }
  };

  if (!status.installed) {
    return (
      <div className="p-2 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--ln-border)', background: 'var(--ln-bg)', color: 'var(--ln-fg)' }}>
          <span className="flex-1">TTS Model Required</span>
          <button
            onClick={installModel}
            disabled={isSynthesizing}
            className="px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--ln-accent)', color: 'var(--ln-bg)' }}
          >
            {isSynthesizing ? 'Installing...' : 'Install'}
          </button>
          {error && <div className="text-red-500 ml-2">{error}</div>}
      </div>
    );
  }

  return (
    <div className="p-2 border-t flex flex-col gap-1 text-xs" style={{ borderColor: 'var(--ln-border)', backgroundColor: 'var(--ln-bg)', color: 'var(--ln-fg)' }}>
       {/* Controls Row */}
       <div className="flex items-center gap-2">
          {!isPlaying && !isSynthesizing && (
              <button onClick={handlePlay} className="hover:opacity-80">
                  ▶ Play
              </button>
          )}
          {isPlaying && (
              <button onClick={pause} className="hover:opacity-80">
                  ⏸ Pause
              </button>
          )}
          {!isPlaying && (isSynthesizing || currentSegment) && (
             <button onClick={resume} className="hover:opacity-80">
                 ▶ Resume
             </button>
          )}

          <button onClick={stop} disabled={!isPlaying && !isSynthesizing && !currentSegment} className="hover:opacity-80 disabled:opacity-30">
              ⏹ Stop
          </button>

          <div className="flex-1"></div>

          <select
            value={voice}
            onChange={(e) => setVoice(e.target.value)}
            className="border rounded p-1 bg-transparent"
            style={{ borderColor: 'var(--ln-border)', color: 'var(--ln-fg)' }}
          >
            {voices.map(v => <option key={v} value={v}>{v}</option>)}
          </select>

          <input
            type="number"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            step="0.1"
            min="0.5"
            max="2.0"
            className="w-12 border rounded p-1 bg-transparent text-center"
            style={{ borderColor: 'var(--ln-border)', color: 'var(--ln-fg)' }}
          />
       </div>

       {isSynthesizing && <div className="text-xs text-blue-500">Synthesizing...</div>}
       {error && <div className="text-red-500 text-xs">{error}</div>}
    </div>
  );
};
