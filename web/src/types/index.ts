export type AgentId = 'opencode' | 'claude' | 'hermes' | 'codex' | 'grok' | 'cursor';
export type AgentStatus = 'online' | 'offline' | 'busy' | 'error';

export interface AgentConfig {
  model?: string;
  endpoint?: string;
  mcpTools?: string[];
  systemPrompt?: string;
  raw: Record<string, unknown>;
}

export interface AgentSession {
  id: string;
  title?: string;
  project?: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  stage?: string;
}

export interface AgentState {
  id: AgentId;
  name: string;
  status: AgentStatus;
  config: AgentConfig;
  recentSessions: AgentSession[];
  lastUpdated: string;
  metadata: Record<string, unknown>;
}

export type ServerEvent =
  | { type: 'agent:state'; payload: AgentState }
  | { type: 'agent:list'; payload: AgentState[] }
  | { type: 'agent:status'; payload: { id: AgentId; status: AgentStatus } }
  | { type: 'session:update'; payload: { agentId: AgentId; session: AgentSession } }
  | { type: 'error'; payload: { message: string } };
