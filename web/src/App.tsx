import { useState, useCallback } from 'react';
import type { AgentState, ServerEvent } from './types';
import { fetchAgents } from './api/client';
import { useWebSocket } from './hooks/useWebSocket';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { AgentDetail } from './components/AgentDetail';

type View = { type: 'dashboard' } | { type: 'agent'; agentId: string };

export default function App() {
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ type: 'dashboard' });

  // 首次加载
  useState(() => {
    fetchAgents()
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  });

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

  const handleSelectAgent = useCallback((id: string) => {
    setView({ type: 'agent', agentId: id });
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setView({ type: 'dashboard' });
  }, []);

  const selectedAgentId = view.type === 'agent' ? view.agentId : null;

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <Sidebar
        agents={agents}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
        onBackToDashboard={handleBackToDashboard}
      />

      <main style={{
        flex: 1,
        padding: '24px 32px',
        overflowY: 'auto',
        maxWidth: '1200px',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#6b7280' }}>加载中...</div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '48px', color: '#ef4444' }}>
            <p>连接后端失败：{error}</p>
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              请确保后端已启动：<code>cd backend && npm run dev</code>
            </p>
          </div>
        ) : view.type === 'dashboard' ? (
          <Dashboard agents={agents} onSelectAgent={handleSelectAgent} />
        ) : (
          (() => {
            const agent = agents.find((a) => a.id === view.agentId);
            return agent
              ? <AgentDetail agent={agent} />
              : <div style={{ color: '#9ca3af', padding: '48px', textAlign: 'center' }}>Agent 未找到</div>;
          })()
        )}
      </main>
    </div>
  );
}
