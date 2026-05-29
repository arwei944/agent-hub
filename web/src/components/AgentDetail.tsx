import type { AgentState } from '../types';
import { ConfigView } from './ConfigView';

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

export function AgentDetail({ agent }: { agent: AgentState }) {
  return (
    <div>
      {/* 头部 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <span style={{
          width: '14px', height: '14px', borderRadius: '50%',
          background: STATUS_COLORS[agent.status] || '#6b7280',
        }} />
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{agent.name}</h1>
        <span style={{
          fontSize: '13px', color: '#fff',
          background: STATUS_COLORS[agent.status] || '#6b7280',
          padding: '3px 10px', borderRadius: '999px',
        }}>
          {STATUS_LABELS[agent.status] || agent.status}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9ca3af' }}>
          最后更新：{new Date(agent.lastUpdated).toLocaleString('zh-CN')}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* 左栏：配置 */}
        <section style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>配置</h2>
          <ConfigView config={agent.config} />
        </section>

        {/* 右栏：会话 + 元数据 */}
        <section style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>最近会话</h2>

          {agent.recentSessions.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>暂无会话数据</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {agent.recentSessions.map((s) => (
                <li key={s.id} style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '13px',
                }}>
                  <div style={{ fontWeight: 500, color: '#374151' }}>
                    {s.title || s.id.slice(0, 16)}
                  </div>
                  <div style={{ color: '#6b7280', marginTop: '2px' }}>
                    项目：{s.project || '-'} · 阶段：{s.stage || '-'} · {s.messageCount} 条消息
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                    {new Date(s.updatedAt).toLocaleString('zh-CN')}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* 元数据 */}
          {Object.keys(agent.metadata).length > 0 && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6b7280', fontSize: '13px' }}>
                元数据
              </summary>
              <pre style={{
                background: '#1e293b', color: '#e2e8f0',
                padding: '12px', borderRadius: '6px',
                fontSize: '12px', overflowX: 'auto', marginTop: '8px',
              }}>
                {JSON.stringify(agent.metadata, null, 2)}
              </pre>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}
