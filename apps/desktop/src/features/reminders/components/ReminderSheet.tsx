import React, { useMemo } from 'react';
import { useReminders } from '../../../contexts/RemindersContext';
import { useTabs } from '../../../contexts/TabsContext';
import { useVault } from '../../../hooks/useVault';
import { XMarkIcon, PencilSquareIcon, BanIcon, CheckCircleIcon } from '../../../components/Icons'; // Need CheckCircleIcon maybe? Or use something else.
import ReactMarkdown from 'react-markdown';

// Mock CheckCircle if not exists, or I can add it.
// I'll use simple buttons.

export const ReminderSheet: React.FC = () => {
  const {
    reminders,
    activeReminderId,
    closeReminderSheet,
    snoozeReminder,
    completeReminder,
    deleteReminder
  } = useReminders();

  const { openTab } = useTabs();
  const { files } = useVault();

  const reminder = useMemo(() =>
    reminders.find(r => r.id === activeReminderId),
  [reminders, activeReminderId]);

  if (!activeReminderId || !reminder) return null;

  const handleOpenTarget = () => {
    if (reminder.target.type === 'path') {
        openTab({
            id: reminder.target.path,
            path: reminder.target.path,
            title: reminder.target.path.split('/').pop() || 'Note',
            mode: 'source',
            isDirty: false,
            isLoading: false,
            isUnsaved: false,
            isPreview: false,
            editorState: ''
        });
        closeReminderSheet();
    } else if (reminder.target.type === 'note') {
        // Find file by note ID? We don't have note IDs indexed by default in `files`.
        // We usually use path.
        // If target is note, we might need to search.
        // For MVP, we assume path target mainly or naive resolution.
        console.warn('Note ID target not fully implemented, falling back to path if valid');
    }
  };

  const handleSnooze = (minutes: number) => {
      snoozeReminder(reminder.id, minutes);
      closeReminderSheet();
  };

  const handleDone = () => {
      completeReminder(reminder.id);
      closeReminderSheet();
  };

  return (
    <div className="modal-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) closeReminderSheet();
    }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{reminder.title}</h2>
          <button className="reset-btn" onClick={closeReminderSheet}>
            <XMarkIcon size={24} />
          </button>
        </div>
        <div className="modal-body">
            {reminder.body && (
                <div className="markdown-preview" style={{ marginBottom: '1rem' }}>
                    <ReactMarkdown>{reminder.body}</ReactMarkdown>
                </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
                <button className="btn primary" onClick={handleOpenTarget}>
                    Open Note
                </button>
            </div>

            <div className="settings-section">
                <h3>Actions</h3>
                <div className="actions-row" style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn" onClick={() => handleSnooze(10)}>Snooze 10m</button>
                    <button className="btn" onClick={() => handleSnooze(60)}>Snooze 1h</button>
                    <button className="btn" onClick={() => handleSnooze(60 * 24)}>Snooze 1d</button>
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '10px' }}>
                    <button className="btn primary" onClick={handleDone}>Mark Done</button>
                    {/* Edit to be implemented - maybe switch to editor mode? */}
                    <button className="btn danger" onClick={() => {
                        if(confirm('Delete reminder?')) {
                            deleteReminder(reminder.id);
                            closeReminderSheet();
                        }
                    }}>Delete</button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
