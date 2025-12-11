import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px' }}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Save Note</span>
              <kbd>Ctrl/Cmd + S</kbd>
            </li>
            <li style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Search / Quick Open</span>
              <kbd>Ctrl/Cmd + Shift + F</kbd>
            </li>
          </ul>
          <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--ln-muted)' }}>
            Additional shortcuts may be available depending on your OS.
          </p>
        </div>
      </div>
    </div>
  );
};
