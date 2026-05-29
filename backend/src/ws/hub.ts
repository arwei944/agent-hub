import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ServerEvent } from '../models/agent';

const HEARTBEAT_INTERVAL = 30_000; // 30s 发送一次 ping
const PONG_TIMEOUT = 10_000;       // 10s 未收到 pong 视为断开

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(server: import('http').Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      (ws as any).isAlive = true;
      this.clients.add(ws);
      console.log(`[ws] client connected (${this.clients.size} total)`);

      ws.on('pong', () => {
        (ws as any).isAlive = true;
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[ws] client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[ws] client error:', err.message);
        this.clients.delete(ws);
      });
    });

    // 定时心跳检测
    this.heartbeatTimer = setInterval(() => {
      for (const ws of this.clients) {
        if (!(ws as any).isAlive) {
          console.log('[ws] heartbeat timeout, terminating client');
          this.clients.delete(ws);
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

  /** 向所有已连接客户端广播事件 */
  broadcast(event: ServerEvent): void {
    const data = JSON.stringify(event);
    let sent = 0;
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
        sent++;
      }
    }
    if (sent > 0) {
      console.log(`[ws] broadcast ${event.type} to ${sent} clients`);
    }
  }

  /** 当前连接数 */
  get connectionCount(): number {
    return this.clients.size;
  }

  close(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.wss.close();
  }
}
