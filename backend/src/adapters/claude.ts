import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';

export class ClaudeAdapter implements AgentAdapter {
  readonly id: AgentId = 'claude';
  readonly name = 'Claude';
  readonly configPaths: string[];

  constructor() {
    const appData = process.env.APPDATA || join(homedir(), 'AppData', 'Roaming');
    this.configPaths = [join(appData, 'Claude', 'claude_desktop_config.json')];
  }

  private getConfigPath(): string {
    return this.configPaths[0];
  }

  async readConfig(): Promise<AgentConfig> {
    const raw: Record<string, unknown> = {};
    try {
      const content = await readFile(this.getConfigPath(), 'utf-8');
      const parsed = JSON.parse(content);
      Object.assign(raw, parsed);
    } catch {
      // 配置文件不存在时返回空
    }

    return {
      model: raw.model as string | undefined,
      mcpTools: raw.mcpServers ? Object.keys(raw.mcpServers as Record<string, unknown>) : undefined,
      endpoint: raw.apiEndpoint as string | undefined,
      raw,
    };
  }

  async writeConfig(_config: AgentConfig): Promise<void> {
    console.warn('[claude] writeConfig not yet implemented');
  }

  async readRecentSessions(_limit = 20): Promise<AgentSession[]> {
    // Phase 2: 读取 ~/.claude/transcripts/ (JSONL)
    return [];
  }

  async ping(): Promise<boolean> {
    try {
      await access(this.getConfigPath());
      return true;
    } catch {
      return false;
    }
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
