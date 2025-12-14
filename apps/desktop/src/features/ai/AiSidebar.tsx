import { useState, useEffect } from 'react';
import { NoteSnapshot } from '../../plugins/types';
import {
  summariseCurrentNote,
  suggestTagsForCurrentNote,
  classifyCurrentNote,
  findRelatedNotes,
  AiResult,
  AiSummaryResult,
  AiTagSuggestionsResult,
  AiClassificationResult,
  AiRelatedNotesResult
} from './aiController';
import { useSearchIndex } from '../../components/SearchIndexContext';
import { AiState } from '../../types/tabs';
import './AiSidebar.css';

interface AiSidebarProps {
  currentNote: NoteSnapshot | null;
  aiState?: AiState;
  onUpdateAiState: (state: AiState) => void;
  onNavigate?: (path: string) => void;
  onClose: () => void;
  onInsertAtCursor: (text: string) => void;
  onUpdateFrontmatter: (updater: (data: any) => void) => void;
}

export function AiSidebar({ currentNote, aiState, onUpdateAiState, onNavigate, onClose, onInsertAtCursor, onUpdateFrontmatter }: AiSidebarProps) {
  const { search } = useSearchIndex();

  const result = aiState?.result || null;
  const isLoading = aiState?.isLoading || false;
  const error = aiState?.error || null;

  const updateState = (updates: Partial<AiState>) => {
      onUpdateAiState({
          result: updates.result !== undefined ? updates.result : result,
          isLoading: updates.isLoading !== undefined ? updates.isLoading : isLoading,
          error: updates.error !== undefined ? updates.error : error
      });
  };

  const handleAction = async (actionName: string, actionFn: (note: NoteSnapshot) => Promise<AiResult>) => {
    if (!currentNote) return;
    updateState({ isLoading: true, error: null });
    try {
      const res = await actionFn(currentNote);
      updateState({ result: res, isLoading: false });
    } catch (err) {
      console.error(`Error performing ${actionName}:`, err);
      updateState({
          error: `Failed to ${actionName}. ${(err as Error).message || ''}`,
          isLoading: false
      });
    }
  };

  const handleFindRelated = async () => {
    if (!currentNote) return;
    updateState({ isLoading: true, error: null });
    try {
        const candidates = search('e').map(entry => ({
            path: entry.path,
            title: entry.title,
            content: entry.content
        }));

        const res = await findRelatedNotes(currentNote, candidates);
        updateState({ result: res, isLoading: false });
    } catch (err) {
      console.error('Error finding related notes:', err);
      updateState({ error: 'Failed to find related notes.', isLoading: false });
    }
  };

  const renderResult = () => {
    if (!result) return <div className="ai-placeholder">Select an action above.</div>;

    switch (result.kind) {
      case 'summary':
        const summaryText = (result as AiSummaryResult).text;
        return (
          <div className="ai-result-block">
            <h4>Summary</h4>
            <p className="summary-text">{summaryText}</p>
            <div className="result-actions">
                <button onClick={() => onInsertAtCursor(summaryText)}>Insert at Cursor</button>
                <button onClick={() => onInsertAtCursor(`> **AI Summary**\n> ${summaryText}\n\n`)}>Insert as Quote</button>
            </div>
          </div>
        );
      case 'tag-suggestions':
        return (
          <div className="ai-result-block">
            <h4>Suggested Tags</h4>
            <ul className="ai-tag-list">
              {(result as AiTagSuggestionsResult).suggestions.map((s, i) => (
                <li key={i}>
                  <div className="tag-info">
                      <span className="tag-name">#{s.tag}</span>
                      <span className="tag-confidence">{(s.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <button onClick={() => {
                      onUpdateFrontmatter((data) => {
                          const existingTags = data.tags || [];
                          // Handle string vs array
                          const tagsArray = Array.isArray(existingTags) ? existingTags : [existingTags];
                          if (!tagsArray.includes(s.tag)) {
                              data.tags = [...tagsArray, s.tag];
                          }
                      });
                  }}>Add</button>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'classification':
        const { label, confidence } = result as AiClassificationResult;
        return (
          <div className="ai-result-block">
            <h4>Classification</h4>
            <div className="classification-result">
              <span className="label">{label}</span>
              <span className="confidence">Confidence: {(confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="result-actions">
                <button onClick={() => {
                    onUpdateFrontmatter((data) => {
                        data.type = label;
                    });
                }}>Apply Type</button>
            </div>
          </div>
        );
      case 'related-notes':
         const related = (result as AiRelatedNotesResult).notes;
        return (
          <div className="ai-result-block">
            <h4>Related Notes</h4>
            {related.length === 0 ? (
                <p className="no-results">No related notes found.</p>
            ) : (
                <ul className="related-notes-list">
                {related.map((note, i) => (
                    <li key={i}>
                        <div className="related-note-info">
                            <span className="related-note-title" title={note.path}>{note.title}</span>
                            <span className="related-note-score">{(note.score * 100).toFixed(0)}%</span>
                        </div>
                        <div className="related-note-actions">
                            <button className="small-btn" onClick={() => onNavigate?.(note.path)}>Open</button>
                            <button className="small-btn" onClick={() => onInsertAtCursor(`[[${note.title}]]`)}>Link</button>
                        </div>
                    </li>
                ))}
                </ul>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  if (!currentNote) {
    return (
      <div className="ai-sidebar">
        <div className="ai-header">
          <h3>AI Assistant</h3>
          <button className="close-btn" onClick={onClose} title="Close">×</button>
        </div>
        <div className="ai-content empty">
          <p>Open a note to use AI features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-sidebar">
      <div className="ai-header">
        <h3>AI Assistant</h3>
        <button className="close-btn" onClick={onClose} title="Close">×</button>
      </div>

      <div className="ai-content">
          <div className="ai-actions">
            <button
                onClick={() => handleAction('summarise', summariseCurrentNote)}
                disabled={isLoading}
                title="Summarise this note"
            >
                Summarise
            </button>
            <button
                onClick={() => handleAction('suggest tags', suggestTagsForCurrentNote)}
                disabled={isLoading}
                title="Suggest tags based on content"
            >
                Tags
            </button>
            <button
                onClick={() => handleAction('classify', classifyCurrentNote)}
                disabled={isLoading}
                title="Classify note type"
            >
                Classify
            </button>
            <button
                onClick={handleFindRelated}
                disabled={isLoading}
                title="Find related notes"
            >
                Related
            </button>
          </div>

          <div className="ai-output-area">
             {isLoading ? <div className="ai-loading">Thinking... (This may take a moment to load models)</div> : renderResult()}
             {error && <div className="ai-error">{error}</div>}
          </div>
      </div>
    </div>
  );
}
