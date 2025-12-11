import { usePluginHost } from '../plugins/PluginHostProvider';
import { builtInPlugins } from '../plugins/registry';

interface PluginsSettingsProps {
  onClose: () => void;
}

export function PluginsSettings({ onClose }: PluginsSettingsProps) {
  const { enabledPlugins, setPluginEnabled } = usePluginHost();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content plugins-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', width: '100%' }}>
        <div className="modal-header">
          <h3>Plugins</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {builtInPlugins.map(p => {
            const isEnabled = enabledPlugins.has(p.meta.id);
            return (
              <div key={p.meta.id} className="plugin-item" style={{
                border: '1px solid var(--border-color)',
                padding: '12px',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 'bold' }}>{p.meta.name}</div>
                  <div style={{ fontSize: '0.9em', color: 'var(--text-secondary)' }}>{p.meta.description}</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setPluginEnabled(p.meta.id, e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
