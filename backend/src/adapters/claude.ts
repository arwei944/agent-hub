import { readFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { AgentId, AgentConfig, AgentSession, AgentState } from '../models/agent';
import { AgentAdapter } from './interface';
import { serializeJson } from '../utils/json-writer';
import { atomicWrite } from '../utils/atomic-write';
import { listJsonlFiles, readJsonl } from '../utils/jsonl-reader';

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

  async writeConfig(config: AgentConfig): Promise<void> {
    const raw = { ...config.raw };
    if (config.model !== undefined) raw.model = config.model;
    if (config.endpoint !== undefined) raw.apiEndpoint = config.endpoint;
    if (config.mcpTools !== undefined) {
      const existing = raw.mcpServers as Record<string, unknown> | undefined;
      if (existing) {
        // 保留现有 mcpServers 结构，只更新工具列表
        raw.mcpServers = existing;
      }
    }
    await atomicWrite(this.getConfigPath(), serializeJson(raw));
  }

  async readRecentSessions(limit = 20): Promise<AgentSession[]> {
    const transcriptsDir = join(homedir(), '.claude', 'transcripts');
    const files = await listJsonlFiles(transcriptsDir, limit);
    const sessions: AgentSession[] = [];

    for (const file of files) {
      try {
        const records = await readJsonl(file);
        if (records.length === 0) continue;

        const first = records[0];
        const last = records[records.length - 1];
        const fileName = file.split(/[/\\]/).pop() || '';

        sessions.push({
          id: fileName.replace(/\.jsonl$/i, ''),
          title: (first.title as string) || (first.conversation_id as string) || fileName,
          createdAt: (first.created_at as string) || (first.timestamp as string) || '',
          updatedAt: (last.created_at as string) || (last.timestamp as string) || '',
          messageCount: records.length,
          stage: undefined,
        });
      } catch {
        // 跳过无法解析的文件
      }
    }

    return sessions;
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
