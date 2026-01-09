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
