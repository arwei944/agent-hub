/** Agent 唯一标识 */
export type AgentId = 'opencode' | 'claude' | 'hermes' | 'codex' | 'grok' | 'cursor';

/** Agent 在线状态 */
export type AgentStatus = 'online' | 'offline' | 'busy' | 'error';

/** Agent 配置快照 */
export interface AgentConfig {
  /** 当前使用的模型 */
  model?: string;
  /** API endpoint */
  endpoint?: string;
  /** 启用的 MCP 工具列表 */
  mcpTools?: string[];
  /** 系统提示词 */
  systemPrompt?: string;
  /** 其他原始配置（按 Agent 不同格式存储） */
  raw: Record<string, unknown>;
}

/** Agent 会话摘要 */
export interface AgentSession {
  id: string;
  title?: string;
  project?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  /** 推断的当前阶段：analysis/coding/debug/testing/done */
  stage?: string;
}

/** Agent 完整状态 */
export interface AgentState {
  id: AgentId;
  name: string;
  status: AgentStatus;
  config: AgentConfig;
  recentSessions: AgentSession[];
  lastUpdated: string;
  /** Agent 特有元数据 */
  metadata: Record<string, unknown>;
}

/** Agent 上报的桥接事件 */
export interface AgentBridgeEvent {
  type: 'agent:register' | 'agent:event';
  agentId: string;
  name?: string;
  event?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

/** 桥接事件记录（存储用） */
export interface BridgeEventRecord {
  id: string;
  agentId: string;
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
  createdAt: string;
}

/** 后端推送给前端的事件类型 */
export type ServerEvent =
  | { type: 'agent:state'; payload: AgentState }
  | { type: 'agent:list'; payload: AgentState[] }
  | { type: 'agent:status'; payload: { id: AgentId; status: AgentStatus } }
  | { type: 'session:update'; payload: { agentId: AgentId; session: AgentSession } }
  | { type: 'bridge:event'; payload: BridgeEventRecord }
  | { type: 'bridge:events'; payload: BridgeEventRecord[] }
  | { type: 'error'; payload: { message: string } };
