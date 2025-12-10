import React from 'react';
import { useLinkIndex } from './LinkIndexContext';
import { NotePath } from '../types';

interface BacklinksPanelProps {
  currentFile: NotePath | null;
  onNavigate: (path: NotePath) => void;
}

export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({ currentFile, onNavigate }) => {
  const { linkIndex } = useLinkIndex();

  if (!currentFile) {
    return null;
  }

  const backlinks = linkIndex.backlinks.get(currentFile) || [];

  return (
    <div className="backlinks-panel">
      <h3>Backlinks</h3>
      {backlinks.length > 0 ? (
        <ul className="backlinks-list">
          {backlinks.map((sourcePath) => (
            <li key={sourcePath}>
              <button
                className="backlink-item"
                onClick={() => onNavigate(sourcePath)}
                title={sourcePath}
              >
                {sourcePath}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-backlinks">No backlinks yet.</p>
      )}
    </div>
  );
};
