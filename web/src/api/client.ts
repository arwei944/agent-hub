import type { AgentState } from '../types';

const BASE = 'http://localhost:3001/api';

export async function fetchAgents(): Promise<AgentState[]> {
  const res = await fetch(`${BASE}/agents`);
  if (!res.ok) throw new Error(`fetchAgents failed: ${res.status}`);
  return res.json();
}

export async function fetchAgent(id: string): Promise<AgentState> {
  const res = await fetch(`${BASE}/agents/${id}`);
  if (!res.ok) throw new Error(`fetchAgent(${id}) failed: ${res.status}`);
  return res.json();
}

export async function fetchAgentSessions(id: string, limit = 20): Promise<AgentState['recentSessions']> {
  const res = await fetch(`${BASE}/agents/${id}/sessions?limit=${limit}`);
  if (!res.ok) throw new Error(`fetchAgentSessions(${id}) failed: ${res.status}`);
  return res.json();
}

export async function healthCheck(): Promise<{ status: string; clients: number }> {
  const res = await fetch(`${BASE}/health`);
  if (!res.ok) throw new Error(`healthCheck failed: ${res.status}`);
  return res.json();
}
