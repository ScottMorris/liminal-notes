import { NoteSnapshot } from '../../plugins/types';
import { getSummarisationPipeline } from './transformersClient';

export interface AiSummaryResult {
  kind: 'summary';
  text: string;
}

export interface AiTagSuggestion {
  tag: string;
  confidence: number; // 0–1
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

export async function summariseCurrentNote(note: NoteSnapshot): Promise<AiSummaryResult> {
  // Check if we can get the pipeline (stub for now)
  await getSummarisationPipeline();

  return {
    kind: 'summary',
    text: 'Summary placeholder for "' + note.title + '".',
  };
}

export async function suggestTagsForCurrentNote(note: NoteSnapshot): Promise<AiTagSuggestionsResult> {
  // Stub logic
  console.log(`[ai] suggestTagsForCurrentNote for ${note.title}`);
  return {
    kind: 'tag-suggestions',
    suggestions: [
      { tag: 'ai/placeholder', confidence: 0.8 },
      { tag: 'note/needs-review', confidence: 0.6 },
    ],
  };
}

export async function classifyCurrentNote(note: NoteSnapshot): Promise<AiClassificationResult> {
    // Stub logic
    console.log(`[ai] classifyCurrentNote for ${note.title}`);
    return {
    kind: 'classification',
    label: 'idea',
    confidence: 0.7,
  };
}

export async function findRelatedNotes(
  note: NoteSnapshot,
  // We might want to pass allNotes here in future, or let the controller access a search service
  // For now, we'll just ignore external context
): Promise<AiRelatedNotesResult> {
    console.log(`[ai] findRelatedNotes for ${note.title}`);
  // For now, return a small, deterministic stub
  return {
    kind: 'related-notes',
    notes: [],
  };
}
