import type { AgentState } from '../types';

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  offline: '#6b7280',
  busy: '#f59e0b',
  error: '#ef4444',
};

export function Sidebar({
  agents,
  selectedAgentId,
  onSelectAgent,
  onBackToDashboard,
}: {
  agents: AgentState[];
  selectedAgentId: string | null;
  onSelectAgent: (id: string) => void;
  onBackToDashboard: () => void;
}) {
  const onlineCount = agents.filter((a) => a.status === 'online').length;

  return (
    <aside style={{
      width: '220px',
      background: '#fff',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0,
    }}>
      {/* 标题 */}
      <div style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid #e5e7eb',
        cursor: 'pointer',
      }} onClick={onBackToDashboard}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111' }}>
          Agent Hub
        </h1>
        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#9ca3af' }}>
          {agents.length} 个 Agent · {onlineCount} 在线
        </p>
      </div>

      {/* Agent 列表 */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {agents.map((agent) => {
          const isSelected = selectedAgentId === agent.id;
          return (
            <div
              key={agent.id}
              onClick={() => onSelectAgent(agent.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                background: isSelected ? '#f0f9ff' : 'transparent',
                color: isSelected ? '#2563eb' : '#374151',
                fontWeight: isSelected ? 600 : 400,
                marginBottom: '2px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#f3f4f6'; }}
              onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: STATUS_COLORS[agent.status] || '#6b7280',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '14px' }}>{agent.name}</span>
            </div>
          );
        })}
      </nav>

      {/* 底部状态 */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #e5e7eb',
        fontSize: '12px',
        color: '#6b7280',
      }}>
        实时更新 · 10s 轮询
      </div>
    </aside>
  );
}
