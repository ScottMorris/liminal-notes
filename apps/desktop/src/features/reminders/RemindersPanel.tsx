import React, { useState, useMemo } from 'react';
import { useReminders } from '../../contexts/RemindersContext';
import { Reminder } from '@liminal-notes/reminders-core';
import { ReminderModal } from './components/ReminderModal';
import { PencilSquareIcon, CheckCircleIcon } from '../../components/Icons';

type Tab = 'upcoming' | 'snoozed' | 'done';

export const RemindersPanel: React.FC = () => {
  const { reminders, openReminderSheet, completeReminder } = useReminders();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return reminders.filter(r => {
        if (activeTab === 'upcoming') return r.status === 'scheduled';
        if (activeTab === 'snoozed') return r.status === 'snoozed';
        if (activeTab === 'done') return r.status === 'done';
        return false;
    }).sort((a, b) => {
        const ta = a.nextFireAt || '9999';
        const tb = b.nextFireAt || '9999';
        return ta.localeCompare(tb);
    });
  }, [reminders, activeTab]);

  return (
    <div className="reminders-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div className="header" style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--ln-border)', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, flex: 1 }}>Reminders</h2>
        <button className="btn primary" onClick={() => setIsCreating(true)} title="New Reminder" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <PencilSquareIcon size={16} /> New Reminder
        </button>
      </div>

      <div className="tabs" style={{ display: 'flex', marginBottom: '20px', gap: '10px' }}>
          {(['upcoming', 'snoozed', 'done'] as Tab[]).map(tab => (
              <button
                key={tab}
                className={`btn ${activeTab === tab ? 'primary' : ''}`}
                onClick={() => setActiveTab(tab)}
                style={{ textTransform: 'capitalize' }}
              >
                {tab}
              </button>
          ))}
      </div>

      <div className="reminders-list" style={{ flex: 1, overflowY: 'auto' }}>
          {filtered.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', marginTop: '40px' }}>No reminders in this list.</div>}

          {filtered.map(r => (
              <div
                key={r.id}
                className="reminder-item"
                style={{
                    padding: '15px',
                    border: '1px solid var(--ln-border)',
                    borderRadius: '8px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: 'var(--ln-bg-secondary)' // assuming variable or default
                }}
                onClick={() => openReminderSheet(r.id)}
              >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1em' }}>{r.title}</span>
                      {activeTab !== 'done' && (
                        <button
                            className="reset-btn"
                            title="Mark Done"
                            onClick={(e) => { e.stopPropagation(); completeReminder(r.id); }}
                        >
                            <CheckCircleIcon size={20} />
                        </button>
                      )}
                  </div>
                  <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
                      {r.nextFireAt ? new Date(r.nextFireAt).toLocaleString() : (r.status === 'done' ? 'Done' : 'No date')}
                  </div>
                  {r.target.type === 'path' && (
                      <div style={{ fontSize: '0.8em', opacity: 0.6, fontFamily: 'monospace' }}>
                          {r.target.path}
                      </div>
                  )}
              </div>
          ))}
      </div>

      {(isCreating || editingId) && (
          <ReminderModal
            onClose={() => { setIsCreating(false); setEditingId(null); }}
            initialReminder={editingId ? reminders.find(r => r.id === editingId) : undefined}
          />
      )}
    </div>
  );
};
