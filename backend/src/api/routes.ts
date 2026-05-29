import { Router, Request, Response } from 'express';
import { AgentAdapter } from '../adapters/interface';
import { WsHub } from '../ws/hub';
import { AgentConfig } from '../models/agent';

export function createRoutes(adapters: Map<string, AgentAdapter>, wsHub: WsHub): Router {
  const router = Router();

  // GET /api/agents — 获取所有 Agent 状态
  router.get('/agents', async (_req: Request, res: Response) => {
    try {
      const states = await Promise.all(
        Array.from(adapters.values()).map((a) => a.readState())
      );
      res.json(states);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read agent states', detail: String(err) });
    }
  });

  // GET /api/agents/:id — 获取单个 Agent 状态
  router.get('/agents/:id', async (req: Request, res: Response) => {
    const agentId = req.params.id as string;
    const adapter = adapters.get(agentId);
    if (!adapter) {
      res.status(404).json({ error: `Agent '${req.params.id}' not found` });
      return;
    }
    try {
      const state = await adapter.readState();
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: `Failed to read state for ${req.params.id}`, detail: String(err) });
    }
  });

  // GET /api/agents/:id/sessions — 获取 Agent 会话列表
  router.get('/agents/:id/sessions', async (req: Request, res: Response) => {
    const agentId = req.params.id as string;
    const adapter = adapters.get(agentId);
    if (!adapter) {
      res.status(404).json({ error: `Agent '${agentId}' not found` });
      return;
    }
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const sessions = await adapter.readRecentSessions(limit);
      res.json(sessions);
    } catch (err) {
      res.status(500).json({ error: `Failed to read sessions for ${req.params.id}`, detail: String(err) });
    }
  });

  // PUT /api/agents/:id/config — 更新 Agent 配置
  router.put('/agents/:id/config', async (req: Request, res: Response) => {
    const agentId = req.params.id as string;
    const adapter = adapters.get(agentId);
    if (!adapter) {
      res.status(404).json({ error: `Agent '${agentId}' not found` });
      return;
    }
    try {
      const partial: Partial<AgentConfig> = req.body;
      // 合并：先读当前配置，再用请求体覆盖
      const current = await adapter.readConfig();
      const merged: AgentConfig = {
        ...current,
        ...partial,
        raw: current.raw, // 保留完整原生配置
      };
      await adapter.writeConfig(merged);
      // 写完后广播新状态
      const state = await adapter.readState();
      wsHub.broadcast({ type: 'agent:state', payload: state });
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: `Failed to update config for ${agentId}`, detail: String(err) });
    }
  });

  // GET /api/health — 健康检查
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', clients: wsHub.connectionCount });
  });

  return router;
}
