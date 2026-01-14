import React from 'react';
import './FileConflictBanner.css';
import { ExclamationTriangleIcon } from './Icons';

interface FileConflictBannerProps {
  onReload: () => void;
  onKeepMine: () => void;
  onDismiss: () => void;
}

export const FileConflictBanner: React.FC<FileConflictBannerProps> = ({
  onReload,
  onKeepMine,
  onDismiss,
}) => {
  return (
    <div className="file-conflict-banner">
      <div className="conflict-message">
        <span className="warning-icon"><ExclamationTriangleIcon size={18} /></span>
        <strong>External Change Detected:</strong> This file has been modified on disk.
      </div>
      <div className="conflict-actions">
        <button className="btn-conflict-action primary" onClick={onReload}>
          Reload (Discard Changes)
        </button>
        <button className="btn-conflict-action" onClick={onKeepMine}>
          Keep Mine
        </button>
        <button className="btn-conflict-action" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
};
