/**
 * Agent-Hub TypeScript 桥接客户端
 * 供 OpenCode 及其他 JS/TS Agent 使用，连接 agent-hub WebSocket 上报事件
 */
import WebSocket from 'ws';

export interface AgentEventPayload {
  sessionId?: string;
  model?: string;
  project?: string;
  messageCount?: number;
  durationMs?: number;
  from?: string;
  to?: string;
  key?: string;
  oldValue?: string;
  newValue?: string;
  tool?: string;
  input?: string;
  output?: string;
  success?: boolean;
}

export interface HubCommand {
  type: string;
  payload: Record<string, unknown>;
}

export type AgentEventHandler = (command: HubCommand) => void;

export class AgentHubBridge {
  private ws: WebSocket | null = null;
  private agentId: string;
  private name: string;
  private hubUrl: string;
  private autoReconnect: boolean;
  private connected = false;
  private onCommand: AgentEventHandler | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(opts: {
    agentId: string;
    name: string;
    hubUrl?: string;
    autoReconnect?: boolean;
  }) {
    this.agentId = opts.agentId;
    this.name = opts.name;
    this.hubUrl = opts.hubUrl || 'ws://localhost:3001/ws';
    this.autoReconnect = opts.autoReconnect ?? true;
  }

  /** 设置命令处理器 */
  onCommand(handler: AgentEventHandler): void {
    this.onCommand = handler;
  }

  /** 启动连接 */
  connect(): void {
    this.connectInternal();
  }

  /** 断开连接 */
  disconnect(): void {
    this.autoReconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  /** 发送 session:start 事件 */
  reportSessionStart(sessionId: string, model?: string, project?: string): void {
    this.sendEvent('session:start', { sessionId, model, project });
  }

  /** 发送 session:end 事件 */
  reportSessionEnd(sessionId: string, messageCount: number, durationMs: number): void {
    this.sendEvent('session:end', { sessionId, messageCount, durationMs });
  }

  /** 发送 model:switch 事件 */
  reportModelSwitch(from: string, to: string): void {
    this.sendEvent('model:switch', { from, to });
  }

  /** 发送 config:change 事件 */
  reportConfigChange(key: string, oldValue: string, newValue: string): void {
    this.sendEvent('config:change', { key, oldValue, newValue });
  }

  /** 发送 tool:exec 事件 */
  reportToolExec(tool: string, input: string, output: string, durationMs: number, success = true): void {
    this.sendEvent('tool:exec', { tool, input: input.slice(0, 500), output: String(output).slice(0, 1000), durationMs, success });
  }

  // ---- 内部 ----

  private connectInternal(): void {
    try {
      this.ws = new WebSocket(this.hubUrl);

      this.ws.on('open', () => {
        this.connected = true;
        this.register();
        console.log(`[agent-hub] bridge connected (${this.agentId})`);
      });

      this.ws.on('message', (raw: Buffer) => {
        try {
          const cmd: HubCommand = JSON.parse(raw.toString());
          this.onCommand?.(cmd);
          if (cmd.type === 'cmd:switch_model') {
            console.log(`[agent-hub] cmd: switch model to ${cmd.payload.model}`);
          } else if (cmd.type === 'cmd:reload_config') {
            console.log('[agent-hub] cmd: reload config');
          }
        } catch { /* ignore */ }
      });

      this.ws.on('close', () => {
        this.connected = false;
        console.log('[agent-hub] bridge disconnected');
        if (this.autoReconnect) {
          this.reconnectTimer = setTimeout(() => this.connectInternal(), 3000);
        }
      });

      this.ws.on('error', (err) => {
        console.error('[agent-hub] bridge error:', err.message);
        this.ws?.close();
      });
    } catch (err) {
      console.error('[agent-hub] bridge connect failed:', err);
      if (this.autoReconnect) {
        this.reconnectTimer = setTimeout(() => this.connectInternal(), 3000);
      }
    }
  }

  private register(): void {
    this.send({ type: 'agent:register', agentId: this.agentId, name: this.name });
  }

  private sendEvent(event: string, payload: Record<string, unknown>): void {
    this.send({
      type: 'agent:event',
      agentId: this.agentId,
      event,
      payload,
      timestamp: new Date().toISOString(),
    });
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.connected || !this.ws) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch { /* ignore */ }
  }
}

/** 创建全局单例 */
let _bridge: AgentHubBridge | null = null;
export function getBridge(agentId = 'opencode', name = 'OpenCode'): AgentHubBridge {
  if (!_bridge) {
    _bridge = new AgentHubBridge({ agentId, name });
    _bridge.connect();
  }
  return _bridge;
}
