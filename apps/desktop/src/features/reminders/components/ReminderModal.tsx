import React, { useState, useEffect } from 'react';
import { Reminder, ReminderTarget } from '@liminal-notes/reminders-core';
import { useReminders } from '../../../contexts/RemindersContext';
import { useTabs } from '../../../contexts/TabsContext';
import { XMarkIcon } from '../../../components/Icons';
import { nowLocalIso, getLocalTimezone } from '@liminal-notes/reminders-core';
import { parseISO, format } from 'date-fns';

interface ReminderModalProps {
  onClose: () => void;
  initialReminder?: Reminder;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ onClose, initialReminder }) => {
  const { createReminder, updateReminder } = useReminders();
  const { activeTabId, openTabs } = useTabs();

  const activeTab = openTabs.find(t => t.id === activeTabId);

  // Form State
  const [title, setTitle] = useState(initialReminder?.title || activeTab?.title || '');
  const [body, setBody] = useState(initialReminder?.body || '');

  // Time: datetime-local input expects "yyyy-MM-ddThh:mm"
  // We default to now + 1 hour
  const getDefaultTime = () => {
      if (initialReminder?.trigger.type === 'time') {
           // Convert ISO to local "yyyy-MM-ddThh:mm"
           // initialReminder.trigger.at is already local ISO-like, but might have seconds/ms
           return initialReminder.trigger.at.substring(0, 16);
      }
      const d = new Date();
      d.setHours(d.getHours() + 1);
      d.setMinutes(0);
      d.setSeconds(0);
      // Format to local string manually or use helper?
      // new Date().toISOString() is UTC.
      // We want local.
      const offset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - offset)).toISOString().slice(0, 16);
      return localISOTime;
  };

  const [at, setAt] = useState(getDefaultTime());

  const [repeatKind, setRepeatKind] = useState<'none' | 'daily' | 'weekly' | 'interval'>('none');
  const [intervalMin, setIntervalMin] = useState(60);

  // Target
  // If editing, use existing. If new, use current tab if available.
  const [targetPath, setTargetPath] = useState<string>(
      initialReminder?.target.type === 'path' ? initialReminder.target.path : (activeTab?.path || '')
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Construct trigger
    // "at" is local time. We store it as such, with timezone.
    // Ensure seconds are 00
    const atIso = at + ':00';
    const timezone = getLocalTimezone();

    const trigger: any = {
        type: 'time',
        at: atIso,
        timezone
    };

    if (repeatKind !== 'none') {
        if (repeatKind === 'interval') {
            trigger.repeat = { kind: 'interval', minutes: intervalMin };
        } else if (repeatKind === 'daily') {
            trigger.repeat = { kind: 'daily', interval: 1 };
        } else if (repeatKind === 'weekly') {
            trigger.repeat = { kind: 'weekly', interval: 1 };
        }
    }

    const target: ReminderTarget = { type: 'path', path: targetPath };

    if (initialReminder) {
        await updateReminder(initialReminder.id, {
            title,
            body,
            trigger,
            target
        });
    } else {
        await createReminder({
            title,
            body,
            trigger,
            target,
            priority: 'normal'
        });
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{initialReminder ? 'Edit Reminder' : 'New Reminder'}</h2>
          <button className="reset-btn" onClick={onClose}><XMarkIcon /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body settings-content">
            <div className="setting-item">
                <label>Title</label>
                <input className="input-text" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="setting-item">
                <label>Note Path</label>
                <input className="input-text" value={targetPath} onChange={e => setTargetPath(e.target.value)} placeholder="path/to/note.md" />
            </div>
            <div className="setting-item">
                <label>When</label>
                <input
                    type="datetime-local"
                    className="input-text"
                    value={at}
                    onChange={e => setAt(e.target.value)}
                    required
                />
            </div>

            <div className="setting-item">
                <label>Repeat</label>
                <select className="select-input" value={repeatKind} onChange={e => setRepeatKind(e.target.value as any)}>
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="interval">Every X minutes</option>
                </select>
            </div>

            {repeatKind === 'interval' && (
                <div className="setting-item">
                    <label>Interval (minutes)</label>
                    <input type="number" className="input-text" value={intervalMin} onChange={e => setIntervalMin(parseInt(e.target.value))} min={1} />
                </div>
            )}

            <div className="setting-item">
                <label>Body (Optional)</label>
                <textarea className="input-text" value={body} onChange={e => setBody(e.target.value)} rows={3} />
            </div>

            <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn primary">Save</button>
            </div>
        </form>
      </div>
    </div>
  );
};
