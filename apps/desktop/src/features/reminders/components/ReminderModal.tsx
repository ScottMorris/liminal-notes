import React, { useState, useEffect } from 'react';
import { Reminder, ReminderTarget } from '@liminal-notes/reminders-core';
import { useReminders } from '../../../contexts/RemindersContext';
import { useTabs } from '../../../contexts/TabsContext';
import { XMarkIcon, BellIcon } from '../../../components/Icons';
import { getLocalTimezone } from '@liminal-notes/reminders-core';
import { format, addHours, parseISO, isValid } from 'date-fns';

interface ReminderModalProps {
  onClose: () => void;
  initialReminder?: Reminder;
  defaultTarget?: { title: string; path: string };
}

export const ReminderModal: React.FC<ReminderModalProps> = ({ onClose, initialReminder, defaultTarget }) => {
  const { createReminder, updateReminder } = useReminders();
  const { activeTabId, openTabs } = useTabs();

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
  // If defaultTarget provided (from Note), we use it.
  // If not, we let user edit path.
  const [targetPath, setTargetPath] = useState<string>(
      initialReminder?.target.type === 'path' ? initialReminder.target.path : (defaultTarget?.path || activeTab?.path || '')
  );

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

  // Determine if we show target input
  // If creating from a note (defaultTarget present), maybe hide it or show as static?
  // User said "uses the note for the base information".
  const isContextual = !!defaultTarget;

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: '400px', padding: '0' }}>
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
                    <div style={{ fontSize: '0.85em', color: 'var(--ln-muted)', marginBottom: '2px' }}>Remind me about</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{title}</div>
                    {/* Hidden input to keep state sync if needed, or just rely on state */}
                </div>
            ) : (
                <div className="setting-item" style={{ marginBottom: 0 }}>
                    <input
                        className="input-text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Reminder title..."
                        required
                        style={{ fontSize: '1.1em', fontWeight: 'bold' }}
                    />
                </div>
            )}

            {!isContextual && (
                <div className="setting-item" style={{ marginBottom: 0 }}>
                    <input
                        className="input-text"
                        value={targetPath}
                        onChange={e => setTargetPath(e.target.value)}
                        placeholder="Path to note (optional)"
                        style={{ fontSize: '0.9em' }}
                    />
                </div>
            )}

            {/* Date & Time Row */}
            <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                    <input
                        type="date"
                        className="input-text"
                        value={dateStr}
                        onChange={e => setDateStr(e.target.value)}
                        required
                    />
                </div>
                <div style={{ width: '120px' }}>
                    <input
                        type="time"
                        className="input-text"
                        value={timeStr}
                        onChange={e => setTimeStr(e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* Repeat */}
            <div>
                <select
                    className="select-input"
                    value={repeatKind}
                    onChange={e => setRepeatKind(e.target.value as any)}
                    style={{ width: '100%' }}
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
                            className="input-text"
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
                    className="input-text"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={2}
                    placeholder="Add a note..."
                    style={{ resize: 'none' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="submit" className="btn primary" style={{ minWidth: '80px' }}>Save</button>
            </div>
        </form>
      </div>
    </div>
  );
};
