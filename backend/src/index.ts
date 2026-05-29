import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WsHub } from './ws/hub';
import { createRoutes } from './api/routes';
import { AdapterRegistry } from './adapters/registry';
import { AgentAdapter } from './adapters/interface';
import { OpenCodeAdapter } from './adapters/opencode';
import { HermesAdapter } from './adapters/hermes';
import { AgentState } from './models/agent';

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
  registry.register(new HermesAdapter());
  // 后续添加: Claude, Codex, Grok, Cursor 适配器

  // REST API 路由
  app.use('/api', createRoutes(registry.getAll(), wsHub));

  // 定时轮询所有 Agent 状态，变化时广播
  let previousStates = new Map<string, AgentState>();

  async function pollAndBroadcast() {
    try {
      for (const adapter of registry.getAll().values()) {
        const state = await adapter.readState().catch(() => null);
        if (!state) continue;

        const prev = previousStates.get(adapter.id);
        if (!prev || JSON.stringify(prev) !== JSON.stringify(state)) {
          previousStates.set(adapter.id, state);
          wsHub.broadcast({ type: 'agent:state', payload: state });
        }
      }
    } catch (err) {
      console.error('[poll] error:', err);
    }
  }

  // 每 10 秒轮询一次
  const pollInterval = setInterval(pollAndBroadcast, 10_000);

  // 启动后立即轮询一次
  setTimeout(pollAndBroadcast, 500);

  server.listen(PORT, () => {
    console.log(`[agent-hub] server running on http://localhost:${PORT}`);
    console.log(`[agent-hub] ws endpoint ws://localhost:${PORT}/ws`);
    console.log(`[agent-hub] registered adapters: ${Array.from(registry.getAll().keys()).join(', ')}`);
  });

  // 优雅退出
  const shutdown = () => {
    console.log('\n[agent-hub] shutting down...');
    clearInterval(pollInterval);
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
