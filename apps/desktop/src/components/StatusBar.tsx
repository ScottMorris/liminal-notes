import { usePluginHost } from '../plugins/PluginHostProvider';

export function StatusBar() {
  const { statusItems } = usePluginHost();

  if (statusItems.length === 0) return null;

  return (
    <div className="status-bar" style={{
      display: 'flex',
      gap: '12px',
      padding: '4px 12px',
      borderTop: '1px solid var(--ln-border)',
      fontSize: '0.85rem',
      backgroundColor: 'var(--ln-sidebar-bg)',
      color: 'var(--ln-sidebar-fg)',
      userSelect: 'none',
      flexShrink: 0
    }}>
      {statusItems.map(item => (
        <span key={item.id} title={item.tooltip}>
          {item.label}: <strong>{item.value}</strong>
        </span>
      ))}
    </div>
  );
}
