import { useState } from 'react';
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
import './AiSidebar.css';

interface AiSidebarProps {
  currentNote: NoteSnapshot | null;
  onNavigate?: (path: string) => void;
  onClose: () => void;
}

export function AiSidebar({ currentNote, onNavigate, onClose }: AiSidebarProps) {
  const [result, setResult] = useState<AiResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (actionName: string, actionFn: (note: NoteSnapshot) => Promise<AiResult>) => {
    if (!currentNote) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await actionFn(currentNote);
      setResult(res);
    } catch (err) {
      console.error(`Error performing ${actionName}:`, err);
      setError(`Failed to ${actionName}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return <div className="ai-placeholder">Select an action above.</div>;

    switch (result.kind) {
      case 'summary':
        return (
          <div className="ai-result-block">
            <h4>Summary</h4>
            <p>{(result as AiSummaryResult).text}</p>
          </div>
        );
      case 'tag-suggestions':
        return (
          <div className="ai-result-block">
            <h4>Suggested Tags</h4>
            <ul className="ai-tag-list">
              {(result as AiTagSuggestionsResult).suggestions.map((s, i) => (
                <li key={i}>
                  <span className="tag-name">#{s.tag}</span>
                  <span className="tag-confidence">{(s.confidence * 100).toFixed(0)}%</span>
                </li>
              ))}
            </ul>
          </div>
        );
      case 'classification':
        return (
          <div className="ai-result-block">
            <h4>Classification</h4>
            <div className="classification-result">
              <span className="label">{(result as AiClassificationResult).label}</span>
              <span className="confidence">Confidence: {((result as AiClassificationResult).confidence * 100).toFixed(0)}%</span>
            </div>
          </div>
        );
      case 'related-notes':
         const related = (result as AiRelatedNotesResult).notes;
        return (
          <div className="ai-result-block">
            <h4>Related Notes</h4>
            {related.length === 0 ? (
                <p className="no-results">No related notes found (stub).</p>
            ) : (
                <ul className="related-notes-list">
                {related.map((note, i) => (
                    <li key={i}>
                        <button className="link-button" onClick={() => onNavigate?.(note.path)}>
                            {note.title}
                        </button>
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
            >
                Summarise
            </button>
            <button
                onClick={() => handleAction('suggest tags', suggestTagsForCurrentNote)}
                disabled={isLoading}
            >
                Suggest Tags
            </button>
            <button
                onClick={() => handleAction('classify', classifyCurrentNote)}
                disabled={isLoading}
            >
                Classify
            </button>
            <button
                onClick={() => handleAction('find related', (n) => findRelatedNotes(n))} // Wrapper to match signature if needed
                disabled={isLoading}
            >
                Find Related
            </button>
          </div>

          <div className="ai-output-area">
             {isLoading ? <div className="ai-loading">Thinking...</div> : renderResult()}
             {error && <div className="ai-error">{error}</div>}
          </div>
      </div>
    </div>
  );
}
