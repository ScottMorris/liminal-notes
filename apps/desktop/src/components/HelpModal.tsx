import React, { useMemo } from 'react';
import { commandRegistry } from '../commands/CommandRegistry';
import type { Command, CommandContext, CommandGroup } from '../commands/types';

interface HelpModalProps {
  onClose: () => void;
}

const CONTEXT_ORDER: CommandContext[] = ['Global', 'Editor', 'FileTree'];

const GROUP_ORDER: CommandGroup[] = [
  'File',
  'Edit',
  'Insert',
  'Format',
  'View',
  'Structure',
  'Links',
  'Navigation'
];

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const groupedCommands = useMemo(() => {
    const commands = commandRegistry.getAllCommands();
    const withShortcuts = commands.filter(cmd => !!cmd.shortcut);

    // Group commands by Context -> Group
    const structure: Partial<Record<CommandContext, Partial<Record<CommandGroup, Command[]>>>> = {};

    withShortcuts.forEach(cmd => {
      const ctx = cmd.context;
      const grp = cmd.group;

      if (!structure[ctx]) {
        structure[ctx] = {};
      }
      if (!structure[ctx]![grp]) {
        structure[ctx]![grp] = [];
      }
      structure[ctx]![grp]!.push(cmd);
    });

    return structure;
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <h3>Keyboard Shortcuts</h3>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, paddingRight: '10px' }}>
          {CONTEXT_ORDER.map(context => {
            const groups = groupedCommands[context];
            if (!groups || Object.keys(groups).length === 0) return null;

            return (
              <div key={context} style={{ marginBottom: '30px' }}>
                 <h3 style={{
                  color: 'var(--ln-fg)',
                  fontSize: '1.2em',
                  marginBottom: '15px',
                  borderBottom: '2px solid var(--ln-border)',
                  paddingBottom: '5px'
                }}>
                  {context} Commands
                </h3>

                {GROUP_ORDER.map(group => {
                    const commands = groups[group];
                    if (!commands || commands.length === 0) return null;

                    return (
                        <div key={`${context}-${group}`} style={{ marginBottom: '20px', paddingLeft: '10px' }}>
                            <h4 style={{
                                marginBottom: '10px',
                                color: 'var(--ln-fg-muted)',
                                fontSize: '0.9em',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                            }}>
                                {group}
                            </h4>
                            <ul style={{ listStyle: 'none', padding: 0 }}>
                                {commands.map(cmd => (
                                    <li key={cmd.id} style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>{cmd.label}</span>
                                        <kbd style={{
                                            fontFamily: 'monospace',
                                            background: 'var(--ln-bg-secondary)',
                                            padding: '2px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--ln-border)',
                                            fontSize: '0.85em'
                                        }}>
                                            {cmd.shortcut}
                                        </kbd>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
              </div>
            );
          })}

          <p style={{ marginTop: '20px', fontSize: '0.9rem', color: 'var(--ln-muted)' }}>
            Additional shortcuts may be available depending on your OS.
          </p>
        </div>
      </div>
    </div>
  );
};
