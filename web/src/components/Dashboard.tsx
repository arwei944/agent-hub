import type { AgentState } from '../types';

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  offline: '#6b7280',
  busy: '#f59e0b',
  error: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  online: '在线',
  offline: '离线',
  busy: '忙碌',
  error: '异常',
};

function AgentCard({ agent, onClick }: { agent: AgentState; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'pointer',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#93c5fd'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{
          width: '10px', height: '10px', borderRadius: '50%',
          background: STATUS_COLORS[agent.status] || '#6b7280',
          display: 'inline-block',
          flexShrink: 0,
        }} />
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>{agent.name}</h2>
        <span style={{
          fontSize: '12px', color: '#fff',
          background: STATUS_COLORS[agent.status] || '#6b7280',
          padding: '2px 8px', borderRadius: '999px',
          marginLeft: 'auto',
        }}>
          {STATUS_LABELS[agent.status] || agent.status}
        </span>
      </div>

      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
        <div>模型：{agent.config.model || '-'}</div>
        <div>
          MCP 工具：
          {agent.config.mcpTools?.length
            ? agent.config.mcpTools.join(', ')
            : '-'}
        </div>
        <div>会话：{agent.recentSessions.length || 0}</div>
        <div>更新：{new Date(agent.lastUpdated).toLocaleString('zh-CN')}</div>
      </div>

      {agent.recentSessions.length > 0 && (
        <details onClick={(e) => e.stopPropagation()}>
          <summary style={{ cursor: 'pointer', fontSize: '13px', color: '#3b82f6' }}>
            最近会话 ({agent.recentSessions.length})
          </summary>
          <ul style={{ fontSize: '12px', color: '#4b5563', paddingLeft: '16px', marginTop: '4px' }}>
            {agent.recentSessions.map((s) => (
              <li key={s.id}>
                {s.title || s.id.slice(0, 12)} — {s.stage || '-'}
                <span style={{ color: '#9ca3af', marginLeft: '4px' }}>
                  ({s.messageCount} 条消息)
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export function Dashboard({
  agents,
  onSelectAgent,
}: {
  agents: AgentState[];
  onSelectAgent: (id: string) => void;
}) {
  return (
    <div>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>概览</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
          统一智能体管理面板 · 实时更新
        </p>
      </header>

      {agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          暂无 Agent 数据。请检查后端是否正确启动。
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '16px',
        }}>
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onClick={() => onSelectAgent(agent.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
