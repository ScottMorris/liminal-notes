import React, { useState, useEffect, useMemo } from 'react';
import { Reminder, ReminderTarget } from '@liminal-notes/reminders-core';
import { useReminders } from '../../../contexts/RemindersContext';
import { useTabs } from '../../../contexts/TabsContext';
import { useVault } from '../../../hooks/useVault';
import { XMarkIcon, BellIcon } from '../../../components/Icons';
import { getLocalTimezone } from '@liminal-notes/reminders-core';
import { format, isValid } from 'date-fns';

interface ReminderModalProps {
  onClose: () => void;
  initialReminder?: Reminder;
  defaultTarget?: { title: string; path: string };
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ onClose, initialReminder, defaultTarget }) => {
  const { createReminder, updateReminder } = useReminders();
  const { activeTabId, openTabs } = useTabs();
  const { files } = useVault();

  const activeTab = openTabs.find(t => t.id === activeTabId);

  // Defaults
  const getInitialDate = () => {
    if (initialReminder?.trigger.type === 'time') {
        const d = new Date(initialReminder.trigger.at);
        return isValid(d) ? d : new Date();
    }
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    d.setSeconds(0);
    return d;
  };

  const initialDateObj = getInitialDate();

  const [dateStr, setDateStr] = useState(format(initialDateObj, 'yyyy-MM-dd'));
  const [timeStr, setTimeStr] = useState(format(initialDateObj, 'HH:mm'));

  const [title, setTitle] = useState(initialReminder?.title || defaultTarget?.title || activeTab?.title || '');
  const [body, setBody] = useState(initialReminder?.body || '');

  const [repeatKind, setRepeatKind] = useState<'none' | 'daily' | 'weekly' | 'interval'>('none');
  const [intervalMin, setIntervalMin] = useState(60);

  // Target Logic
  const [targetPath, setTargetPath] = useState<string>(
      initialReminder?.target.type === 'path' ? initialReminder.target.path : (defaultTarget?.path || activeTab?.path || '')
  );

  const notePaths = useMemo(() => files.filter(f => !f.is_dir).map(f => f.path), [files]);

  // Initialize repeat kind from reminder if editing
  useEffect(() => {
      if (initialReminder?.trigger.type === 'time' && initialReminder.trigger.repeat) {
          if (initialReminder.trigger.repeat.kind === 'interval') {
              setRepeatKind('interval');
              setIntervalMin(initialReminder.trigger.repeat.minutes);
          } else if (initialReminder.trigger.repeat.kind === 'daily') {
              setRepeatKind('daily');
          } else if (initialReminder.trigger.repeat.kind === 'weekly') {
              setRepeatKind('weekly');
          }
      }
  }, [initialReminder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Combine Date + Time
    const combinedIso = `${dateStr}T${timeStr}:00`;
    const timezone = getLocalTimezone();

    const trigger: any = {
        type: 'time',
        at: combinedIso,
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

  const isContextual = !!defaultTarget;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '400px', padding: '0', backgroundColor: 'var(--ln-bg)', color: 'var(--ln-fg)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
        <div className="modal-header" style={{ padding: '15px 20px', borderBottom: '1px solid var(--ln-border)', display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1.1em', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!initialReminder && <BellIcon size={18} />}
              {initialReminder ? 'Edit Reminder' : 'Set Reminder'}
          </h3>
          <button className="reset-btn" onClick={onClose} style={{ marginLeft: 'auto' }}><XMarkIcon /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>

            {/* Title / Context */}
            {isContextual ? (
                <div style={{ marginBottom: '5px' }}>
                    <div style={{ fontSize: '0.85em', color: 'var(--ln-muted)', marginBottom: '4px' }}>Remind me about</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={title}>{title}</div>
                </div>
            ) : (
                <div className="setting-item" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.9em', color: 'var(--ln-muted)' }}>Title</label>
                    <input
                        className="form-input"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Reminder title..."
                        required
                        style={{ fontSize: '1.1em', fontWeight: 'bold' }}
                    />
                </div>
            )}

            {!isContextual && (
                <div className="setting-item" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontSize: '0.9em', color: 'var(--ln-muted)' }}>Note</label>
                    <input
                        className="form-input"
                        value={targetPath}
                        onChange={e => setTargetPath(e.target.value)}
                        placeholder="Path to note (optional)"
                        list="note-paths"
                    />
                    <datalist id="note-paths">
                        {notePaths.map(p => <option key={p} value={p} />)}
                    </datalist>
                </div>
            )}

            {/* Date & Time Row */}
            <div className="setting-item" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '0.9em', color: 'var(--ln-muted)' }}>When</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="date"
                        className="form-input"
                        value={dateStr}
                        onChange={e => setDateStr(e.target.value)}
                        required
                        style={{ flex: 2 }}
                    />
                    <input
                        type="time"
                        className="form-input"
                        value={timeStr}
                        onChange={e => setTimeStr(e.target.value)}
                        required
                        style={{ flex: 1, minWidth: '120px' }}
                    />
                </div>
            </div>

            {/* Repeat */}
            <div className="setting-item" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                 <label style={{ fontSize: '0.9em', color: 'var(--ln-muted)' }}>Repeat</label>
                 <select
                    className="form-select"
                    value={repeatKind}
                    onChange={e => setRepeatKind(e.target.value as any)}
                >
                    <option value="none">Doesn't repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="interval">Every X minutes</option>
                </select>

                {repeatKind === 'interval' && (
                    <div style={{ marginTop: '5px' }}>
                        <input
                            type="number"
                            className="form-input"
                            value={intervalMin}
                            onChange={e => setIntervalMin(parseInt(e.target.value))}
                            min={1}
                            placeholder="Minutes"
                        />
                    </div>
                )}
            </div>

            {/* Body */}
            <div>
                <textarea
                    className="form-textarea"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={3}
                    placeholder="Add a note..."
                    style={{ resize: 'vertical', minHeight: '80px' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="btn primary" style={{ minWidth: '80px', backgroundColor: 'var(--ln-accent)', color: '#fff', border: 'none' }}>Save</button>
            </div>
        </form>
      </div>
    </div>
  );
};
