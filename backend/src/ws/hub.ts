import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { ServerEvent } from '../models/agent';

export class WsHub {
  private wss: WebSocketServer;
  private clients = new Set<WebSocket>();

  constructor(server: import('http').Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
      this.clients.add(ws);
      console.log(`[ws] client connected (${this.clients.size} total)`);

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log(`[ws] client disconnected (${this.clients.size} total)`);
      });

      ws.on('error', (err) => {
        console.error('[ws] client error:', err.message);
        this.clients.delete(ws);
      });
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
    this.wss.close();
  }
}
