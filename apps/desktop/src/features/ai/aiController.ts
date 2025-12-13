import { NoteSnapshot } from '../../plugins/types';
import {
  getSummarisationPipeline,
  getClassificationPipeline,
  getEmbeddingPipeline
} from './transformersClient';

// Helper types for Transformers.js outputs which are sometimes complex unions
interface SummarizationOutput {
  summary_text: string;
}

interface ZeroShotOutput {
  sequence: string;
  labels: string[];
  scores: number[];
}

export interface AiSummaryResult {
  kind: 'summary';
  text: string;
}

export interface AiTagSuggestion {
  tag: string;
  confidence: number;
}

export interface AiTagSuggestionsResult {
  kind: 'tag-suggestions';
  suggestions: AiTagSuggestion[];
}

export interface AiClassificationResult {
  kind: 'classification';
  label: string;
  confidence: number;
}

export interface AiRelatedNote {
  path: string;
  title: string;
  score: number;
}

export interface AiRelatedNotesResult {
  kind: 'related-notes';
  notes: AiRelatedNote[];
}

export type AiResult =
  | AiSummaryResult
  | AiTagSuggestionsResult
  | AiClassificationResult
  | AiRelatedNotesResult;

// Candidate labels
const CANDIDATE_TAGS = ['project', 'idea', 'reference', 'log', 'task', 'personal', 'work', 'meeting', 'resource'];
const CANDIDATE_TYPES = ['idea', 'log', 'reference', 'task'];

export async function summariseCurrentNote(note: NoteSnapshot): Promise<AiSummaryResult> {
  const pipe = await getSummarisationPipeline();
  const textToSummarise = note.content.slice(0, 4000);

  // Pass options as object. Type definition might be strict, so we cast the options object
  // to 'any' or a specific type if needed, but keeping the pipe call typed.
  // Actually, SummarizationPipeline call signature expects (text, options?).
  // We use 'any' for the options object only to avoid partial type mismatches with GenerationConfig.
  const options: any = {
    max_length: 100,
    min_length: 10,
  };

  const result = await pipe(textToSummarise, options);

  // Result is typically an array of objects
  const outputs = result as unknown as SummarizationOutput[];
  const summaryText = outputs[0]?.summary_text || 'Could not generate summary.';

  return {
    kind: 'summary',
    text: summaryText,
  };
}

export async function suggestTagsForCurrentNote(note: NoteSnapshot): Promise<AiTagSuggestionsResult> {
  const pipe = await getClassificationPipeline();

  // The JS zero-shot pipeline has a specific signature: pipe(text, labels, options)
  // But TextClassificationPipeline type definition might strictly be (text, options).
  // We cast the pipe to 'any' or a specific function signature to invoke it correctly for zero-shot.
  const zeroShotPipe = pipe as unknown as (text: string, labels: string[], options?: any) => Promise<ZeroShotOutput>;

  const result = await zeroShotPipe(note.content.slice(0, 2000), CANDIDATE_TAGS, {
    multi_label: true,
  });

  const suggestions: AiTagSuggestion[] = [];
  if (result.labels && result.scores) {
    for (let i = 0; i < result.labels.length; i++) {
      if (result.scores[i] > 0.3) {
        suggestions.push({
          tag: result.labels[i],
          confidence: result.scores[i],
        });
      }
    }
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);

  return {
    kind: 'tag-suggestions',
    suggestions: suggestions.slice(0, 5),
  };
}

export async function classifyCurrentNote(note: NoteSnapshot): Promise<AiClassificationResult> {
  const pipe = await getClassificationPipeline();
  const zeroShotPipe = pipe as unknown as (text: string, labels: string[], options?: any) => Promise<ZeroShotOutput>;

  const result = await zeroShotPipe(note.content.slice(0, 2000), CANDIDATE_TYPES, {
    multi_label: false,
  });

  const topLabel = result.labels?.[0] || 'unknown';
  const topScore = result.scores?.[0] || 0;

  return {
    kind: 'classification',
    label: topLabel,
    confidence: topScore,
  };
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function findRelatedNotes(
  currentNote: NoteSnapshot,
  candidates: NoteSnapshot[]
): Promise<AiRelatedNotesResult> {
  const pipe = await getEmbeddingPipeline();

  const embed = async (text: string) => {
    if (!text || text.trim().length === 0) return new Float32Array(384); // Zero vector
    // FeatureExtractionPipeline returns Tensor
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    // @ts-ignore: Tensor.data is strictly typed but we know it's a Float32Array for this model
    return output.data as Float32Array;
  };

  const currentVec = await embed(currentNote.content);
  const scoredNotes: AiRelatedNote[] = [];
  const limit = 50;
  const subset = candidates.slice(0, limit);

  for (const candidate of subset) {
    if (candidate.path === currentNote.path) continue;
    if (candidate.content.length < 10) continue;

    const candidateVec = await embed(candidate.content);
    const score = cosineSimilarity(Array.from(currentVec), Array.from(candidateVec));

    if (score > 0.2) {
      scoredNotes.push({
        path: candidate.path,
        title: candidate.title,
        score
      });
    }
  }

  scoredNotes.sort((a, b) => b.score - a.score);

  return {
    kind: 'related-notes',
    notes: scoredNotes.slice(0, 10),
  };
}
