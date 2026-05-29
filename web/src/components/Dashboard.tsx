import { useState, useEffect, useCallback } from 'react';
import type { AgentState, ServerEvent } from '../types';
import { fetchAgents } from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

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

function AgentCard({ agent }: { agent: AgentState }) {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      transition: 'box-shadow 0.2s',
    }}>
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
        <details>
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

export function Dashboard() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 首次加载
  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // WebSocket 实时更新
  const handleWsEvent = useCallback((event: ServerEvent) => {
    if (event.type === 'agent:state') {
      setAgents((prev) => {
        const idx = prev.findIndex((a) => a.id === event.payload.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = event.payload;
          return next;
        }
        return [...prev, event.payload];
      });
    }
    if (event.type === 'agent:list') {
      setAgents(event.payload);
    }
  }, []);

  useWebSocket(handleWsEvent);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>加载中...</div>;
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#ef4444' }}>
        <p>连接后端失败：{error}</p>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>
          请确保后端已启动：<code>cd backend && npm run dev</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>Agent Hub</h1>
        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '14px' }}>
          统一智能体管理面板 · {agents.length} 个 Agent · 实时更新
        </p>
      </header>

      {agents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          暂无 Agent 数据。
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '16px',
        }}>
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  );
}
