import { Router, Request, Response } from 'express';
import { AgentAdapter } from '../adapters/interface';
import { WsHub } from '../ws/hub';
import { AgentConfig } from '../models/agent';
import { ProjectStore } from './project-store';
import { CreateProjectRequest, UpdateProjectRequest } from '../models/project';
import { SearchEngine } from './search';

export function createRoutes(adapters: Map<string, AgentAdapter>, wsHub: WsHub, projects?: ProjectStore, search?: SearchEngine): Router {
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

  // GET /api/bridge/events — 获取桥接事件记录
  router.get('/bridge/events', (req: Request, res: Response) => {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    res.json(wsHub.getRecentEvents(limit));
  });

  // POST /api/bridge/command — 向 Agent 桥接发送指令
  router.post('/bridge/command', (req: Request, res: Response) => {
    const { agentId, command } = req.body as { agentId: string; command: Record<string, unknown> };
    if (!agentId || !command) {
      res.status(400).json({ error: 'agentId and command are required' });
      return;
    }
    const sent = wsHub.sendToAgent(agentId, command);
    if (sent) {
      res.json({ status: 'sent', agentId });
    } else {
      res.status(404).json({ error: `Agent '${agentId}' not connected` });
    }
  });

  // ---- 项目路由 ----
  if (projects) {
    // GET /api/projects — 获取所有项目
    router.get('/projects', (_req: Request, res: Response) => {
      res.json(projects.list());
    });

    // POST /api/projects — 创建项目
    router.post('/projects', (req: Request, res: Response) => {
      const body = req.body as CreateProjectRequest;
      if (!body.name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }
      const project = projects.create(body);
      res.status(201).json(project);
    });

    // GET /api/projects/:id — 获取项目详情
    router.get('/projects/:id', (req: Request, res: Response) => {
      const project = projects.get(req.params.id as string);
      if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
      res.json(project);
    });

    // PUT /api/projects/:id — 更新项目
    router.put('/projects/:id', (req: Request, res: Response) => {
      const project = projects.update(req.params.id as string, req.body as UpdateProjectRequest);
      if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
      res.json(project);
    });

    // DELETE /api/projects/:id — 删除项目
    router.delete('/projects/:id', (req: Request, res: Response) => {
      if (!projects.delete(req.params.id as string)) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      res.json({ status: 'deleted' });
    });
  }

  // ---- 搜索 ----
  if (search) {
    router.get('/search', async (req: Request, res: Response) => {
      const q = req.query.q as string;
      if (!q) { res.status(400).json({ error: 'query param q is required' }); return; }
      try {
        const results = await search.search(q, {
          agentId: req.query.agent as string | undefined,
          limit: parseInt(req.query.limit as string, 10) || 50,
        });
        res.json(results);
      } catch (err) {
        res.status(500).json({ error: 'Search failed', detail: String(err) });
      }
    });
  }

  // GET /api/health — 健康检查
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', clients: wsHub.connectionCount });
  });

  return router;
}
