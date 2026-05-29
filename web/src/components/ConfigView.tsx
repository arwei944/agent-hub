import type { AgentConfig } from '../types';

export function ConfigView({ config }: { config: AgentConfig }) {
  const entries = [
    { label: '模型', value: config.model },
    { label: 'Endpoint', value: config.endpoint },
    { label: '系统提示词', value: config.systemPrompt },
  ];

  return (
    <div style={{ fontSize: '14px' }}>
      {/* 结构化字段 */}
      {entries.map((e) =>
        e.value ? (
          <div key={e.label} style={{ marginBottom: '12px' }}>
            <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{e.label}</div>
            <div style={{
              background: '#f9fafb',
              padding: '8px 12px',
              borderRadius: '6px',
              color: '#4b5563',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-all',
              whiteSpace: 'pre-wrap',
            }}>
              {String(e.value)}
            </div>
          </div>
        ) : null
      )}

      {/* MCP 工具 */}
      {config.mcpTools && config.mcpTools.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: '4px' }}>MCP 工具</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {config.mcpTools.map((tool) => (
              <span key={tool} style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '999px',
                fontSize: '12px',
              }}>
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 原始配置 */}
      {Object.keys(config.raw).length > 0 && (
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#6b7280', fontSize: '13px', marginBottom: '4px' }}>
            原始配置 ({Object.keys(config.raw).length} 项)
          </summary>
          <pre style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '12px',
            overflowX: 'auto',
            maxHeight: '400px',
            lineHeight: 1.5,
          }}>
            {JSON.stringify(config.raw, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
