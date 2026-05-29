import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WsHub } from './ws/hub';
import { createRoutes } from './api/routes';
import { AdapterRegistry } from './adapters/registry';
import { OpenCodeAdapter } from './adapters/opencode';
import { ClaudeAdapter } from './adapters/claude';
import { HermesAdapter } from './adapters/hermes';
import { CodexAdapter } from './adapters/codex';
import { GrokAdapter } from './adapters/grok';
import { CursorAdapter } from './adapters/cursor';
import { AgentState } from './models/agent';
import { FileWatcher } from './watcher/file-watcher';
import { ProjectStore } from './api/project-store';
import { ProjectAssigner } from './watcher/project-assigner';
import { SearchEngine } from './api/search';

const PORT = parseInt(process.env.PORT || '3001', 10);

async function main() {
  // HTTP + WebSocket 服务器
  const app = express();
  app.use(cors());
  app.use(express.json());

  const server = createServer(app);
  const wsHub = new WsHub(server);

  // 注册 Agent 适配器
  const registry = new AdapterRegistry();
  registry.register(new OpenCodeAdapter());
  registry.register(new ClaudeAdapter());
  registry.register(new HermesAdapter());
  registry.register(new CodexAdapter());
  registry.register(new GrokAdapter());
  registry.register(new CursorAdapter());

  // 项目存储
  const projectStore = new ProjectStore();

  // 搜索引擎
  const searchEngine = new SearchEngine(registry);

  // REST API 路由
  app.use('/api', createRoutes(registry.getAll(), wsHub, projectStore, searchEngine));

  // Agent 状态缓存，用于检测变化
  let previousStates = new Map<string, AgentState>();

  async function readAndBroadcast(adapterId?: string) {
    const adapters = adapterId
      ? [registry.get(adapterId)].filter(Boolean)
      : Array.from(registry.getAll().values());

    for (const adapter of adapters) {
      if (!adapter) continue;
      const state = await adapter.readState().catch(() => null);
      if (!state) continue;

      const prev = previousStates.get(adapter.id);
      if (!prev || JSON.stringify(prev) !== JSON.stringify(state)) {
        previousStates.set(adapter.id, state);
        wsHub.broadcast({ type: 'agent:state', payload: state });
      }
    }
  }

  // 文件系统实时监听（事件驱动，秒级响应）
  const fileWatcher = new FileWatcher(registry.getAll(), (agentId) => {
    readAndBroadcast(agentId);
  });

  // 项目自动关联（每 60 秒扫描一次）
  const projectAssigner = new ProjectAssigner(registry, projectStore, wsHub);
  projectAssigner.start(60_000);

  // 兜底轮询（每 30 秒，确保文件监听遗漏的变更也能被检测）
  const pollInterval = setInterval(() => readAndBroadcast(), 30_000);

  // 启动后立即读取一次
  setTimeout(() => readAndBroadcast(), 500);

  server.listen(PORT, () => {
    console.log(`[agent-hub] server running on http://localhost:${PORT}`);
    console.log(`[agent-hub] ws endpoint ws://localhost:${PORT}/ws`);
    console.log(`[agent-hub] registered adapters: ${Array.from(registry.getAll().keys()).join(', ')}`);
    console.log(`[agent-hub] file watcher active, fallback poll 30s`);
  });

  // 优雅退出
  const shutdown = () => {
    console.log('\n[agent-hub] shutting down...');
    clearInterval(pollInterval);
    projectAssigner.stop();
    fileWatcher.close();
    wsHub.close();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[agent-hub] fatal:', err);
  process.exit(1);
});
