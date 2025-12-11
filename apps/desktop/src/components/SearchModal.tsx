import React, { useState, useEffect, useRef } from 'react';
import { useSearchIndex, NoteIndexEntry } from './SearchIndexContext';

interface SearchModalProps {
  onClose: () => void;
  onSelect: (path: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, onSelect }) => {
  const { search } = useSearchIndex();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NoteIndexEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Prevent scrolling body when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
        const hits = search(query);
        setResults(hits);
        setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [query, search]);

  useEffect(() => {
      // Scroll selected item into view
      if (listRef.current) {
          const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
          if (selectedElement) {
              selectedElement.scrollIntoView({ block: 'nearest' });
          }
      }
  }, [selectedIndex, results]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        onSelect(results[selectedIndex].path);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          onClose();
      }
  };

  return (
    <div className="search-overlay" onClick={handleOverlayClick}>
      <div className="search-modal">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search notes..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="search-results" ref={listRef}>
          {results.map((result, index) => (
            <div
              key={result.path}
              className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => onSelect(result.path)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <span className="search-result-title">{result.title}</span>
              <span className="search-result-path">{result.path}</span>
            </div>
          ))}
          {query && results.length === 0 && (
             <div className="search-result-item" style={{ cursor: 'default' }}>
                 <span className="search-result-path">No results found</span>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
