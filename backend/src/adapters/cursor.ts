import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { serializeJsonc } from '../utils/json-writer';
import { atomicWrite } from '../utils/atomic-write';

export class CursorAdapter implements AgentAdapter {
  readonly id: AgentId = 'cursor';
  readonly name = 'Cursor';
  readonly configPaths: string[];

  constructor() {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    this.configPaths = [
      join(appData, 'Cursor', 'User', 'settings.json'),
      join(appData, 'Cursor', 'User', 'settings.jsonc'),
    ];
  }

  private getConfigPath(): string {
    return join(
      process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'),
      'Cursor', 'User', 'settings.json'
    );
  }

  async readConfig(): Promise<AgentConfig> {
    const raw: Record<string, unknown> = {};
    // Cursor 可能有 settings.json 或 settings.jsonc
    for (const path of this.configPaths) {
      try {
        const content = await readFile(path, 'utf-8');
        const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
        const parsed = JSON.parse(cleaned);
        Object.assign(raw, parsed);
        break; // 成功读取后停止
      } catch {
        continue; // 尝试下一个路径
      }
    }

    return {
      model: raw['cursor.general.model'] as string ||
             raw['cursor.chat.model'] as string ||
             undefined,
      endpoint: undefined,
      mcpTools: undefined,
      systemPrompt: undefined,
      raw,
    };
  }

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) {
      raw['cursor.general.model'] = config.model;
      raw['cursor.chat.model'] = config.model;
    }
    await atomicWrite(this.getConfigPath(), serializeJsonc(raw));
  }

  async readRecentSessions(_limit = 20): Promise<AgentSession[]> {
    // Phase 2: Cursor 使用 IndexedDB 存储，特殊处理
    return [];
  }

  async ping(): Promise<boolean> {
    for (const path of this.configPaths) {
      try {
        await access(path);
        return true;
      } catch {
        continue;
      }
    }
    return false;
  }

  async readState(): Promise<AgentState> {
    const online = await this.ping();
    let config: AgentConfig;
    try {
      config = await this.readConfig();
    } catch {
      config = { raw: {} };
    }
    const sessions = await this.readRecentSessions();

    return {
      id: this.id,
      name: this.name,
      status: online ? 'online' : 'offline',
      config,
      recentSessions: sessions,
      lastUpdated: new Date().toISOString(),
      metadata: {},
    };
  }
}
