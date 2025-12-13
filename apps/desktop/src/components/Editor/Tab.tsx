import React from 'react';
import { OpenTab } from '../../types/tabs';

interface TabProps {
  tab: OpenTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
}

export function Tab({ tab, isActive, onSelect, onClose, onDoubleClick }: TabProps) {
  return (
    <div
      className={`tab ${isActive ? 'active' : ''} ${tab.isDirty ? 'dirty' : ''} ${tab.isPreview ? 'preview' : ''}`}
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onMouseDown={(e) => {
        if (e.button === 1) { // Middle click
          e.preventDefault();
          onClose(e);
        }
      }}
      title={tab.path || tab.title}
    >
      <span className="tab-title" style={tab.isPreview ? { fontStyle: 'italic' } : {}}>{tab.title}</span>
      {tab.isDirty && <span className="tab-dirty-indicator">●</span>}
      <button
        className="tab-close"
        onClick={(e) => {
          e.stopPropagation();
          onClose(e);
        }}
        title="Close Tab"
      >
        ×
      </button>
    </div>
  );
}
