import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ServerEvent, AgentBridgeEvent, BridgeEventRecord } from '../models/agent';

const HEARTBEAT_INTERVAL = 30_000;
const PONG_TIMEOUT = 10_000;
const MAX_EVENTS = 500; // 内存中保留的最大事件数

/**
 * 区分前端UI客户端和Agent桥接客户端
 */
interface ClientInfo {
  ws: WebSocket;
  type: 'ui' | 'agent';
  agentId?: string;
  agentName?: string;
}

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<ClientInfo>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  /** 内存事件存储 */
  private eventLog: BridgeEventRecord[] = [];

  /** 已注册的 Agent 桥接 */
  private registeredAgents = new Map<string, ClientInfo>();

  constructor(server: import('http').Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      const info: ClientInfo = { ws, type: 'ui' };
      (ws as any).isAlive = true;
      this.clients.add(info);
      console.log(`[ws] client connected (${this.clients.size} total)`);

      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      // 处理 Agent 桥接发送的消息
      ws.on('message', (raw: Buffer) => {
        try {
          const msg: AgentBridgeEvent = JSON.parse(raw.toString());
          this.handleAgentMessage(info, msg);
        } catch {
          // 消息不是合法 JSON 则忽略
        }
      });

      ws.on('close', () => {
        this.clients.delete(info);
        if (info.agentId) {
          this.registeredAgents.delete(info.agentId);
          this.broadcast({ type: 'agent:status', payload: { id: info.agentId as any, status: 'offline' } });
        }
        console.log(`[ws] client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[ws] client error:', err.message);
        ws.close();
      });
    });

    // 心跳检测
    this.heartbeatTimer = setInterval(() => {
      for (const { ws } of this.clients) {
        if (!(ws as any).isAlive) {
          console.log('[ws] heartbeat timeout, terminating client');
          ws.terminate();
          continue;
        }
        (ws as any).isAlive = false;
        ws.ping();
      }
    }, HEARTBEAT_INTERVAL);

    this.wss.on('close', () => {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    });
  }

  /** 向所有 UI 客户端广播事件 */
  broadcast(event: ServerEvent): void {
    const data = JSON.stringify(event);
    let sent = 0;
    for (const { ws, type } of this.clients) {
      if (type === 'ui' && ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        sent++;
      }
    }
    if (sent > 0) {
      console.log(`[ws] broadcast ${event.type} to ${sent} ui clients`);
    }
  }

  /** 向指定 Agent 桥接发送指令 */
  sendToAgent(agentId: string, command: Record<string, unknown>): boolean {
    const agent = this.registeredAgents.get(agentId);
    if (!agent || agent.ws.readyState !== WebSocket.OPEN) return false;
    agent.ws.send(JSON.stringify(command));
    return true;
  }

  /** 获取最近的事件记录 */
  getRecentEvents(limit = 50): BridgeEventRecord[] {
    return this.eventLog.slice(-limit).reverse();
  }

  /** 当前连接数 */
  get connectionCount(): number {
    return this.clients.size;
  }

  /** 已注册的 Agent 数 */
  get agentCount(): number {
    return this.registeredAgents.size;
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.wss.close();
  }

  // ---- 内部 ----

  private handleAgentMessage(info: ClientInfo, msg: AgentBridgeEvent): void {
    switch (msg.type) {
      case 'agent:register':
        info.type = 'agent';
        info.agentId = msg.agentId;
        info.agentName = msg.name;
        this.registeredAgents.set(msg.agentId, info);
        console.log(`[ws] agent registered: ${msg.agentId} (${msg.name})`);
        this.broadcast({ type: 'agent:status', payload: { id: msg.agentId as any, status: 'online' } });
        break;

      case 'agent:event':
        if (!msg.event || !info.agentId) break;
        this.recordEvent(info.agentId, msg.event, msg.payload || {}, msg.timestamp);
        // 桥接事件也广播到前端
        break;

      default:
        break;
    }
  }

  private recordEvent(agentId: string, event: string, payload: Record<string, unknown>, timestamp?: string): void {
    const record: BridgeEventRecord = {
      id: `${agentId}-${event}-${Date.now()}`,
      agentId,
      event,
      payload,
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.eventLog.push(record);
    if (this.eventLog.length > MAX_EVENTS) {
      this.eventLog = this.eventLog.slice(-MAX_EVENTS);
    }

    this.broadcast({ type: 'bridge:event', payload: record });
    console.log(`[ws] bridge event: ${agentId}/${event}`);
  }
}
