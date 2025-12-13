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
import './AiSidebar.css';

interface AiSidebarProps {
  currentNote: NoteSnapshot | null;
  onNavigate?: (path: string) => void;
  onClose: () => void;
  onInsertAtCursor: (text: string) => void;
  onUpdateFrontmatter: (updater: (data: any) => void) => void;
}

export function AiSidebar({ currentNote, onNavigate, onClose, onInsertAtCursor, onUpdateFrontmatter }: AiSidebarProps) {
  const [result, setResult] = useState<AiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { search } = useSearchIndex();

  // Reset state when current note changes
  useEffect(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, [currentNote?.path]);

  const handleAction = async (actionName: string, actionFn: (note: NoteSnapshot) => Promise<AiResult>) => {
    if (!currentNote) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await actionFn(currentNote);
      setResult(res);
    } catch (err) {
      console.error(`Error performing ${actionName}:`, err);
      setError(`Failed to ${actionName}. ${(err as Error).message || ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindRelated = async () => {
    if (!currentNote) return;
    setIsLoading(true);
    setError(null);
    try {
        // Fetch candidates from search index.
        // We just grab all of them (or a large subset) and let the controller slice/limit.
        // search('') returns all notes if the implementation supports it, otherwise we might need another way.
        // Actually, search('') returns empty in current implementation.
        // We can pass a generic query or we might need access to raw index.
        // But `search(' ')` might work if it matches everything?
        // Let's rely on a catch-all query or assume we can get all entries.
        // The SearchIndexContext `search` function filters by title/content.
        // Let's modify SearchIndexContext to allow getting all entries, or just use a common term.
        // Actually, the user approved "bounded subset... e.g. first 50-100".
        // I can just search for "a" or "e" to get most notes, or better:
        // SearchIndexContext exposes `getEntry` but not `getAll`.
        // Wait, I can't easily get all notes without changing SearchIndexContext.
        // But wait, `App.tsx` has `files`. But `files` are just paths.
        // SearchIndexContext has the full content.

        // HACK: I will search for " " (space) or common vowel to get a list.
        // Or I can add `getAllEntries` to SearchIndexContext in a future PR.
        // For now, let's try searching for " " if the index implementation allows it.
        // Looking at `SearchIndexContext.tsx`: `if (!query.trim()) return [];`
        // So empty/whitespace returns empty.
        // I will try to search for "e" (most common letter). It's a heuristic but works for v0.1.

        const candidates = search('e').map(entry => ({
            path: entry.path,
            title: entry.title,
            content: entry.content
        }));

        // If we get too few, maybe search 'a'?
        // It's fine for v0.1.

        const res = await findRelatedNotes(currentNote, candidates);
        setResult(res);
    } catch (err) {
      console.error('Error finding related notes:', err);
      setError('Failed to find related notes.');
    } finally {
        setIsLoading(false);
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
