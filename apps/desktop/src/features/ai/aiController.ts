import { NoteSnapshot } from '../../plugins/types';
import * as aiClient from './transformersClient';

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
const CANDIDATE_TAGS = [
    'project', 'idea', 'reference', 'log', 'task', 'personal', 'work', 'meeting', 'resource',
    'journal', 'research', 'article', 'book', 'video', 'podcast', 'quote', 'snippet',
    'archive', 'wip', 'draft', 'review', 'important', 'urgent', 'todo', 'done',
    'bug', 'feature', 'documentation', 'guide', 'tutorial', 'recipe', 'travel', 'finance', 'health',
    'science', 'technology', 'history', 'philosophy', 'art', 'design', 'coding', 'writing'
];
const CANDIDATE_TYPES = ['idea', 'log', 'reference', 'task'];

export async function summariseCurrentNote(
  note: NoteSnapshot,
  onProgress?: aiClient.ProgressListener
): Promise<AiSummaryResult> {
  const textToSummarise = note.content.slice(0, 4000);
  const options = {
    max_length: 100,
    min_length: 10,
  };

  const result = await aiClient.summarise(textToSummarise, options, onProgress);

  // Result is typically an array of objects
  const outputs = result as SummarizationOutput[];
  const summaryText = outputs[0]?.summary_text || 'Could not generate summary.';

  return {
    kind: 'summary',
    text: summaryText,
  };
}

export async function suggestTagsForCurrentNote(
  note: NoteSnapshot,
  onProgress?: aiClient.ProgressListener
): Promise<AiTagSuggestionsResult> {
  const result = (await aiClient.classify(
    note.content.slice(0, 2000),
    CANDIDATE_TAGS,
    true, // multi_label
    onProgress
  )) as ZeroShotOutput;

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

export async function classifyCurrentNote(
  note: NoteSnapshot,
  onProgress?: aiClient.ProgressListener
): Promise<AiClassificationResult> {
  const result = (await aiClient.classify(
    note.content.slice(0, 2000),
    CANDIDATE_TYPES,
    false, // single label
    onProgress
  )) as ZeroShotOutput;

  const topLabel = result.labels?.[0] || 'unknown';
  const topScore = result.scores?.[0] || 0;

  return {
    kind: 'classification',
    label: topLabel,
    confidence: topScore,
  };
}

export async function findRelatedNotes(
  currentNote: NoteSnapshot,
  candidates: NoteSnapshot[],
  onProgress?: aiClient.ProgressListener
): Promise<AiRelatedNotesResult> {
  const subset = candidates.slice(0, 50).map(c => ({
      path: c.path,
      title: c.title,
      content: c.content
  }));

  const notes = (await aiClient.findRelated(
    currentNote.content,
    subset,
    onProgress
  )) as AiRelatedNote[];

  return {
    kind: 'related-notes',
    notes,
  };
}
